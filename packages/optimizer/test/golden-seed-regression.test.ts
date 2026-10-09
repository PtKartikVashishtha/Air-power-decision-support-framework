import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  AlnsTacticalOptimizer,
  CourseOfActionGenerator,
  IndependentPlanVerifier,
} from '../src/index';

describe('Golden Seed Deterministic Regression Suite', () => {
  const seeds = [42, 101, 777, 2026, 9999];
  const optimizer = new AlnsTacticalOptimizer();
  const coaGen = new CourseOfActionGenerator();
  const verifier = new IndependentPlanVerifier();

  for (const seed of seeds) {
    it(`Seed ${seed}: Produces 100% compliant plan with zero independent verifier violations`, () => {
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

      expect(audit.isFullyCompliant).toBe(true);
      expect(audit.totalViolations).toBe(0);
      expect(plan.kpis.priorityCoveragePercent).toBeGreaterThan(35);
      expect(plan.kpis.packageIntegrityPercent).toBe(100);
    });

    it(`Seed ${seed}: Generates 3 distinct Courses of Action with expected doctrine trade-offs`, () => {
      const sc = generateSyntheticScenario(seed);
      const coas = coaGen.generateTripleCoas(
        sc.bases,
        sc.aircraft,
        sc.pilots,
        sc.munitionStocks,
        sc.targetRequests,
        sc.threats
      );

      expect(coas.maxEffectCoa.doctrineFocus).toBe('MAX_EFFECT');
      expect(coas.minRiskCoa.doctrineFocus).toBe('MIN_RISK');
      expect(coas.balancedReserveCoa.doctrineFocus).toBe('BALANCED_RESERVE');

      // Max effect should have higher or equal coverage than Min Risk
      expect(coas.maxEffectCoa.kpis.priorityCoveragePercent).toBeGreaterThanOrEqual(
        coas.minRiskCoa.kpis.priorityCoveragePercent
      );
      // Balanced reserve preserves strategic airframe depth
      expect(coas.balancedReserveCoa.kpis.strategicReserveAircraft).toBeGreaterThanOrEqual(
        coas.maxEffectCoa.kpis.strategicReserveAircraft - 2
      );
      expect(coas.minRiskCoa.sorties.length).toBeGreaterThan(0);
    });
  }
});
