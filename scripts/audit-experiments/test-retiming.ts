import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
} from '../../packages/shared/src';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const verifier = new IndependentPlanVerifier();
const opt = new AlnsTacticalOptimizer();

for (const seed of [42, 101, 777, 1337, 9999]) {
  const sc = generateSyntheticScenario(seed);
  const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

  // Let's test TOT Jitter / Retiming on plan sorties
  let sorties = [...plan.sorties];
  let improvedCount = 0;

  for (let i = 0; i < sorties.length; i++) {
    const s = sorties[i]!;
    const target = sc.targetRequests.find((t) => t.id === s.targetRequestId);
    if (!target) continue;

    const base = sc.bases.find((b) => b.id === s.originBaseId);
    const plane = sc.aircraft.find((a) => a.tailNumber === s.aircraftTail);
    if (!base || !plane) continue;

    const distKm = haversineDistanceKm(base.location, target.location);
    const flightTimeMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);

    // Try earlier and later TOTs in the target's valid window
    for (const deltaTot of [-15, -10, -5, 5, 10, 15]) {
      const candidateTot = s.totMinutes + deltaTot;
      if (candidateTot < target.totStartMinutes || candidateTot > target.totEndMinutes) continue;

      const newDep = Math.max(0, candidateTot - flightTimeMin);
      const newRec = candidateTot + flightTimeMin;

      const candidateSortie: Sortie = {
        ...s,
        depTimeMinutes: newDep,
        totMinutes: candidateTot,
        recoveryTimeMinutes: newRec,
      };

      const candidatePlan = sorties.map((st, idx) => (idx === i ? candidateSortie : st));
      const audit = verifier.verifyPlan(
        candidatePlan,
        sc.aircraft,
        sc.pilots,
        sc.bases,
        sc.munitionStocks,
        sc.targetRequests,
        sc.threats
      );

      if (audit.totalViolations === 0) {
        sorties = candidatePlan;
        improvedCount++;
        break;
      }
    }
  }

  console.log(`Seed ${seed}: retimed ${improvedCount} sorties feasible!`);
}
