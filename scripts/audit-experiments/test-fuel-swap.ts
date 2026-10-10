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

  const initialObj = calcObj(plan.sorties);

  // Operator 1: Airframe fuel burn minimization swap
  // For sorties flying short/medium missions on high-burn aircraft, swap with compatible lower-burn aircraft at the same base that is idle during that window
  let sorties = [...plan.sorties];
  let swaps = 0;

  for (let i = 0; i < sorties.length; i++) {
    const s = sorties[i]!;
    const curPlane = sc.aircraft.find((a) => a.tailNumber === s.aircraftTail);
    if (!curPlane) continue;

    const curBurn = AIRCRAFT_MODEL_SPECS[curPlane.model]?.burnRateKgPerKm || 2.5;

    // Find candidate lower burn aircraft at the same base
    const lowerBurnPlanes = sc.aircraft.filter(
      (a) =>
        a.baseId === s.originBaseId &&
        a.status === 'FMC' &&
        a.roles.includes(s.role) &&
        a.tailNumber !== s.aircraftTail &&
        (AIRCRAFT_MODEL_SPECS[a.model]?.burnRateKgPerKm || 2.5) < curBurn
    );

    for (const altPlane of lowerBurnPlanes) {
      // Find rated pilot
      const pilot = sc.pilots.find(
        (p) => p.baseId === s.originBaseId && p.status === 'READY' && p.typeRating === altPlane.model && p.fatigueScore <= 65
      );
      if (!pilot) continue;

      const altBurn = AIRCRAFT_MODEL_SPECS[altPlane.model]?.burnRateKgPerKm || 2.2;
      const base = sc.bases.find((b) => b.id === s.originBaseId)!;
      const target = sc.targetRequests.find((t) => t.id === s.targetRequestId)!;
      const distKm = haversineDistanceKm(base.location, target.location);
      if (distKm * 2 > altPlane.combatRadiusKm * 1.8) continue;

      const newFuel = Math.round(distKm * 2 * altBurn);
      const candSortie: Sortie = {
        ...s,
        aircraftTail: altPlane.tailNumber,
        pilotId: pilot.id,
        fuelPlannedKg: newFuel,
      };

      const candPlan = sorties.map((st, idx) => (idx === i ? candSortie : st));
      const audit = verifier.verifyPlan(
        candPlan,
        sc.aircraft,
        sc.pilots,
        sc.bases,
        sc.munitionStocks,
        sc.targetRequests,
        sc.threats
      );

      if (audit.totalViolations === 0) {
        const candObj = calcObj(candPlan);
        if (candObj > calcObj(sorties)) {
          sorties = candPlan;
          swaps++;
          break;
        }
      }
    }
  }

  const finalObj = calcObj(sorties);
  const gain = Math.round(((finalObj - initialObj) / initialObj) * 1000) / 10;
  console.log(`Seed ${seed}: initialObj=${Math.round(initialObj*10)/10} -> finalObj=${Math.round(finalObj*10)/10} (Gain: +${gain}%), fuelSwaps=${swaps}`);
}
