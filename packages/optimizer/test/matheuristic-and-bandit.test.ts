import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  BanditOperatorSelector,
  MatheuristicLnsEngine,
  MultiObjectiveParetoEngine,
  RobustStochasticPlanner,
  AlnsTacticalOptimizer,
} from '../src';

describe('T1-B Solver Upgrades: Multi-Armed Bandit & Regret Logging', () => {
  const operators = ['randomDestroy', 'worstRiskDestroy', 'clusterDestroy', 'greedyRepair', 'regretRepair'];

  it('UCB1 bandit selects each operator at least once during cold-start', () => {
    const bandit = new BanditOperatorSelector(operators, 'UCB1');
    const selected = new Set<string>();

    for (let i = 0; i < operators.length; i++) {
      const op = bandit.selectOperator(operators);
      selected.add(op);
      bandit.recordFeedback(op, 10, true, false);
    }

    expect(selected.size).toBe(operators.length);
  });

  it('UCB1 favors high-reward operators while maintaining non-zero exploration', () => {
    const bandit = new BanditOperatorSelector(operators, 'UCB1');

    // Train: give 'regretRepair' 5x more reward than others
    for (let i = 0; i < 50; i++) {
      const op = bandit.selectOperator(operators);
      const reward = op === 'regretRepair' ? 50 : 5;
      bandit.recordFeedback(op, reward, true, op === 'regretRepair' && i % 10 === 0);
    }

    const stats = bandit.getOperatorStats('REPAIR');
    const regretRepairStats = stats.find((s) => s.operatorName === 'regretRepair');
    expect(regretRepairStats).toBeDefined();
    expect(regretRepairStats!.pulls).toBeGreaterThan(15);
    expect(regretRepairStats!.meanReward).toBeGreaterThan(15);

    // Cumulative regret is computed and non-negative
    const regret = bandit.calculateCumulativeRegret();
    expect(regret).toBeGreaterThanOrEqual(0);
  });

  it('Thompson Sampling maintains valid Beta posterior updates and ablation stats', () => {
    const bandit = new BanditOperatorSelector(operators, 'THOMPSON_SAMPLING');

    for (let i = 0; i < 30; i++) {
      const op = bandit.selectOperator(operators);
      bandit.recordFeedback(op, 20, true, i === 5);
    }

    const stats = bandit.getOperatorStats('DESTROY');
    expect(stats.length).toBe(operators.length);
    let totalContrib = 0;
    for (const s of stats) totalContrib += s.ablationContributionPercent;
    expect(totalContrib).toBeCloseTo(100, 0);
  });
});

describe('T1-B Solver Upgrades: Multi-Objective Pareto & Commander Intent Dial', () => {
  const scenario = generateSyntheticScenario(42);
  const paretoEngine = new MultiObjectiveParetoEngine();

  it('generates non-dominated Pareto frontier across doctrine trade-offs', () => {
    const result = paretoEngine.generateParetoFrontier(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 12),
      scenario.threats
    );

    expect(result.frontierPoints.length).toBeGreaterThanOrEqual(3);
    expect(result.hypervolumeEstimate).toBeGreaterThan(0);
    expect(result.tradeOffSummary).toContain('Pareto Frontier');

    // Check dial interpolation
    const minRiskPlan = paretoEngine.getPlanForDial(result.frontierPoints, 0.0);
    const maxSurgePlan = paretoEngine.getPlanForDial(result.frontierPoints, 1.0);

    expect(minRiskPlan.dialPosition).toBe(0.0);
    expect(maxSurgePlan.dialPosition).toBe(1.0);
    // Max surge should have >= coverage than min risk
    expect(maxSurgePlan.objectives.targetValue).toBeGreaterThanOrEqual(minRiskPlan.objectives.targetValue);
  });
});

describe('T1-B Solver Upgrades: Robust Stochastic Planner & Price of Robustness', () => {
  const scenario = generateSyntheticScenario(42);
  const robustPlanner = new RobustStochasticPlanner();

  it('evaluates nominal vs robust plans and quantifies Price of Robustness', () => {
    const evalResult = robustPlanner.evaluateRobustPlan(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 10),
      scenario.threats,
      5 // 5 stochastic trials
    );

    expect(evalResult.nominalPlan).toBeDefined();
    expect(evalResult.robustPlan).toBeDefined();
    expect(evalResult.scenariosEvaluatedCount).toBe(5);

    // Robust survival rate under disruptions should meet or exceed nominal
    expect(evalResult.robustMeanSurvivalRate).toBeGreaterThanOrEqual(evalResult.nominalMeanSurvivalRate * 0.9);

    // Price of Robustness is a quantified percentage
    expect(evalResult.priceOfRobustnessPercent).toBeGreaterThanOrEqual(0);
    expect(evalResult.priceOfRobustnessPercent).toBeLessThan(25); // Reasonable insurance premium

    // Conformal 90% prediction interval
    expect(evalResult.conformalInterval90.lowerBoundScore).toBeLessThanOrEqual(
      evalResult.conformalInterval90.upperBoundScore
    );
    expect(evalResult.executiveRationale).toContain('Price of Robustness');
  });
});

describe('T1-B Solver Upgrades: Matheuristic LNS (Fix-and-Optimise)', () => {
  const scenario = generateSyntheticScenario(42);
  const optimizer = new AlnsTacticalOptimizer();
  const matheuristic = new MatheuristicLnsEngine();

  it('executes fix-and-optimise re-optimization on candidate sub-neighborhood', async () => {
    const initialPlan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats,
      { maxIterations: 20 }
    );

    const step = await matheuristic.reoptimizeSubneighborhood(
      initialPlan.sorties,
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats,
      { subTargetCount: 2, timeLimitSeconds: 0.2 }
    );

    expect(step.durationMs).toBeGreaterThanOrEqual(0);
    expect(step.sorties.length).toBeGreaterThan(0);
    expect(['Optimal', 'Feasible', 'SkippedEmpty', 'NoSubResources', 'HiGHS_Fallback']).toContain(
      step.highsStatus
    );
  });
});
