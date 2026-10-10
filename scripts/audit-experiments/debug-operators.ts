import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const sc = generateSyntheticScenario(42);
const opt = new AlnsTacticalOptimizer();
const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

console.log('Total sorties:', plan.sorties.length);
const tailsUsed = new Set(plan.sorties.map(s => s.aircraftTail));
console.log('Tails used:', tailsUsed.size, 'out of', sc.aircraft.length);

const targetsCovered = new Set(plan.sorties.map(s => s.targetRequestId));
console.log('Targets covered:', targetsCovered.size, 'out of', sc.targetRequests.length);

const uncovered = sc.targetRequests.filter(t => !targetsCovered.has(t.id));
console.log('Uncovered targets:');
for (const u of uncovered) {
  console.log(`  Target ${u.id}: prio=${u.priority}, TOT=[${u.totStartMinutes}, ${u.totEndMinutes}], req=${JSON.stringify(u.requiredPackage)}`);
}
