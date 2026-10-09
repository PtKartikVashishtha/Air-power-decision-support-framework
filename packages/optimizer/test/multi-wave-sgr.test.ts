import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  AlnsTacticalOptimizer,
  IndependentPlanVerifier,
} from '../src/index';

describe('Multi-Wave Sortie Generation Rate (SGR) & Turnaround Testing', () => {
  const scenario = generateSyntheticScenario(42);
  const optimizer = new AlnsTacticalOptimizer();
  const verifier = new IndependentPlanVerifier();

  it('Multi-wave generation tasks capable aircraft across multiple operational waves', () => {
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats,
      { allowMultiWave: true }
    );

    const audit = verifier.verifyPlan(
      plan.sorties,
      scenario.aircraft,
      scenario.pilots,
      scenario.bases,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    expect(audit.isFullyCompliant).toBe(true);
    expect(audit.metrics.sortiesAudited).toBeGreaterThan(20);
  });

  it('Turnaround separation is strictly maintained between consecutive sorties of the same tail', () => {
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats,
      { allowMultiWave: true }
    );

    const tailSorties = new Map<string, typeof plan.sorties>();
    for (const s of plan.sorties) {
      const list = tailSorties.get(s.aircraftTail) || [];
      list.push(s);
      tailSorties.set(s.aircraftTail, list);
    }

    for (const [tail, sorties] of tailSorties.entries()) {
      if (sorties.length > 1) {
        const sorted = sorties.sort((a, b) => a.depTimeMinutes - b.depTimeMinutes);
        for (let i = 0; i < sorted.length - 1; i++) {
          const s1 = sorted[i];
          const s2 = sorted[i + 1];
          const plane = scenario.aircraft.find((a) => a.tailNumber === tail);
          const minTurnaround = plane?.turnaroundTimeMinutes || 35;
          expect(s2.depTimeMinutes).toBeGreaterThanOrEqual(s1.recoveryTimeMinutes + minTurnaround);
        }
      }
    }
  });

  it('Pilot rest separation is strictly maintained between consecutive sorties of the same pilot', () => {
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats,
      { allowMultiWave: true }
    );

    const pilotSorties = new Map<string, typeof plan.sorties>();
    for (const s of plan.sorties) {
      const list = pilotSorties.get(s.pilotId) || [];
      list.push(s);
      pilotSorties.set(s.pilotId, list);
    }

    for (const [pilotId, sorties] of pilotSorties.entries()) {
      if (sorties.length > 1) {
        const sorted = sorties.sort((a, b) => a.depTimeMinutes - b.depTimeMinutes);
        for (let i = 0; i < sorted.length - 1; i++) {
          const s1 = sorted[i];
          const s2 = sorted[i + 1];
          const MANDATORY_REST = 45;
          expect(s2.depTimeMinutes).toBeGreaterThanOrEqual(s1.recoveryTimeMinutes + MANDATORY_REST);
        }
      }
    }
  });
});
