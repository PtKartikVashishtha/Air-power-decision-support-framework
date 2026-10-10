import { generateSyntheticScenario } from '../../packages/sim/src';
import { MultiObjectiveParetoEngine } from '../../packages/optimizer/src/pareto-engine';

const sc = generateSyntheticScenario(42);
const engine = new MultiObjectiveParetoEngine();
const result = engine.generateParetoFrontier(
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests.slice(0, 12),
  sc.threats
);

console.log('Frontier points count:', result.frontierPoints.length);
for (const p of result.frontierPoints) {
  console.log(`Point ${p.id} (${p.dialPosition}): Coverage=${p.objectives.targetValue}%, Risk=${p.objectives.threatRisk}, Reserve=${p.objectives.reserveCount}, Fuel=${p.objectives.fuelConsumptionTons}t`);
}
