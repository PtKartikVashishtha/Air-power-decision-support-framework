import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const sc = generateSyntheticScenario(42);
console.log('Targets count:', sc.targetRequests.length);
console.log('Aircraft count:', sc.aircraft.length);
console.log('Munition stock count:', sc.munitionStocks?.length);
console.log('Bases:', sc.bases.length);

const optimizer = new AlnsTacticalOptimizer();
const plan = optimizer.solve(
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats,
  {
    doctrineFocus: 'BALANCED_RESERVE',
    allowMultiWave: true,
    maxIterations: 100,
    timeLimitMs: 200,
    seed: 42,
  }
);

console.log('Plan Sorties:', plan.sorties.length);
console.log('Covered Targets:', plan.kpis.coveredTargetsCount, '/', plan.kpis.totalTargetsCount);
console.log('Operator Stats:', optimizer.operatorStats);
console.log('Summary:', optimizer.lastOptimizationSummary);
