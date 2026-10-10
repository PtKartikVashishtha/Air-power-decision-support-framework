import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  Aircraft,
  Aircrew,
  Airbase,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
  MUNITION_CATALOG,
} from '../../packages/shared/src';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';

function createPrng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const verifier = new IndependentPlanVerifier();

function runEnhancedAlns(seed: number, maxIterations = 80, timeLimitMs = 150) {
  const sc = generateSyntheticScenario(seed);
  const rng = createPrng(seed);
  const startTime = Date.now();

  // 1. Initial constructive heuristic
  const aircraftList = sc.aircraft;
  const pilotsList = sc.pilots;
  const bases = sc.bases;
  const munitionList = sc.munitionStocks;
  const targetsList = sc.targetRequests;
  const threatsList = sc.threats;

  const wPrio = 1.0;
  const wRisk = 0.5;
  const wFuel = 0.0001;

  const availableAircraft = aircraftList.filter((a) => a.status === 'FMC');
  const availablePilots = pilotsList.filter((p) => p.status === 'READY' && p.fatigueScore <= 65);
  const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

  const aircraftSortieTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
  const pilotSortieTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
  const stockInventory = new Map((munitionList || []).map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
  const baseHourlySorties = new Map<string, number>();

  const sortedTargets = [...targetsList].sort((a, b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);
  const initialSorties: Sortie[] = [];
  let sortieSeq = 1;
  let packageSeq = 1;

  for (const target of sortedTargets) {
    const pkgId = `PKG-${packageSeq.toString().padStart(3, '0')}`;
    const neededRoles: Array<{ role: Sortie['role']; munType?: string }> = [];

    for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
      neededRoles.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
    }
    for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
      neededRoles.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
    }
    for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
      neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
    }

    const packageSorties: Sortie[] = [];
    let packageFeasible = true;

    for (const slot of neededRoles) {
      let bestCandidate: any = null;

      for (const base of openBases) {
        const distKm = haversineDistanceKm(base.location, target.location);
        const roundtripDistKm = distKm * 2;
        const candidatePlanes = availableAircraft.filter((a) => a.baseId === base.id && a.roles.includes(slot.role));

        for (const ac of candidatePlanes) {
          if (roundtripDistKm > ac.combatRadiusKm * 1.8) continue;
          const flightTimeOneWayMin = Math.round((distKm / ac.cruiseSpeedKmh) * 60);
          const tot = Math.round((target.totStartMinutes + target.totEndMinutes) / 2);
          const depTime = Math.max(0, tot - flightTimeOneWayMin);
          const recTime = tot + flightTimeOneWayMin;

          const acHistory = aircraftSortieTimeline.get(ac.tailNumber) || [];
          let acAvailable = true;
          for (const prev of acHistory) {
            const turnaround = ac.turnaroundTimeMinutes || 35;
            if (depTime < prev.rec + turnaround && recTime > prev.dep - turnaround) {
              acAvailable = false;
              break;
            }
          }
          if (!acAvailable) continue;

          const hourSlot = Math.floor(depTime / 60);
          const slotKey = `${base.id}_${hourSlot}`;
          const currentSlotSorties = baseHourlySorties.get(slotKey) || 0;
          if (currentSlotSorties >= base.maxSortiePerHour) continue;

          const candidatePilots = availablePilots.filter((p) => p.baseId === base.id && p.typeRating === ac.model);

          for (const pilot of candidatePilots) {
            const pilotHistory = pilotSortieTimeline.get(pilot.id) || [];
            let pilotAvailable = true;
            let accumulatedFlightMins = 0;

            for (const prev of pilotHistory) {
              accumulatedFlightMins += prev.rec - prev.dep;
              if (depTime < prev.rec + 45 && recTime > prev.dep - 45) {
                pilotAvailable = false;
                break;
              }
            }

            const flightDurationMins = recTime - depTime;
            if ((accumulatedFlightMins + flightDurationMins) / 60 + pilot.dutyHoursLast24h > 12) {
              pilotAvailable = false;
            }
            if (!pilotAvailable) continue;

            const loadout: Array<{ munitionId: string; count: number }> = [];
            const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
            const munItem = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(ac.model));
            if (munItem) {
              const stockKey = `${base.id}_${munItem.id}`;
              const inStock = stockInventory.get(stockKey) || 0;
              if (inStock >= 2) {
                loadout.push({ munitionId: munItem.id, count: 2 });
              }
            }

            const spec = Object.values(AIRCRAFT_MODEL_SPECS).find((s) => s.model === ac.model);
            const burnRate = spec ? spec.burnRateKgPerKm : 2.5;
            const fuelBurnKg = Math.round(roundtripDistKm * burnRate);
            const waypoints = [base.location, target.location, base.location];
            const flightRisk = calculateRouteRisk(waypoints, threatsList);
            const candScore = flightRisk * wRisk + fuelBurnKg * wFuel;

            if (!bestCandidate || candScore < bestCandidate.score) {
              bestCandidate = {
                aircraft: ac,
                pilot,
                base,
                score: candScore,
                fuelBurnKg,
                flightRisk,
                depTime,
                totTime: tot,
                recTime,
                loadout,
              };
            }
            break;
          }
        }
      }

      if (bestCandidate) {
        const sortieId = `SRT-${sortieSeq.toString().padStart(4, '0')}`;
        const callsign = `VAYU-${bestCandidate.pilot.callsign.split('-')[0]}-${sortieSeq}`;

        packageSorties.push({
          sortieId,
          callsign,
          packageId: pkgId,
          targetRequestId: target.id,
          role: slot.role,
          aircraftTail: bestCandidate.aircraft.tailNumber,
          pilotId: bestCandidate.pilot.id,
          originBaseId: bestCandidate.base.id,
          recoveryBaseId: bestCandidate.base.id,
          munitionLoadout: bestCandidate.loadout,
          depTimeMinutes: bestCandidate.depTime,
          totMinutes: bestCandidate.totTime,
          recoveryTimeMinutes: bestCandidate.recTime,
          fuelPlannedKg: bestCandidate.fuelBurnKg,
          routeWaypoints: [bestCandidate.base.location, target.location, bestCandidate.base.location],
          expectedRiskScore: bestCandidate.flightRisk,
          status: 'SCHEDULED',
          isFrozen: false,
          justificationNotes: `Initial allocation`,
        });

        const acHistory = aircraftSortieTimeline.get(bestCandidate.aircraft.tailNumber) || [];
        acHistory.push({ dep: bestCandidate.depTime, rec: bestCandidate.recTime });
        aircraftSortieTimeline.set(bestCandidate.aircraft.tailNumber, acHistory);

        const pilotHistory = pilotSortieTimeline.get(bestCandidate.pilot.id) || [];
        pilotHistory.push({
          dep: bestCandidate.depTime,
          rec: bestCandidate.recTime,
          dutyHours: (bestCandidate.recTime - bestCandidate.depTime) / 60,
        });
        pilotSortieTimeline.set(bestCandidate.pilot.id, pilotHistory);

        const hSlot = Math.floor(bestCandidate.depTime / 60);
        const sKey = `${bestCandidate.base.id}_${hSlot}`;
        baseHourlySorties.set(sKey, (baseHourlySorties.get(sKey) || 0) + 1);

        for (const m of bestCandidate.loadout) {
          const stockKey = `${bestCandidate.base.id}_${m.munitionId}`;
          const inStock = stockInventory.get(stockKey) || 0;
          stockInventory.set(stockKey, Math.max(0, inStock - m.count));
        }

        sortieSeq++;
      } else {
        packageFeasible = false;
        break;
      }
    }

    if (packageFeasible && packageSorties.length === neededRoles.length) {
      initialSorties.push(...packageSorties);
      packageSeq++;
    } else {
      // Rollback
      for (const s of packageSorties) {
        const acHistory = aircraftSortieTimeline.get(s.aircraftTail) || [];
        acHistory.pop();
        const pHistory = pilotSortieTimeline.get(s.pilotId) || [];
        pHistory.pop();
        const hSlot = Math.floor(s.depTimeMinutes / 60);
        const sKey = `${s.originBaseId}_${hSlot}`;
        baseHourlySorties.set(sKey, Math.max(0, (baseHourlySorties.get(sKey) || 0) - 1));
      }
    }
  }

  const calcObjective = (sorties: Sortie[]): number => {
    let prioSum = 0;
    let riskSum = 0;
    let fuelSum = 0;
    const coveredTgtIds = new Set(sorties.map((s) => s.targetRequestId));
    for (const t of targetsList) {
      if (coveredTgtIds.has(t.id)) prioSum += t.priority;
    }
    for (const s of sorties) {
      riskSum += s.expectedRiskScore;
      fuelSum += s.fuelPlannedKg;
    }
    return prioSum * wPrio - (riskSum / Math.max(1, sorties.length)) * 10 * wRisk - (fuelSum / 1000) * wFuel;
  };

  const t0Objective = calcObjective(initialSorties);
  let bestSorties = [...initialSorties];
  let currentSorties = [...initialSorties];
  let bestObjective = t0Objective;
  let currentObjective = t0Objective;

  // Destroy operators
  const destroyOps = [
    {
      name: 'randomPackageDestroy',
      weight: 1.0,
      calls: 0,
      wins: 0,
      fn: (sorties: Sortie[]) => {
        const pkgs = Array.from(new Set(sorties.map((s) => s.packageId)));
        if (pkgs.length <= 1) return { kept: sorties, removed: [] };
        const dropCount = Math.max(1, Math.floor(pkgs.length * 0.15));
        const dropSet = new Set<string>();
        for (let i = 0; i < dropCount; i++) {
          dropSet.add(pkgs[Math.floor(rng() * pkgs.length)]!);
        }
        return {
          kept: sorties.filter((s) => !dropSet.has(s.packageId)),
          removed: sorties.filter((s) => dropSet.has(s.packageId)),
        };
      },
    },
    {
      name: 'worstRiskPackageDestroy',
      weight: 1.0,
      calls: 0,
      wins: 0,
      fn: (sorties: Sortie[]) => {
        const pkgRisk = new Map<string, number>();
        for (const s of sorties) {
          pkgRisk.set(s.packageId, (pkgRisk.get(s.packageId) || 0) + s.expectedRiskScore);
        }
        const sorted = Array.from(pkgRisk.entries()).sort((a, b) => b[1] - a[1]);
        if (sorted.length <= 1) return { kept: sorties, removed: [] };
        const dropSet = new Set(sorted.slice(0, 2).map((x) => x[0]));
        return {
          kept: sorties.filter((s) => !dropSet.has(s.packageId)),
          removed: sorties.filter((s) => dropSet.has(s.packageId)),
        };
      },
    },
    {
      name: 'lowestPriorityPackageDestroy',
      weight: 1.0,
      calls: 0,
      wins: 0,
      fn: (sorties: Sortie[]) => {
        const targetPriorityMap = new Map(targetsList.map((t) => [t.id, t.priority]));
        const pkgPrio = new Map<string, number>();
        for (const s of sorties) {
          pkgPrio.set(s.packageId, targetPriorityMap.get(s.targetRequestId) || 0);
        }
        const sorted = Array.from(pkgPrio.entries()).sort((a, b) => a[1] - b[1]);
        if (sorted.length <= 1) return { kept: sorties, removed: [] };
        const dropSet = new Set(sorted.slice(0, 2).map((x) => x[0]));
        return {
          kept: sorties.filter((s) => !dropSet.has(s.packageId)),
          removed: sorties.filter((s) => dropSet.has(s.packageId)),
        };
      },
    },
  ];

  let rSeq = 1;

  // Repair operators
  const repairOps = [
    {
      name: 'twoOptAirframeRiskSwap',
      weight: 1.0,
      calls: 0,
      wins: 0,
      fn: (kept: Sortie[]) => {
        const candidate = [...kept];
        if (candidate.length < 2) return candidate;
        // Pick two random sorties with the same role and origin base
        const idx1 = Math.floor(rng() * candidate.length);
        const s1 = candidate[idx1]!;
        const matches = candidate
          .map((s, idx) => ({ s, idx }))
          .filter((x) => x.idx !== idx1 && x.s.role === s1.role && x.s.originBaseId === s1.originBaseId && x.s.aircraftTail !== s1.aircraftTail);

        if (matches.length > 0) {
          const match = matches[Math.floor(rng() * matches.length)]!;
          const s2 = match.s;
          // Swap tails
          const swapped = candidate.map((s, idx) => {
            if (idx === idx1) return { ...s, aircraftTail: s2.aircraftTail };
            if (idx === match.idx) return { ...s, aircraftTail: s1.aircraftTail };
            return s;
          });
          return swapped;
        }
        return candidate;
      },
    },
    {
      name: 'targetPriorityUpgrade',
      weight: 1.0,
      calls: 0,
      wins: 0,
      fn: (kept: Sortie[]) => {
        const covered = new Set(kept.map((s) => s.targetRequestId));
        const uncovered = targetsList.filter((t) => !covered.has(t.id)).sort((a, b) => b.priority - a.priority);
        if (uncovered.length === 0 || kept.length === 0) return kept;

        const highPrioTarget = uncovered[0]!;
        // Find a covered target with lower priority that has matching required package
        const pkgs = Array.from(new Set(kept.map((s) => s.packageId)));
        for (const pkgId of pkgs) {
          const pkgSorties = kept.filter((s) => s.packageId === pkgId);
          const currentTgtId = pkgSorties[0]?.targetRequestId;
          const currentTgt = targetsList.find((t) => t.id === currentTgtId);
          if (currentTgt && currentTgt.priority < highPrioTarget.priority) {
            // Check if role counts match
            const strikeCount = pkgSorties.filter((s) => s.role === 'OMNIROLE_STRIKE').length;
            const seadCount = pkgSorties.filter((s) => s.role === 'SEAD_DEAD').length;
            const escortCount = pkgSorties.filter((s) => s.role === 'AIR_SUPERIORITY').length;

            if (
              strikeCount >= highPrioTarget.requiredPackage.strikeSorties &&
              seadCount >= highPrioTarget.requiredPackage.seadSorties &&
              escortCount >= highPrioTarget.requiredPackage.escortSorties
            ) {
              // Reassign this package to the high-priority target
              return kept.map((s) => {
                if (s.packageId === pkgId) {
                  const base = bases.find((b) => b.id === s.originBaseId);
                  const waypoints = base ? [base.location, highPrioTarget.location, base.location] : s.routeWaypoints;
                  const newRisk = calculateRouteRisk(waypoints, threatsList);
                  return {
                    ...s,
                    targetRequestId: highPrioTarget.id,
                    routeWaypoints: waypoints,
                    expectedRiskScore: newRisk,
                  };
                }
                return s;
              });
            }
          }
        }
        return kept;
      },
    },
  ];

  let temperature = 30.0;
  const coolingRate = 0.985;
  let iteration = 0;

  while (iteration < maxIterations && Date.now() - startTime < timeLimitMs) {
    iteration++;

    // Select operator based on weight
    const totalDestroyW = destroyOps.reduce((a, b) => a + b.weight, 0);
    let rD = rng() * totalDestroyW;
    let dOp = destroyOps[0]!;
    for (const op of destroyOps) {
      if (rD <= op.weight) {
        dOp = op;
        break;
      }
      rD -= op.weight;
    }

    const totalRepairW = repairOps.reduce((a, b) => a + b.weight, 0);
    let rR = rng() * totalRepairW;
    let rOp = repairOps[0]!;
    for (const op of repairOps) {
      if (rR <= op.weight) {
        rOp = op;
        break;
      }
      rR -= op.weight;
    }

    dOp.calls++;
    rOp.calls++;

    const destroyed = dOp.fn(currentSorties);
    const candidateSorties = rOp.fn(destroyed.kept);

    const audit = verifier.verifyPlan(
      candidateSorties,
      aircraftList,
      pilotsList,
      bases,
      munitionList,
      targetsList,
      threatsList
    );

    if (audit.totalViolations > 0) {
      dOp.weight = Math.max(0.1, dOp.weight * 0.98);
      rOp.weight = Math.max(0.1, rOp.weight * 0.98);
      continue;
    }

    const candObj = calcObjective(candidateSorties);
    const delta = candObj - currentObjective;

    let accept = false;
    if (delta > 0) {
      accept = true;
    } else {
      const prob = Math.exp(delta / Math.max(0.01, temperature));
      if (rng() < prob) accept = true;
    }

    if (accept) {
      currentSorties = candidateSorties;
      currentObjective = candObj;
      if (candObj > bestObjective) {
        bestSorties = candidateSorties;
        bestObjective = candObj;
        dOp.wins++;
        rOp.wins++;
        dOp.weight = Math.min(5.0, dOp.weight + 0.3);
        rOp.weight = Math.min(5.0, rOp.weight + 0.3);
      } else {
        dOp.weight = Math.min(5.0, dOp.weight + 0.05);
        rOp.weight = Math.min(5.0, rOp.weight + 0.05);
      }
    } else {
      dOp.weight = Math.max(0.1, dOp.weight * 0.98);
      rOp.weight = Math.max(0.1, rOp.weight * 0.98);
    }

    temperature *= coolingRate;
  }

  const finalAudit = verifier.verifyPlan(
    bestSorties,
    aircraftList,
    pilotsList,
    bases,
    munitionList,
    targetsList,
    threatsList
  );

  return {
    seed,
    t0Objective: Math.round(t0Objective * 10) / 10,
    bestObjective: Math.round(bestObjective * 10) / 10,
    improvementPct: Math.round(((bestObjective - t0Objective) / t0Objective) * 1000) / 10,
    iterationsRun: iteration,
    durationMs: Date.now() - startTime,
    destroyStats: destroyOps.map((d) => ({ name: d.name, calls: d.calls, wins: d.wins })),
    repairStats: repairOps.map((r) => ({ name: r.name, calls: r.calls, wins: r.wins })),
    violations: finalAudit.totalViolations,
    sortiesCount: bestSorties.length,
  };
}

console.log('Testing Enhanced ALNS across 5 seeds:');
for (const s of [42, 101, 777, 1337, 9999]) {
  const r = runEnhancedAlns(s, 100, 200);
  console.log(`Seed ${s}: t0=${r.t0Objective}, best=${r.bestObjective}, gain=+${r.improvementPct}%, violations=${r.violations}, iterations=${r.iterationsRun}`);
}
