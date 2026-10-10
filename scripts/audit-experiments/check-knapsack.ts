import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
  MUNITION_CATALOG,
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

  // Find covered and uncovered targets
  const coveredIds = new Set(plan.sorties.map((s) => s.targetRequestId));
  const coveredTargets = sc.targetRequests.filter((t) => coveredIds.has(t.id)).sort((a,b) => a.priority - b.priority); // ascending
  const uncoveredTargets = sc.targetRequests.filter((t) => !coveredIds.has(t.id)).sort((a,b) => b.priority - a.priority); // descending

  console.log(`Seed ${seed}:`);
  console.log('  Lowest covered:', coveredTargets.slice(0, 3).map((t) => `${t.id}(p=${t.priority})`).join(', '));
  console.log('  Highest uncovered:', uncoveredTargets.slice(0, 3).map((t) => `${t.id}(p=${t.priority})`).join(', '));
}
