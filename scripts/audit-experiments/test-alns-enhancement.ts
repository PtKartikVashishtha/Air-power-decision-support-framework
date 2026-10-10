import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';

const sc = generateSyntheticScenario(42);
const optimizer = new AlnsTacticalOptimizer();
const plan = optimizer.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, {
  seed: 42,
  maxIterations: 100,
  timeLimitMs: 250,
});

console.log('Current ALNS Optimization Summary:');
console.log(optimizer.lastOptimizationSummary);
console.log('KPIs:', plan.kpis);
