import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const opt = new AlnsTacticalOptimizer();

for (const seed of [42, 101, 777, 2026, 9999]) {
  const sc = generateSyntheticScenario(seed);

  const minRisk = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, {
    doctrineFocus: 'MIN_RISK',
    seed,
  });

  const balanced = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, {
    doctrineFocus: 'BALANCED_RESERVE',
    seed,
  });

  const maxEffect = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, {
    doctrineFocus: 'MAX_EFFECT',
    seed,
  });

  console.log(`Seed ${seed}:`);
  console.log(`  MIN_RISK: coverage=${minRisk.kpis.priorityCoveragePercent}%, risk=${minRisk.kpis.totalExpectedLossScore}, reserve=${minRisk.kpis.strategicReserveAircraft}`);
  console.log(`  BALANCED: coverage=${balanced.kpis.priorityCoveragePercent}%, risk=${balanced.kpis.totalExpectedLossScore}, reserve=${balanced.kpis.strategicReserveAircraft}`);
  console.log(`  MAX_EFF : coverage=${maxEffect.kpis.priorityCoveragePercent}%, risk=${maxEffect.kpis.totalExpectedLossScore}, reserve=${maxEffect.kpis.strategicReserveAircraft}`);
}
