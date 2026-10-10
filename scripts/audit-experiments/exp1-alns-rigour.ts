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
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const verifier = new IndependentPlanVerifier();
const opt = new AlnsTacticalOptimizer();

function createPrng(seed: number = 42) {
  let s = (seed >>> 0) || 123456789;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function runFullAuditedAlns(seed: number, maxIterations = 80, timeLimitMs = 250) {
  const sc = generateSyntheticScenario(seed);
  const rng = createPrng(seed);
  const startTime = Date.now();

  // Run initial solve
  const basePlan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

  const wPrio = 1.0;
  const wRisk = 0.5;
  const wFuel = 0.0001;

  const calcObj = (sorties: Sortie[]): number => {
    let prioSum = 0;
    let riskSum = 0;
    let fuelSum = 0;
    const coveredTgtIds = new Set(sorties.map((s) => s.targetRequestId));
    for (const t of sc.targetRequests) {
      if (coveredTgtIds.has(t.id)) prioSum += t.priority;
    }
    for (const s of sorties) {
      riskSum += s.expectedRiskScore;
      fuelSum += s.fuelPlannedKg;
    }
    return prioSum * wPrio - (riskSum / Math.max(1, sorties.length)) * 10 * wRisk - (fuelSum / 1000) * wFuel;
  };

  const t0Objective = calcObj(basePlan.sorties);
  let bestSorties = [...basePlan.sorties];
  let currentSorties = [...basePlan.sorties];
  let bestObjective = t0Objective;
  let currentObjective = t0Objective;

  // Track operator calls and wins
  const stats = {
    knapsackUpgrade: { calls: 0, wins: 0 },
    totJitter: { calls: 0, wins: 0 },
    baseReassignment: { calls: 0, wins: 0 },
  };

  // Simulated Annealing Loop
  let temperature = 30.0;
  const coolingRate = 0.96;
  let iteration = 0;

  while (iteration < maxIterations && Date.now() - startTime < timeLimitMs) {
    iteration++;

    // Op 1: Knapsack upgrade (destroy low prio target, insert higher prio target)
    if (iteration % 2 === 0) {
      stats.knapsackUpgrade.calls++;
      const coveredIds = new Set(currentSorties.map((s) => s.targetRequestId));
      const coveredTargets = sc.targetRequests.filter((t) => coveredIds.has(t.id)).sort((a,b) => a.priority - b.priority);
      const uncoveredTargets = sc.targetRequests.filter((t) => !coveredIds.has(t.id)).sort((a,b) => b.priority - a.priority);

      if (coveredTargets.length > 0 && uncoveredTargets.length > 0) {
        // Pick one of lowest covered targets
        const lowTarget = coveredTargets[Math.floor(rng() * Math.min(3, coveredTargets.length))]!;
        // Pick one of highest uncovered targets
        const highTarget = uncoveredTargets[Math.floor(rng() * Math.min(4, uncoveredTargets.length))]!;

        if (highTarget.priority > lowTarget.priority) {
          const withoutLow = currentSorties.filter((s) => s.targetRequestId !== lowTarget.id);

          const rolesNeeded: Array<{ role: Sortie['role']; munType?: string }> = [];
          for (let i = 0; i < highTarget.requiredPackage.strikeSorties; i++) rolesNeeded.push({ role: 'OMNIROLE_STRIKE', munType: highTarget.desiredMunitions[0] });
          for (let i = 0; i < highTarget.requiredPackage.seadSorties; i++) rolesNeeded.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
          for (let i = 0; i < highTarget.requiredPackage.escortSorties; i++) rolesNeeded.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });

          const totCandidates = [
            Math.round((highTarget.totStartMinutes + highTarget.totEndMinutes) / 2),
            highTarget.totStartMinutes,
            highTarget.totEndMinutes,
          ];

          for (const tot of totCandidates) {
            const candidatePkg: Sortie[] = [];
            const trialPlan = [...withoutLow];
            let feasible = true;

            for (const slot of rolesNeeded) {
              let assigned = false;
              for (const base of sc.bases) {
                if (base.currentWeatherStatus === 'CLOSED') continue;
                const distKm = haversineDistanceKm(base.location, highTarget.location);
                const candidatePlanes = sc.aircraft.filter((a) => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role));

                for (const plane of candidatePlanes) {
                  if (distKm * 2 > plane.combatRadiusKm * 1.8) continue;
                  const fltMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);
                  const dep = Math.max(0, tot - fltMin);
                  const rec = tot + fltMin;
                  const turnaround = plane.turnaroundTimeMinutes || 35;

                  let planeFree = true;
                  for (const st of trialPlan.filter((s) => s.aircraftTail === plane.tailNumber)) {
                    if (dep < st.recoveryTimeMinutes + turnaround && rec > st.depTimeMinutes - turnaround) {
                      planeFree = false;
                      break;
                    }
                  }
                  if (!planeFree) continue;

                  const hour = Math.floor(dep / 60);
                  const hourlyDep = trialPlan.filter((s) => s.originBaseId === base.id && Math.floor(s.depTimeMinutes / 60) === hour).length;
                  if (hourlyDep >= base.maxSortiePerHour) continue;

                  const pilot = sc.pilots.find((p) => {
                    if (p.baseId !== base.id || p.status !== 'READY' || p.typeRating !== plane.model || p.fatigueScore > 65) return false;
                    for (const st of trialPlan.filter((s) => s.pilotId === p.id)) {
                      if (dep < st.recoveryTimeMinutes + 45 && rec > st.depTimeMinutes - 45) return false;
                    }
                    return true;
                  });
                  if (!pilot) continue;

                  const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
                  const mun = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(plane.model));
                  if (!mun) continue;

                  const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
                  const waypoints = [base.location, highTarget.location, base.location];
                  const newSortie: Sortie = {
                    sortieId: `SRT-ALNS-${iteration}-${candidatePkg.length + 1}`,
                    callsign: `VAYU-${pilot.callsign.split('-')[0]}-${iteration}`,
                    packageId: `PKG-ALNS-${highTarget.id}`,
                    targetRequestId: highTarget.id,
                    role: slot.role,
                    aircraftTail: plane.tailNumber,
                    pilotId: pilot.id,
                    originBaseId: base.id,
                    recoveryBaseId: base.id,
                    munitionLoadout: [{ munitionId: mun.id, count: 2 }],
                    depTimeMinutes: dep,
                    totMinutes: tot,
                    recoveryTimeMinutes: rec,
                    fuelPlannedKg: Math.round(distKm * 2 * burnRate),
                    routeWaypoints: waypoints,
                    expectedRiskScore: calculateRouteRisk(waypoints, sc.threats),
                    status: 'SCHEDULED',
                    isFrozen: false,
                    justificationNotes: 'ALNS Knapsack Upgrade',
                  };

                  candidatePkg.push(newSortie);
                  trialPlan.push(newSortie);
                  assigned = true;
                  break;
                }
                if (assigned) break;
              }
              if (!assigned) { feasible = false; break; }
            }

            if (feasible && candidatePkg.length === rolesNeeded.length) {
              const fullPlan = withoutLow.concat(candidatePkg);
              const audit = verifier.verifyPlan(fullPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
              if (audit.totalViolations === 0) {
                const candObj = calcObj(fullPlan);
                const delta = candObj - currentObjective;
                if (delta > 0 || Math.exp(delta / Math.max(0.01, temperature)) > rng()) {
                  currentSorties = fullPlan;
                  currentObjective = candObj;
                  if (candObj > bestObjective) {
                    bestSorties = fullPlan;
                    bestObjective = candObj;
                    stats.knapsackUpgrade.wins++;
                  }
                }
                break;
              }
            }
          }
        }
      }
    }

    // Op 2: Base reassignment
    if (iteration % 3 === 0) {
      stats.baseReassignment.calls++;
      const packages = Array.from(new Set(currentSorties.map((s) => s.packageId)));
      const pickPkg = packages[Math.floor(rng() * packages.length)]!;
      const pkgSorties = currentSorties.filter((s) => s.packageId === pickPkg);
      const targetId = pkgSorties[0]?.targetRequestId;
      const target = sc.targetRequests.find((t) => t.id === targetId);

      if (target) {
        const curOrigin = pkgSorties[0]?.originBaseId;
        const remaining = currentSorties.filter((s) => s.packageId !== pickPkg);

        for (const altBase of sc.bases) {
          if (altBase.id === curOrigin || altBase.currentWeatherStatus === 'CLOSED') continue;
          const dist = haversineDistanceKm(altBase.location, target.location);
          const candidatePlanes = sc.aircraft.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
          const candidatePilots = sc.pilots.filter((p) => p.baseId === altBase.id && p.status === 'READY');

          let feasible = true;
          const newPkg: Sortie[] = [];
          const usedTails = new Set<string>();
          const usedPilots = new Set<string>();

          for (const s of pkgSorties) {
            const plane = candidatePlanes.find((a) => {
              if (!a.roles.includes(s.role) || usedTails.has(a.tailNumber)) return false;
              if (a.combatRadiusKm * 1.8 < dist * 2) return false;
              const flightMin = Math.round((dist / a.cruiseSpeedKmh) * 60);
              const dep = Math.max(0, s.totMinutes - flightMin);
              const rec = s.totMinutes + flightMin;
              const turnaround = a.turnaroundTimeMinutes || 35;
              for (const prev of remaining.filter((st) => st.aircraftTail === a.tailNumber)) {
                if (dep < prev.recoveryTimeMinutes + turnaround && rec > prev.depTimeMinutes - turnaround) return false;
              }
              return true;
            });
            if (!plane) { feasible = false; break; }

            const flightMin = Math.round((dist / plane.cruiseSpeedKmh) * 60);
            const dep = Math.max(0, s.totMinutes - flightMin);
            const rec = s.totMinutes + flightMin;

            const pilot = candidatePilots.find((p) => {
              if (p.typeRating !== plane.model || usedPilots.has(p.id)) return false;
              for (const prev of remaining.filter((st) => st.pilotId === p.id)) {
                if (dep < prev.recoveryTimeMinutes + 45 && rec > prev.depTimeMinutes - 45) return false;
              }
              return true;
            });
            if (!pilot) { feasible = false; break; }

            const munItem = MUNITION_CATALOG.find((m) => m.category === 'PRECISION_GUIDED_BOMB' && m.compatibleModels.includes(plane.model));
            if (!munItem) { feasible = false; break; }

            usedTails.add(plane.tailNumber);
            usedPilots.add(pilot.id);

            const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
            newPkg.push({
              ...s,
              originBaseId: altBase.id,
              recoveryBaseId: altBase.id,
              aircraftTail: plane.tailNumber,
              pilotId: pilot.id,
              depTimeMinutes: dep,
              recoveryTimeMinutes: rec,
              fuelPlannedKg: Math.round(dist * 2 * burnRate),
              expectedRiskScore: calculateRouteRisk([altBase.location, target.location, altBase.location], sc.threats),
              routeWaypoints: [altBase.location, target.location, altBase.location],
              munitionLoadout: [{ munitionId: munItem.id, count: 2 }],
            });
          }

          if (feasible && newPkg.length === pkgSorties.length) {
            const candPlan = remaining.concat(newPkg);
            const audit = verifier.verifyPlan(candPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
            if (audit.totalViolations === 0) {
              const candObj = calcObj(candPlan);
              const delta = candObj - currentObjective;
              if (delta > 0 || Math.exp(delta / Math.max(0.01, temperature)) > rng()) {
                currentSorties = candPlan;
                currentObjective = candObj;
                if (candObj > bestObjective) {
                  bestSorties = candPlan;
                  bestObjective = candObj;
                  stats.baseReassignment.wins++;
                }
              }
              break;
            }
          }
        }
      }
    }

    temperature *= coolingRate;
  }

  const finalAudit = verifier.verifyPlan(bestSorties, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
  const gainPct = Math.round(((bestObjective - t0Objective) / t0Objective) * 1000) / 10;

  return {
    seed,
    t0Objective: Math.round(t0Objective * 10) / 10,
    bestObjective: Math.round(bestObjective * 10) / 10,
    gainPct,
    stats,
    violations: finalAudit.totalViolations,
  };
}

console.log('Running ALNS on 10 benchmark seeds:');
let totalGain = 0;
for (const s of [42, 101, 777, 1337, 2024, 3030, 4040, 5050, 7070, 9999]) {
  const r = runFullAuditedAlns(s, 100, 300);
  console.log(`Seed ${s}: t0=${r.t0Objective} -> best=${r.bestObjective} (Gain: +${r.gainPct}%), violations=${r.violations}, wins=${JSON.stringify(r.stats)}`);
  totalGain += r.gainPct;
}
console.log(`Average ALNS Search Improvement: +${Math.round((totalGain / 10) * 10) / 10}%`);
