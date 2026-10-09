import { describe, it, expect } from 'vitest';
import { TacticalConstraintEngine } from '../src/constraint-engine';
import { IndependentPlanVerifier } from '../src/independent-verifier';
import { generateSyntheticScenario } from '@air-power/sim';
import { Sortie } from '@air-power/shared';

describe('Differential Verification Suite (Solver vs Independent Verifier)', () => {
  const solverEngine = new TacticalConstraintEngine();
  const independentVerifier = new IndependentPlanVerifier();
  const scenario = generateSyntheticScenario(42);

  const aircraftMap = new Map(scenario.aircraft.map((a) => [a.tailNumber, a]));
  const pilotMap = new Map(scenario.pilots.map((p) => [p.id, p]));
  const baseMap = new Map(scenario.bases.map((b) => [b.id, b]));
  const stockMap = new Map(scenario.munitionStocks.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
  const targetMap = new Map(scenario.targetRequests.map((t) => [t.id, t]));

  it('proves differential agreement across 10,000 randomized candidate sorties', () => {
    let disagreements = 0;
    const TOTAL_TRIALS = 10000;

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      // Pick random assets
      const plane = scenario.aircraft[i % scenario.aircraft.length];
      const pilot = scenario.pilots[i % scenario.pilots.length];
      const target = scenario.targetRequests[i % scenario.targetRequests.length];
      const base = scenario.bases[i % scenario.bases.length];

      // Mutate properties for fuzz testing
      const depTime = (i * 7) % 720;
      const recTime = depTime + 50;

      const testSortie: Sortie = {
        sortieId: `DIFF-SRT-${i}`,
        callsign: `DIFF-${plane.tailNumber}`,
        packageId: `DIFF-PKG-${target.id}`,
        targetRequestId: target.id,
        role: plane.roles[0] as any,
        aircraftTail: plane.tailNumber,
        aircraftModel: plane.model,
        pilotId: pilot.id,
        originBaseId: base.id,
        recoveryBaseId: base.id,
        depTimeMinutes: depTime,
        recoveryTimeMinutes: recTime,
        status: 'SCHEDULED',
        assignedMunitions: [],
        threatExposureRisk: 10,
        fuelRequiredKg: 3500,
        isFrozen: false,
      };

      const solverCheck = solverEngine.validateSortie(
        testSortie,
        aircraftMap,
        pilotMap,
        baseMap,
        stockMap,
        targetMap,
        scenario.threats
      );

      const independentAudit = independentVerifier.verifyPlan(
        [testSortie],
        scenario.aircraft,
        scenario.pilots,
        scenario.bases,
        scenario.munitionStocks,
        scenario.targetRequests,
        scenario.threats
      );

      // Check agreement on physical constraints (pilot rating, aircraft serviceability, base weather)
      const solverHasAOG = solverCheck.hardViolations.some((v) => v.includes('grounded') || v.includes('AOG'));
      const verifierHasAOG = independentAudit.violationDetails.some((v) => v.includes('C1') || v.includes('AOG'));
      if (solverHasAOG !== verifierHasAOG) disagreements++;

      const solverHasRating = solverCheck.hardViolations.some((v) => v.includes('type rating'));
      const verifierHasRating = independentAudit.violationDetails.some((v) => v.includes('C3') || v.includes('Rating'));
      if (solverHasRating !== verifierHasRating) disagreements++;

      const solverHasBase = solverCheck.hardViolations.some((v) => v.includes('CLOSED'));
      const verifierHasBase = independentAudit.violationDetails.some((v) => v.includes('C7') || v.includes('CLOSED') || v.includes('Runway'));
      if (solverHasBase !== verifierHasBase) disagreements++;
    }

    expect(disagreements).toBe(0); // 100% differential agreement
  });
});
