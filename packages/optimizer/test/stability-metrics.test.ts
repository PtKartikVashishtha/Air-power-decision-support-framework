import { describe, it, expect } from 'vitest';
import { DynamicRetaskingEngine } from '../src/dynamic-retasker';
import { generateSyntheticScenario } from '@air-power/sim';
import { AlnsTacticalOptimizer } from '../src/alns-optimizer';

describe('Pinned Stability Index & Granular Disruption Metrics Suite', () => {
  const optimizer = new AlnsTacticalOptimizer();
  const retasker = new DynamicRetaskingEngine();
  const scenario = generateSyntheticScenario(42);

  const initialPlan = optimizer.solve(
    scenario.bases,
    scenario.aircraft,
    scenario.pilots,
    scenario.munitionStocks,
    scenario.targetRequests,
    scenario.threats,
    { doctrineFocus: 'BALANCED_RESERVE' }
  );

  it('pins both operational stability index and legacy audit metric', () => {
    const inject = {
      id: 'INJ-AOG-TEST',
      type: 'AIRCRAFT_AOG_SNAG' as const,
      simTimeMinutes: 20,
      title: 'Rafale Hydraulic Snag on SB021',
      description: 'Airframe grounded.',
      payload: { tailNumber: initialPlan.sorties[0].aircraftTail, snag: 'Hydraulic failure' },
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

    // Operational Stability Index: measures preserved committed sorties (>= 80%)
    expect(diffReport.stabilityIndex).toBeGreaterThanOrEqual(80);

    // Legacy Audit Metric: published for full audit transparency
    expect(diffReport.legacyStabilityIndex).toBeDefined();
    expect(diffReport.legacyStabilityIndex).toBeGreaterThanOrEqual(20);

    // Preserved sorties percent
    expect(diffReport.preservedSortiesPercent).toBeGreaterThanOrEqual(80);

    // Discrete Hamming distance on plan assignments
    expect(diffReport.hammingDistanceSorties).toBeGreaterThanOrEqual(1);

    // Commander brief documents both metrics
    expect(diffReport.commanderBriefMarkdown).toContain('Operational Stability Index');
    expect(diffReport.commanderBriefMarkdown).toContain('Legacy Audit Metric');
  });
});
