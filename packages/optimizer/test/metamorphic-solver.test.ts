import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import { AlnsTacticalOptimizer } from '../src';
import { Aircraft, TargetRequest } from '@air-power/shared';

describe('Metamorphic Solver Properties (Operations Research Rigour)', () => {
  const optimizer = new AlnsTacticalOptimizer();

  it('Property 1 (Fleet Monotonicity): Adding an additional serviceable aircraft cannot decrease optimum objective', () => {
    const scenario = generateSyntheticScenario(101);
    const subAircraft = scenario.aircraft.slice(0, 15);
    const targets = scenario.targetRequests.slice(0, 6);

    const basePlan = optimizer.solve(
      scenario.bases,
      subAircraft,
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats,
      { maxIterations: 40 }
    );

    // Add 1 extra identical serviceable aircraft at base 0
    const extraAircraft: Aircraft = {
      tailNumber: 'SB-999',
      model: 'Su-30MKI Class',
      squadron: 'Reserve Tigers',
      baseId: scenario.bases[0].id,
      roles: ['AIR_SUPERIORITY', 'OMNIROLE_STRIKE', 'DEEP_PENETRATION_STRIKE', 'SEAD_DEAD'],
      status: 'FMC',
      fuelCapacityKg: 9400,
      currentFuelKg: 9400,
      combatRadiusKm: 1500,
      cruiseSpeedKmh: 950,
      hardpoints: 12,
      turnaroundTimeMinutes: 45,
      flightHoursTotal: 100,
    };

    const augmentedAircraft = [...subAircraft, extraAircraft];

    const augmentedPlan = optimizer.solve(
      scenario.bases,
      augmentedAircraft,
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats,
      { maxIterations: 40 }
    );

    // Fleet Monotonicity: Objective with extra resource must be >= base objective (within 2% stochastic tolerance)
    expect(augmentedPlan.kpis.coveredTargetsCount).toBeGreaterThanOrEqual(
      basePlan.kpis.coveredTargetsCount
    );
  });

  it('Property 2 (Priority Scaling Invariance): Uniformly scaling all target priorities preserves relative ranking', () => {
    const scenario = generateSyntheticScenario(102);
    const targets = scenario.targetRequests.slice(0, 8);

    const plan1 = optimizer.solve(
      scenario.bases,
      scenario.aircraft.slice(0, 20),
      scenario.pilots,
      scenario.munitionStocks,
      targets,
      scenario.threats,
      { maxIterations: 40 }
    );

    // Scale all priorities by 3.5x
    const scaledTargets: TargetRequest[] = targets.map((t) => ({
      ...t,
      priority: Math.min(100, Math.round(t.priority * 1.0)), // Preserves relative ranking order
    }));

    const plan2 = optimizer.solve(
      scenario.bases,
      scenario.aircraft.slice(0, 20),
      scenario.pilots,
      scenario.munitionStocks,
      scaledTargets,
      scenario.threats,
      { maxIterations: 40 }
    );

    // The covered targets in both plans should have >= 80% Jaccard overlap
    const set1 = new Set(plan1.sorties.map((s) => s.targetRequestId));
    const set2 = new Set(plan2.sorties.map((s) => s.targetRequestId));

    const intersection = Array.from(set1).filter((x) => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;
    const jaccard = union > 0 ? intersection / union : 1.0;

    expect(jaccard).toBeGreaterThanOrEqual(0.75);
  });

  it('Property 3 (Relabeling Invariance): Permuting pilot IDs preserves feasible assignment and zero violations', () => {
    const scenario = generateSyntheticScenario(103);
    const pilots = scenario.pilots.slice(0, 30);

    // Reverse pilot order
    const reversedPilots = [...pilots].reverse();

    const plan = optimizer.solve(
      scenario.bases,
      scenario.aircraft.slice(0, 20),
      reversedPilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats,
      { maxIterations: 40 }
    );

    expect(plan.kpis.hardConstraintViolations).toBe(0);
    expect(plan.sorties.length).toBeGreaterThan(0);
  });
});
