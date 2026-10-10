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

function createPrng(seed: number = 42) {
  let s = (seed >>> 0) || 123456789;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const verifier = new IndependentPlanVerifier();

export function runAuditedAlns(seed: number, maxIterations = 120, timeLimitMs = 250) {
  const sc = generateSyntheticScenario(seed);
  const rng = createPrng(seed);
  const startTime = Date.now();

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

  // Helper: helper function to check feasibility of a single sortie replacement
  const isValidSortie = (
    candidateSortie: Sortie,
    allSorties: Sortie[]
  ): boolean => {
    const base = bases.find((b) => b.id === candidateSortie.originBaseId);
    if (!base || base.currentWeatherStatus === 'CLOSED') return false;

    const plane = aircraftList.find((a) => a.tailNumber === candidateSortie.aircraftTail);
    if (!plane || plane.status !== 'FMC') return false;

    const pilot = pilotsList.find((p) => p.id === candidateSortie.pilotId);
    if (!pilot || pilot.status !== 'READY') return false;

    // Check aircraft turnaround overlap
    const otherSortiesAc = allSorties.filter(
      (s) => s.sortieId !== candidateSortie.sortieId && s.aircraftTail === candidateSortie.aircraftTail
    );
    for (const other of otherSortiesAc) {
      const turnaround = plane.turnaroundTimeMinutes || 35;
      if (
        candidateSortie.depTimeMinutes < other.recoveryTimeMinutes + turnaround &&
        candidateSortie.recoveryTimeMinutes > other.depTimeMinutes - turnaround
      ) {
        return false;
      }
    }

    // Check pilot rest
    const otherSortiesPilot = allSorties.filter(
      (s) => s.sortieId !== candidateSortie.sortieId && s.pilotId === candidateSortie.pilotId
    );
    let totalDutyMins = (candidateSortie.recoveryTimeMinutes - candidateSortie.depTimeMinutes);
    for (const other of otherSortiesPilot) {
      totalDutyMins += (other.recoveryTimeMinutes - other.depTimeMinutes);
      if (
        candidateSortie.depTimeMinutes < other.recoveryTimeMinutes + 45 &&
        candidateSortie.recoveryTimeMinutes > other.depTimeMinutes - 45
      ) {
        return false;
      }
    }
    if (totalDutyMins / 60 + pilot.dutyHoursLast24h > 12) return false;

    // Check runway hourly capacity
    const hourSlot = Math.floor(candidateSortie.depTimeMinutes / 60);
    const hourlyCount = allSorties.filter(
      (s) => s.originBaseId === candidateSortie.originBaseId && Math.floor(s.depTimeMinutes / 60) === hourSlot
    ).length;
    if (hourlyCount > base.maxSortiePerHour) return false;

    return true;
  };

  // Neighborhood Operators:
  // 1. Airframe Fuel/Burn Optimization (Replace Su-30 with lower burn aircraft on short range missions)
  const airframeBurnOptimization = (sorties: Sortie[]): Sortie[] => {
    if (sorties.length === 0) return sorties;
    const sIdx = Math.floor(rng() * sorties.length);
    const s = sorties[sIdx]!;
    const curPlane = aircraftList.find((a) => a.tailNumber === s.aircraftTail);
    if (!curPlane) return sorties;

    const candidatePlanes = availableAircraft.filter(
      (a) =>
        a.baseId === s.originBaseId &&
        a.roles.includes(s.role) &&
        a.tailNumber !== s.aircraftTail &&
        (AIRCRAFT_MODEL_SPECS[a.model]?.burnRateKgPerKm || 2.5) < (AIRCRAFT_MODEL_SPECS[curPlane.model]?.burnRateKgPerKm || 2.5)
    );

    for (const altPlane of candidatePlanes) {
      // Find compatible pilot
      const pilot = pilotsList.find(
        (p) => p.baseId === s.originBaseId && p.status === 'READY' && p.typeRating === altPlane.model
      );
      if (!pilot) continue;

      const altSpec = AIRCRAFT_MODEL_SPECS[altPlane.model] || { burnRateKgPerKm: 2.2 };
      const base = bases.find((b) => b.id === s.originBaseId)!;
      const target = targetsList.find((t) => t.id === s.targetRequestId)!;
      const distKm = haversineDistanceKm(base.location, target.location);
      if (distKm * 2 > altPlane.combatRadiusKm * 1.8) continue;

      const newFuel = Math.round(distKm * 2 * altSpec.burnRateKgPerKm);
      const newSortie: Sortie = {
        ...s,
        aircraftTail: altPlane.tailNumber,
        pilotId: pilot.id,
        fuelPlannedKg: newFuel,
      };

      const candPlan = sorties.map((st, i) => (i === sIdx ? newSortie : st));
      if (isValidSortie(newSortie, candPlan)) {
        return candPlan;
      }
    }
    return sorties;
  };

  // 2. Base Closer Staging (Reroute package to closer airbase if available)
  const baseRerouteOptimization = (sorties: Sortie[]): Sortie[] => {
    const pkgs = Array.from(new Set(sorties.map((s) => s.packageId)));
    if (pkgs.length === 0) return sorties;
    const pkgId = pkgs[Math.floor(rng() * pkgs.length)]!;
    const pkgSorties = sorties.filter((s) => s.packageId === pkgId);
    const targetId = pkgSorties[0]?.targetRequestId;
    const target = targetsList.find((t) => t.id === targetId);
    if (!target) return sorties;

    const currentBaseId = pkgSorties[0]?.originBaseId;
    const currentBase = bases.find((b) => b.id === currentBaseId);
    if (!currentBase) return sorties;

    const currentDist = haversineDistanceKm(currentBase.location, target.location);
    // Find closer open bases
    const closerBases = openBases.filter(
      (b) => b.id !== currentBaseId && haversineDistanceKm(b.location, target.location) < currentDist
    );

    for (const altBase of closerBases) {
      const altDist = haversineDistanceKm(altBase.location, target.location);
      const newPkgSorties: Sortie[] = [];
      let feasible = true;

      for (const s of pkgSorties) {
        const plane = availableAircraft.find(
          (a) => a.baseId === altBase.id && a.roles.includes(s.role) && a.combatRadiusKm * 1.8 >= altDist * 2
        );
        if (!plane) {
          feasible = false;
          break;
        }
        const pilot = availablePilots.find((p) => p.baseId === altBase.id && p.typeRating === plane.model);
        if (!pilot) {
          feasible = false;
          break;
        }

        const flightMin = Math.round((altDist / plane.cruiseSpeedKmh) * 60);
        const dep = Math.max(0, s.totMinutes - flightMin);
        const rec = s.totMinutes + flightMin;
        const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
        const newFuel = Math.round(altDist * 2 * burnRate);
        const waypoints = [altBase.location, target.location, altBase.location];
        const newRisk = calculateRouteRisk(waypoints, threatsList);

        const newS: Sortie = {
          ...s,
          originBaseId: altBase.id,
          recoveryBaseId: altBase.id,
          aircraftTail: plane.tailNumber,
          pilotId: pilot.id,
          depTimeMinutes: dep,
          recoveryTimeMinutes: rec,
          fuelPlannedKg: newFuel,
          expectedRiskScore: newRisk,
          routeWaypoints: waypoints,
        };
        newPkgSorties.push(newS);
      }

      if (feasible && newPkgSorties.length === pkgSorties.length) {
        const replaced = sorties.filter((s) => s.packageId !== pkgId).concat(newPkgSorties);
        const audit = verifier.verifyPlan(
          replaced,
          aircraftList,
          pilotsList,
          bases,
          munitionList,
          targetsList,
          threatsList
        );
        if (audit.totalViolations === 0) {
          return replaced;
        }
      }
    }
    return sorties;
  };

  // 3. Multi-Wave Uncovered Target Scheduling (Insert new package for uncovered targets)
  const uncoveredTargetInsertion = (sorties: Sortie[]): Sortie[] => {
    const covered = new Set(sorties.map((s) => s.targetRequestId));
    const uncovered = targetsList.filter((t) => !covered.has(t.id)).sort((a, b) => b.priority - a.priority);
    if (uncovered.length === 0) return sorties;

    for (const target of uncovered) {
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

      const newPkgSorties: Sortie[] = [];
      let feasible = true;
      const trialSorties = [...sorties];

      for (const slot of neededRoles) {
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

            const candidatePilots = availablePilots.filter((p) => p.baseId === base.id && p.typeRating === ac.model);
            for (const pilot of candidatePilots) {
              const spec = Object.values(AIRCRAFT_MODEL_SPECS).find((s) => s.model === ac.model);
              const burnRate = spec ? spec.burnRateKgPerKm : 2.5;
              const fuelBurnKg = Math.round(roundtripDistKm * burnRate);
              const waypoints = [base.location, target.location, base.location];
              const flightRisk = calculateRouteRisk(waypoints, threatsList);

              const candSortie: Sortie = {
                sortieId: `SRT-EXT-${sortieSeq++}`,
                callsign: `VAYU-${pilot.callsign.split('-')[0]}-${sortieSeq}`,
                packageId: `PKG-EXT-${target.id}`,
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
                fuelPlannedKg: fuelBurnKg,
                routeWaypoints: waypoints,
                expectedRiskScore: flightRisk,
                status: 'SCHEDULED',
                isFrozen: false,
                justificationNotes: `ALNS uncovered target insertion`,
              };

              if (isValidSortie(candSortie, trialSorties.concat(candSortie))) {
                trialSorties.push(candSortie);
                newPkgSorties.push(candSortie);
                assigned = true;
                break;
              }
            }
            if (assigned) break;
          }
          if (assigned) break;
        }
        if (!assigned) {
          feasible = false;
          break;
        }
      }

      if (feasible && newPkgSorties.length === neededRoles.length) {
        const fullPlan = sorties.concat(newPkgSorties);
        const audit = verifier.verifyPlan(
          fullPlan,
          aircraftList,
          pilotsList,
          bases,
          munitionList,
          targetsList,
          threatsList
        );
        if (audit.totalViolations === 0) {
          return fullPlan;
        }
      }
    }
    return sorties;
  };

  // ALNS Search loop
  let temperature = 40.0;
  const coolingRate = 0.985;
  let iteration = 0;

  const operators = [
    { name: 'airframeBurnOpt', fn: airframeBurnOptimization, calls: 0, wins: 0, weight: 1.0 },
    { name: 'baseRerouteOpt', fn: baseRerouteOptimization, calls: 0, wins: 0, weight: 1.0 },
    { name: 'uncoveredTargetInsert', fn: uncoveredTargetInsertion, calls: 0, wins: 0, weight: 1.0 },
  ];

  while (iteration < maxIterations && Date.now() - startTime < timeLimitMs) {
    iteration++;

    // Pick operator by roulette wheel
    const totalW = operators.reduce((a, b) => a + b.weight, 0);
    let r = rng() * totalW;
    let chosen = operators[0]!;
    for (const op of operators) {
      if (r <= op.weight) {
        chosen = op;
        break;
      }
      r -= op.weight;
    }

    chosen.calls++;
    const candidateSorties = chosen.fn(currentSorties);
    if (candidateSorties === currentSorties) continue;

    const candAudit = verifier.verifyPlan(
      candidateSorties,
      aircraftList,
      pilotsList,
      bases,
      munitionList,
      targetsList,
      threatsList
    );

    if (candAudit.totalViolations > 0) {
      chosen.weight = Math.max(0.1, chosen.weight * 0.95);
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
        chosen.wins++;
        chosen.weight = Math.min(5.0, chosen.weight + 0.4);
      } else {
        chosen.weight = Math.min(5.0, chosen.weight + 0.05);
      }
    } else {
      chosen.weight = Math.max(0.1, chosen.weight * 0.98);
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
    operators: operators.map((o) => ({ name: o.name, calls: o.calls, wins: o.wins, weight: Math.round(o.weight * 10) / 10 })),
    violations: finalAudit.totalViolations,
    t0Sorties: initialSorties.length,
    finalSorties: bestSorties.length,
  };
}

console.log('Testing Enhanced ALNS across 5 seeds:');
for (const s of [42, 101, 777, 1337, 9999]) {
  const r = runAuditedAlns(s, 100, 250);
  console.log(`Seed ${s}: t0=${r.t0Objective} -> best=${r.bestObjective} (+${r.improvementPct}%), sorties=${r.t0Sorties}->${r.finalSorties}, violations=${r.violations}`);
  console.log('  Operators:', JSON.stringify(r.operators));
}
