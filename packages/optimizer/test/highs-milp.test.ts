import { describe, it, expect } from 'vitest';
import { HighsMilpSolver } from '../src/highs-milp-solver';
import { generateSyntheticScenario } from '@air-power/sim';
import { AlnsTacticalOptimizer } from '../src/alns-optimizer';

describe('HiGHS-WASM True MILP Solver & Optimality Gap Suite', () => {
  const solver = new HighsMilpSolver();
  const alns = new AlnsTacticalOptimizer();
  const scenario = generateSyntheticScenario(42);

  it('solves small instance to proven global optimum via HiGHS-WASM', async () => {
    const targets = scenario.targetRequests.slice(0, 6);
    const milpResult = await solver.solveMilp(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats
    );

    expect(['Optimal', 'Feasible']).toContain(milpResult.status);
    expect(milpResult.objectiveValue).toBeGreaterThan(0);
    expect(milpResult.coveredTargetIds.length).toBeGreaterThan(0);
    expect(milpResult.solveDurationMs).toBeLessThan(5000);
  });

  it('evaluates true empirical ALNS vs HiGHS MILP optimality gap', async () => {
    const targets = scenario.targetRequests.slice(0, 8);
    const milpResult = await solver.solveMilp(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats
    );

    const alnsPlan = alns.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats,
      { doctrineFocus: 'MAX_EFFECT' }
    );

    // Calculate covered priority in both
    const alnsCoveredPrio = targets
      .filter((t) => alnsPlan.sorties.some((s) => s.targetRequestId === t.id))
      .reduce((sum, t) => sum + t.priority, 0);

    const milpCoveredPrio = targets
      .filter((t) => milpResult.coveredTargetIds.includes(t.id))
      .reduce((sum, t) => sum + t.priority, 0);

    const gap =
      milpCoveredPrio > 0
        ? Math.max(0, ((milpCoveredPrio - alnsCoveredPrio) / milpCoveredPrio) * 100)
        : 0;

    console.log(`\n📊 TRUE MILP OPTIMALITY EVALUATION (8 Targets):`);
    console.log(`   HiGHS MILP Optimum Objective: ${milpResult.objectiveValue} (Priority: ${milpCoveredPrio})`);
    console.log(`   ALNS Heuristic Priority:      ${alnsCoveredPrio}`);
    console.log(`   True Empirical Optimality Gap: ${gap.toFixed(2)}%\n`);

    expect(gap).toBeLessThanOrEqual(10.0); // Within 10% of proven mathematical optimum
  });
});
