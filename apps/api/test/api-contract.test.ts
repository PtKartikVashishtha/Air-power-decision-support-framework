import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import { AlnsTacticalOptimizer, ThreatAwareRoutePlanner } from '@air-power/optimizer';

describe('Fastify API Contract & Schema Invariant Tests', () => {
  const scenario = generateSyntheticScenario(42);
  const optimizer = new AlnsTacticalOptimizer();

  it('API Plan payload matches Zod schema specifications', () => {
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    expect(plan.id).toBeDefined();
    expect(plan.name).toContain('Operation Plan');
    expect(plan.sorties).toBeInstanceOf(Array);
    expect(plan.sorties.length).toBeGreaterThan(0);
    expect(plan.kpis.priorityCoveragePercent).toBeGreaterThanOrEqual(0);
    expect(plan.kpis.priorityCoveragePercent).toBeLessThanOrEqual(100);
    expect(plan.kpis.packageIntegrityPercent).toBe(100);
    expect(plan.kpis.hardConstraintViolations).toBe(0);
  });

  it('Every sortie in the plan has valid callsign, tail, and waypoints', () => {
    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests,
      scenario.threats
    );

    for (const s of plan.sorties) {
      expect(s.sortieId).toMatch(/^SRT-\d{4}$/);
      expect(s.callsign).toMatch(/^VAYU-/);
      expect(s.aircraftTail).toMatch(/^[A-Z]{2}-\d{3}$/);
      expect(s.pilotId).toMatch(/^PILOT-\d{3}$/);
      expect(s.routeWaypoints.length).toBeGreaterThanOrEqual(2);
      expect(s.fuelPlannedKg).toBeGreaterThan(0);
      expect(s.expectedRiskScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('Synthetic scenario contains required airframe diversity and base counts', () => {
    expect(scenario.bases.length).toBe(6);
    expect(scenario.aircraft.length).toBe(68);
    expect(scenario.pilots.length).toBeGreaterThan(70);
    expect(scenario.threats.length).toBeGreaterThanOrEqual(5);

    const models = new Set(scenario.aircraft.map((a) => a.model));
    expect(models.has('Su-30MKI Class')).toBe(true);
    expect(models.has('Rafale Class')).toBe(true);
    expect(models.has('Tejas Class')).toBe(true);
    expect(models.has('Mirage Class')).toBe(true);
    expect(models.has('IL-78 Tanker Class')).toBe(true);
    expect(models.has('Netra AEW&C Class')).toBe(true);
  });

  it('Route planner produces valid route A vs route B comparison contract', () => {
    const planner = new ThreatAwareRoutePlanner();
    const origin = scenario.bases[0].location;
    const target = scenario.targetRequests[0].location;

    const comp = planner.planAndCompareRoutes(origin, target, scenario.threats, 'RAFALE_CLASS');
    expect(comp.routeA.totalDistanceKm).toBeGreaterThan(50);
    expect(comp.routeB.totalDistanceKm).toBeGreaterThan(50);
    expect(comp.fuelDeltaKg).toBeTypeOf('number');
    expect(comp.timeDeltaMinutes).toBeTypeOf('number');
    expect(comp.riskReductionPercent).toBeGreaterThanOrEqual(0);
    expect(comp.routeB.waypoints.length).toBeGreaterThan(2);
    expect(comp.routeB.elevationProfile.length).toBeGreaterThan(10);
  });
});
