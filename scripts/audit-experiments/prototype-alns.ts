import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  PlanCOA,
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

class EnhancedAlnsOptimizer {
  private verifier = new IndependentPlanVerifier();

  public solve(
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[],
    options: { seed?: number; maxIterations?: number; timeLimitMs?: number } = {}
  ) {
    const seed = options.seed ?? 42;
    const rng = createPrng(seed);
    const maxIterations = options.maxIterations ?? 100;
    const timeLimitMs = options.timeLimitMs ?? 200;
    const startTime = Date.now();

    const wPrio = 1.0;
    const wRisk = 0.5;
    const wFuel = 0.0001;

    // Fast constructive heuristic
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

          const candidatePlanes = availableAircraft.filter(
            (a) => a.baseId === base.id && a.roles.includes(slot.role)
          );

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

            const candidatePilots = availablePilots.filter(
              (p) => p.baseId === base.id && p.typeRating === ac.model
            );

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
          });

          const currentAcTimeline = aircraftSortieTimeline.get(bestCandidate.aircraft.tailNumber) || [];
          currentAcTimeline.push({ dep: bestCandidate.depTime, rec: bestCandidate.recTime });
          aircraftSortieTimeline.set(bestCandidate.aircraft.tailNumber, currentAcTimeline);

          const currentPilotTimeline = pilotSortieTimeline.get(bestCandidate.pilot.id) || [];
          currentPilotTimeline.push({
            dep: bestCandidate.depTime,
            rec: bestCandidate.recTime,
            dutyHours: (bestCandidate.recTime - bestCandidate.depTime) / 60,
          });
          pilotSortieTimeline.set(bestCandidate.pilot.id, currentPilotTimeline);

          const hSlot = Math.floor(bestCandidate.depTime / 60);
          const sKey = `${bestCandidate.base.id}_${hSlot}`;
          baseHourlySorties.set(sKey, (baseHourlySorties.get(sKey) || 0) + 1);

          for (const m of bestCandidate.loadout) {
            const stockKey = `${bestCandidate.base.id}_${m.munitionId}`;
            const cur = stockInventory.get(stockKey) || 0;
            stockInventory.set(stockKey, cur - m.count);
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
          const acTimeline = aircraftSortieTimeline.get(s.aircraftTail) || [];
          aircraftSortieTimeline.set(
            s.aircraftTail,
            acTimeline.filter((t) => t.dep !== s.depTimeMinutes)
          );
          const pTimeline = pilotSortieTimeline.get(s.pilotId) || [];
          pilotSortieTimeline.set(
            s.pilotId,
            pTimeline.filter((t) => t.dep !== s.depTimeMinutes)
          );
          const hSlot = Math.floor(s.depTimeMinutes / 60);
          const sKey = `${s.originBaseId}_${hSlot}`;
          baseHourlySorties.set(sKey, Math.max(0, (baseHourlySorties.get(sKey) || 0) - 1));
          for (const m of s.munitionLoadout) {
            const stockKey = `${s.originBaseId}_${m.munitionId}`;
            stockInventory.set(stockKey, (stockInventory.get(stockKey) || 0) + m.count);
          }
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

    // Operators
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
    ];

    let rSeq = 1;

    const repairOps = [
      {
        name: 'multiWaveRegretRepair',
        weight: 1.0,
        calls: 0,
        wins: 0,
        fn: (kept: Sortie[]) => {
          const coveredTargets = new Set(kept.map((s) => s.targetRequestId));
          const uncovered = targetsList.filter((t) => !coveredTargets.has(t.id)).sort((a, b) => b.priority - a.priority);
          const repaired = [...kept];

          // Rebuild timelines from kept
          const acTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
          const pilotTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
          for (const s of kept) {
            const at = acTimeline.get(s.aircraftTail) || [];
            at.push({ dep: s.depTimeMinutes, rec: s.recoveryTimeMinutes });
            acTimeline.set(s.aircraftTail, at);

            const pt = pilotTimeline.get(s.pilotId) || [];
            pt.push({ dep: s.depTimeMinutes, rec: s.recoveryTimeMinutes, dutyHours: (s.recoveryTimeMinutes - s.depTimeMinutes) / 60 });
            pilotTimeline.set(s.pilotId, pt);
          }

          for (const target of uncovered) {
            const rolesNeeded: Array<{ role: Sortie['role']; munType?: string }> = [];
            for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
              rolesNeeded.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
            }
            for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
              rolesNeeded.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
            }
            for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
              rolesNeeded.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
            }

            const candidateSorties: Sortie[] = [];
            let pkgOk = true;

            for (const slot of rolesNeeded) {
              let assigned = false;
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

                  const prevAcSorties = acTimeline.get(ac.tailNumber) || [];
                  let acFree = true;
                  for (const p of prevAcSorties) {
                    const turnaround = ac.turnaroundTimeMinutes || 35;
                    if (depTime < p.rec + turnaround && recTime > p.dep - turnaround) {
                      acFree = false;
                      break;
                    }
                  }
                  if (!acFree) continue;

                  const candidatePilots = availablePilots.filter((p) => p.baseId === base.id && p.typeRating === ac.model);
                  for (const pilot of candidatePilots) {
                    const prevPilotSorties = pilotTimeline.get(pilot.id) || [];
                    let pFree = true;
                    let flightHours = 0;
                    for (const p of prevPilotSorties) {
                      flightHours += (p.rec - p.dep) / 60;
                      if (depTime < p.rec + 45 && recTime > p.dep - 45) {
                        pFree = false;
                        break;
                      }
                    }
                    if ((recTime - depTime) / 60 + flightHours + pilot.dutyHoursLast24h > 12) pFree = false;
                    if (!pFree) continue;

                    const waypoints = [base.location, target.location, base.location];
                    const flightRisk = calculateRouteRisk(waypoints, threatsList);
                    const fuelBurn = Math.round(roundtripDistKm * 2.8);

                    candidateSorties.push({
                      sortieId: `SRT-RPR-${seed}-${rSeq++}`,
                      callsign: `VAYU-${pilot.callsign.split('-')[0]}-${rSeq}`,
                      packageId: `PKG-RPR-${target.id}`,
                      targetRequestId: target.id,
                      role: slot.role,
                      aircraftTail: ac.tailNumber,
                      pilotId: pilot.id,
                      originBaseId: base.id,
                      recoveryBaseId: base.id,
                      munitionLoadout: [{ munitionId: target.desiredMunitions[0] || 'MUN_SPICE2000', count: 2 }],
                      depTimeMinutes: depTime,
                      totMinutes: tot,
                      recoveryTimeMinutes: recTime,
                      fuelPlannedKg: fuelBurn,
                      routeWaypoints: waypoints,
                      expectedRiskScore: flightRisk,
                      status: 'SCHEDULED',
                      isFrozen: false,
                    });

                    prevAcSorties.push({ dep: depTime, rec: recTime });
                    acTimeline.set(ac.tailNumber, prevAcSorties);
                    prevPilotSorties.push({ dep: depTime, rec: recTime, dutyHours: (recTime - depTime) / 60 });
                    pilotTimeline.set(pilot.id, prevPilotSorties);

                    assigned = true;
                    break;
                  }
                  if (assigned) break;
                }
                if (assigned) break;
              }
              if (!assigned) {
                pkgOk = false;
                break;
              }
            }

            if (pkgOk && candidateSorties.length === rolesNeeded.length) {
              repaired.push(...candidateSorties);
            }
          }
          return repaired;
        },
      },
      {
        name: 'riskReductionSwapRepair',
        weight: 1.0,
        calls: 0,
        wins: 0,
        fn: (kept: Sortie[]) => {
          // Find sortie with highest risk and attempt to switch base or aircraft
          const repaired = [...kept];
          const sorted = [...repaired].sort((a, b) => b.expectedRiskScore - a.expectedRiskScore);
          for (let i = 0; i < Math.min(3, sorted.length); i++) {
            const highRiskSortie = sorted[i]!;
            const target = targetsList.find((t) => t.id === highRiskSortie.targetRequestId);
            if (!target) continue;

            // Check if another base has a closer or lower-risk airframe
            for (const base of openBases) {
              if (base.id === highRiskSortie.originBaseId) continue;
              const distKm = haversineDistanceKm(base.location, target.location);
              const waypoints = [base.location, target.location, base.location];
              const testRisk = calculateRouteRisk(waypoints, threatsList);
              if (testRisk < highRiskSortie.expectedRiskScore) {
                const altPlane = availableAircraft.find(
                  (a) => a.baseId === base.id && a.roles.includes(highRiskSortie.role)
                );
                if (altPlane) {
                  const altPilot = availablePilots.find(
                    (p) => p.baseId === base.id && p.typeRating === altPlane.model
                  );
                  if (altPilot) {
                    highRiskSortie.originBaseId = base.id;
                    highRiskSortie.recoveryBaseId = base.id;
                    highRiskSortie.aircraftTail = altPlane.tailNumber;
                    highRiskSortie.pilotId = altPilot.id;
                    highRiskSortie.expectedRiskScore = testRisk;
                    highRiskSortie.routeWaypoints = waypoints;
                    break;
                  }
                }
              }
            }
          }
          return repaired;
        },
      },
    ];

    // Simulated Annealing
    let temperature = 30.0;
    const coolingRate = 0.985;
    let iteration = 0;

    while (iteration < maxIterations && Date.now() - startTime < timeLimitMs) {
      iteration++;

      const dOp = destroyOps[Math.floor(rng() * destroyOps.length)]!;
      const rOp = repairOps[Math.floor(rng() * repairOps.length)]!;
      dOp.calls++;
      rOp.calls++;

      const destroyed = dOp.fn(currentSorties);
      const candidateSorties = rOp.fn(destroyed.kept);

      const audit = this.verifier.verifyPlan(
        candidateSorties,
        aircraftList,
        pilotsList,
        bases,
        munitionList,
        targetsList,
        threatsList
      );

      if (audit.totalViolations > 0) continue;

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
        }
      }

      temperature *= coolingRate;
    }

    const finalAudit = this.verifier.verifyPlan(
      bestSorties,
      aircraftList,
      pilotsList,
      bases,
      munitionList,
      targetsList,
      threatsList
    );

    return {
      t0Objective,
      bestObjective,
      improvementPct: Math.round(((bestObjective - t0Objective) / t0Objective) * 1000) / 10,
      iterationsRun: iteration,
      durationMs: Date.now() - startTime,
      destroyStats: destroyOps.map((d) => ({ name: d.name, calls: d.calls, wins: d.wins })),
      repairStats: repairOps.map((r) => ({ name: r.name, calls: r.calls, wins: r.wins })),
      violations: finalAudit.totalViolations,
      sortiesCount: bestSorties.length,
    };
  }
}

const sc = generateSyntheticScenario(42);
const sim = new EnhancedAlnsOptimizer();
const res = sim.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, {
  seed: 42,
  maxIterations: 100,
  timeLimitMs: 250,
});

console.log('Prototype ALNS Run Result:');
console.log(res);
