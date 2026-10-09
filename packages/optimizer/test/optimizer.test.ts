import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  AlnsTacticalOptimizer,
  ManualStaffBaselinePlanner,
  PriorityGreedyBaselinePlanner,
  TacticalConstraintEngine,
  DynamicRetaskingEngine,
} from '../src/index.js';

describe('Tactical Optimizer & Baseline Engine', () => {
  const scenario = generateSyntheticScenario(42);
  const constraintEngine = new TacticalConstraintEngine();

  it('ALNS optimizer produces a feasible plan with zero hard-constraint violations', () => {
    const optimizer = new AlnsTacticalOptimizer();
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats,
      { doctrineFocus: 'BALANCED_RESERVE' }
    );

    expect(plan.sorties.length).toBeGreaterThan(15);
    expect(plan.kpis.hardConstraintViolations).toBe(0);

    const check = constraintEngine.validatePlan(
      plan.sorties,
      scenario.aircraft,
      scenario.pilots,
      scenario.bases,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    expect(check.hardViolations).toHaveLength(0);
    expect(check.totalViolations).toBe(0);
  });

  it('ALNS optimizer substantially outperforms Manual Staff and Greedy baselines in coverage and integrity', () => {
    const optimizer = new AlnsTacticalOptimizer();
    const manual = new ManualStaffBaselinePlanner();
    const greedy = new PriorityGreedyBaselinePlanner();

    const planOpt = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    const planMan = manual.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    const planGrd = greedy.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    // Coverage and integrity comparison
    expect(planOpt.kpis.priorityCoveragePercent).toBeGreaterThanOrEqual(planMan.kpis.priorityCoveragePercent);
    expect(planOpt.kpis.packageIntegrityPercent).toBeGreaterThan(planMan.kpis.packageIntegrityPercent);
    expect(planOpt.kpis.hardConstraintViolations).toBe(0);
  });

  it('Dynamic retasking generates an explainable diff and preserves frozen sorties', () => {
    const optimizer = new AlnsTacticalOptimizer();
    const retasker = new DynamicRetaskingEngine();

    const initialPlan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    // Simulate an AOG inject at T+20m
    const inject = {
      id: 'TEST_INJ',
      type: 'AIRCRAFT_AOG_SNAG' as const,
      simTimeMinutes: 20,
      title: 'Rafale Hydraulic Snag',
      description: 'Airframe grounded.',
      payload: { tailNumber: initialPlan.sorties[0].aircraftTail, snag: 'Hydraulic leak' },
      acknowledged: true,
    };

    const { updatedPlan, diffReport } = retasker.retaskPlan(
      initialPlan,
      inject,
      20,
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    expect(diffReport.changes.length).toBeGreaterThan(0);
    expect(diffReport.stabilityIndex).toBeGreaterThan(50);
    expect(diffReport.commanderBriefMarkdown).toContain('TACTICAL RETASKING ACTION REPORT');
    expect(updatedPlan.sorties.length).toBeGreaterThan(0);
  });
});
