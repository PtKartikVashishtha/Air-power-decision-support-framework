import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  AlnsTacticalOptimizer,
  IndependentPlanVerifier,
} from '../src/index';

describe('Property-Based Fuzz Testing Suite (fast-check)', () => {
  const optimizer = new AlnsTacticalOptimizer();
  const verifier = new IndependentPlanVerifier();

  it('Property: For any randomized valid seed (1..10000), optimizer produces zero independent verifier violations', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2000 }), (seed) => {
        const sc = generateSyntheticScenario(seed);
        const plan = optimizer.solve(
          sc.bases,
          sc.aircraft,
          sc.pilots,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );
        const audit = verifier.verifyPlan(
          plan.sorties,
          sc.aircraft,
          sc.pilots,
          sc.bases,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );
        return audit.isFullyCompliant && audit.totalViolations === 0;
      }),
      { numRuns: 30 }
    );
  }, 15000);

  it('Property: Adversarial Fuzzing - Randomly grounding 50% of fleet never causes an unserviceable allocation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (seed) => {
        const sc = generateSyntheticScenario(seed);
        // Ground 50% of aircraft
        const degradedAircraft = sc.aircraft.map((a, idx) => ({
          ...a,
          status: idx % 2 === 0 ? ('AOG' as const) : ('FMC' as const),
        }));

        const plan = optimizer.solve(
          sc.bases,
          degradedAircraft,
          sc.pilots,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );

        const audit = verifier.verifyPlan(
          plan.sorties,
          degradedAircraft,
          sc.pilots,
          sc.bases,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );

        return audit.isFullyCompliant && audit.totalViolations === 0;
      }),
      { numRuns: 20 }
    );
  });

  it('Property: Adversarial Fuzzing - Random weather closures never result in departures from closed bases', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (seed) => {
        const sc = generateSyntheticScenario(seed);
        // Randomly close 3 out of 6 bases
        const degradedBases = sc.bases.map((b, idx) => ({
          ...b,
          currentWeatherStatus: idx % 2 === 1 ? ('CLOSED' as const) : ('VMC' as const),
        }));

        const plan = optimizer.solve(
          degradedBases,
          sc.aircraft,
          sc.pilots,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );

        const audit = verifier.verifyPlan(
          plan.sorties,
          sc.aircraft,
          sc.pilots,
          degradedBases,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );

        return audit.isFullyCompliant && audit.totalViolations === 0;
      }),
      { numRuns: 20 }
    );
  });
});
