import { describe, it, expect } from 'vitest';
import { DecisionQualityExplainer } from '../src/assignment-explainer';
import { generateSyntheticScenario } from '@air-power/sim';
import { Sortie } from '@air-power/shared';

describe('T1-E Explainability & Decision Quality Suite', () => {
  const scenario = generateSyntheticScenario(42);
  const explainer = new DecisionQualityExplainer();

  it('generates an explainable assignment rationale card with runner-up alternative and tradeoff breakdown', () => {
    const testSortie: Sortie = {
      sortieId: 'SRT-EXP-01',
      callsign: 'GOLDEN-ARROW-01',
      packageId: 'PKG-01',
      targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
      role: 'DEEP_PENETRATION_STRIKE',
      aircraftTail: 'RB-101', // Rafale
      pilotId: 'PILOT-01',
      originBaseId: 'BASE_AMBALA',
      recoveryBaseId: 'BASE_AMBALA',
      depTimeMinutes: 60,
      totMinutes: 90,
      recoveryTimeMinutes: 120,
      status: 'SCHEDULED',
      expectedRiskScore: 24,
      fuelPlannedKg: 3800,
      munitionLoadout: [],
      routeWaypoints: [],
      isFrozen: false,
    };

    const card = explainer.explainSortieAssignment(testSortie, {
      allSorties: [testSortie],
      aircraft: scenario.aircraft,
      pilots: scenario.pilots,
      targets: scenario.targetRequests,
      threats: scenario.threats,
    });

    expect(card.sortieId).toBe('SRT-EXP-01');
    expect(card.assignedAirframeTail).toBe('RB-101');
    expect(card.scoreBreakdown.netScore).toBeGreaterThan(0);
    expect(card.scoreBreakdown.targetPriorityPoints).toBeGreaterThan(0);
    expect(card.runnerUp).toBeDefined();
    expect(card.runnerUp.airframeTail).not.toBe('RB-101');
    expect(card.runnerUp.whyNotSelected.length).toBeGreaterThan(10);
    expect(card.commanderSummary).toContain('Selected');
  });

  it('computes global SHAP-lite feature attributions summing to 100%', () => {
    const plan: any = { sorties: [], kpis: {} };
    const attributions = explainer.computeGlobalFeatureAttribution(plan);

    expect(attributions.length).toBe(4);
    const totalWeight = attributions.reduce((acc, a) => acc + a.weightPercent, 0);
    expect(totalWeight).toBe(100);

    const targetAttr = attributions.find((a) => a.featureName.includes('Target Priority'));
    expect(targetAttr?.weightPercent).toBeGreaterThan(30);
  });

  it('generates sensitivity tornado analysis with realistic operational shocks', () => {
    const tornado = explainer.generateSensitivityTornadoAnalysis();

    expect(tornado.length).toBeGreaterThanOrEqual(4);
    const fuelShock = tornado.find((t) => t.parameterName.includes('Fuel'));
    expect(fuelShock).toBeDefined();
    expect(fuelShock?.impactOnTargetCoveragePercent).toBeLessThan(0);
    expect(fuelShock?.mitigationStrategy.length).toBeGreaterThan(10);
  });
});
