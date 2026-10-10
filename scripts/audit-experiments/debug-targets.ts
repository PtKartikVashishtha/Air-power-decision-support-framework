import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const sc = generateSyntheticScenario(42);
const opt = new AlnsTacticalOptimizer();
const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

const coveredTgtIds = new Set(plan.sorties.map(s => s.targetRequestId));
const sorted = [...sc.targetRequests].sort((a,b) => b.priority - a.priority);
console.log('Targets in descending priority:');
for (const t of sorted) {
  const isCovered = coveredTgtIds.has(t.id);
  console.log(`  ${t.id}: prio=${t.priority}, req=${JSON.stringify(t.requiredPackage)}, covered=${isCovered}`);
}
