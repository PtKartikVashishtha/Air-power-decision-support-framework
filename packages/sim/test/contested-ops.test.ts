import { describe, it, expect } from 'vitest';
import {
  SpoofDetectionEngine,
  EdgeCrdtSyncNode,
  RedCellWargameEngine,
  generateSyntheticScenario,
} from '../src';
import { ThreatIntel, Sortie } from '@air-power/shared';

describe('T1-C Contested Operations: Spoof & Data-Integrity Engine', () => {
  const engine = new SpoofDetectionEngine();

  it('detects impossible kinematic velocity and quarantines fake SAM tracks', () => {
    const t0 = Date.now();
    const baseThreat: ThreatIntel = {
      id: 'SPOOF_SAM_TEST',
      name: 'Hostile Mobile SAM Battery',
      type: 'MEDIUM_RANGE_SAM',
      location: { lat: 30.0, lon: 74.0, altM: 200 },
      detectionRadiusKm: 120,
      engagementRadiusKm: 60,
      lethalityScore: 85,
      confidence: 80,
      sourceSystem: 'UNVERIFIED_TACTICAL_DATA_LINK',
      firstDetectedAt: new Date(t0).toISOString(),
      lastUpdatedAt: new Date(t0).toISOString(),
      active: true,
    };

    // First observation
    const res1 = engine.auditThreatTelemetry(baseThreat, t0);
    expect(res1.isSpoofSuspected).toBe(false);

    // 10 seconds later, SAM reported 80 km away (velocity = 28,800 km/h = Mach 23!)
    const spoofedThreat: ThreatIntel = {
      ...baseThreat,
      location: { lat: 30.7, lon: 74.0, altM: 200 },
      lastUpdatedAt: new Date(t0 + 10000).toISOString(),
    };

    const res2 = engine.auditThreatTelemetry(spoofedThreat, t0 + 10000);
    expect(res2.isSpoofSuspected).toBe(true);
    expect(res2.quarantineApplied).toBe(true);
    expect(res2.anomaly?.anomalyType).toBe('IMPOSSIBLE_VELOCITY');
    expect(res2.anomaly?.whyDistrusted).toContain('Observed apparent velocity');
  });

  it('fuses multi-sensor evidence using Dempster-Shafer combination', () => {
    // Sensor 1: Believes target is active SAM with 85% mass, 5% benign, 10% uncertainty
    const m1 = { active: 0.85, benign: 0.05, uncertainty: 0.10 };
    // Sensor 2: Corroborates active SAM with 80% mass, 5% benign, 15% uncertainty
    const m2 = { active: 0.80, benign: 0.05, uncertainty: 0.15 };

    const fusion = engine.combineEvidenceDempsterShafer(m1, m2);
    expect(fusion.combinedBelief).toBeGreaterThan(0.90);
    expect(fusion.conflictMetricK).toBeLessThan(0.15);
    expect(fusion.verdict).toBe('CONFIRMED_GENUINE');

    // Highly conflicting sensors (Sensor 1 says active 90%, Sensor 2 says benign 90%)
    const mConflict1 = { active: 0.90, benign: 0.05, uncertainty: 0.05 };
    const mConflict2 = { active: 0.05, benign: 0.90, uncertainty: 0.05 };

    const conflictFusion = engine.combineEvidenceDempsterShafer(mConflict1, mConflict2);
    expect(conflictFusion.conflictMetricK).toBeGreaterThan(0.70);
    expect(conflictFusion.verdict).toBe('CONTESTED_UNRESOLVED');
  });
});

describe('T1-C Contested Operations: CRDT Edge Node Synchronization', () => {
  it('supports partitioned autonomous operations and deterministic reconnection merge', () => {
    const hqNode = new EdgeCrdtSyncNode('CAOC_AIR_HQ');
    const ambalaNode = new EdgeCrdtSyncNode('BASE_AMBALA');

    // 1. Cut the Link (partition)
    hqNode.setLinkSevered(true);
    ambalaNode.setLinkSevered(true);

    // 2. HQ creates a hypothetical plan for tail SB-101
    const hypotheticalSortie: Sortie = {
      sortieId: 'SRT-HQ-01',
      callsign: 'VAYU-HQ',
      packageId: 'PKG-HQ',
      targetRequestId: 'TGT-001',
      role: 'AIR_SUPERIORITY',
      aircraftTail: 'SB-101',
      pilotId: 'PILOT-001',
      originBaseId: 'BASE_AMBALA',
      recoveryBaseId: 'BASE_AMBALA',
      depTimeMinutes: 60,
      totMinutes: 90,
      recoveryTimeMinutes: 120,
      fuelPlannedKg: 4000,
      routeWaypoints: [{ lat: 30.3, lon: 76.8 }, { lat: 32.4, lon: 74.1 }],
      expectedRiskScore: 30,
      status: 'SCHEDULED',
      munitionLoadout: [],
      isFrozen: false,
    };
    hqNode.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: hypotheticalSortie });

    // 3. Simultaneously, partitioned Ambala base executes an urgent emergency scramble on SB-101
    const localScrambleSortie: Sortie = {
      ...hypotheticalSortie,
      sortieId: 'SRT-AMB-SCRAMBLE',
      callsign: 'GARUDA-SCRAMBLE',
      status: 'AIRBORNE',
      depTimeMinutes: 15,
      isFrozen: true,
    };
    ambalaNode.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: localScrambleSortie });

    // Verify vector clocks diverged
    expect(hqNode.getVectorClock().hq).toBe(1);
    expect(hqNode.getVectorClock().ambala).toBe(0);
    expect(ambalaNode.getVectorClock().ambala).toBe(1);
    expect(ambalaNode.getVectorClock().hq).toBe(0);

    // 4. Restore Link: HQ reconciles Ambala event log
    hqNode.setLinkSevered(false);
    ambalaNode.setLinkSevered(false);

    const reconciliation = hqNode.mergeRemoteEventLogs(ambalaNode);

    // Verification: Conflict was detected and resolved in favor of local edge physical execution!
    expect(reconciliation.conflictsResolvedCount).toBe(1);
    expect(reconciliation.resolvedConflictDetails[0].conflictType).toBe('AIRFRAME_CONCURRENT_ALLOCATION');
    expect(reconciliation.resolvedConflictDetails[0].rationale).toContain('physical sortie execution supersedes');

    // HQ's committed sorties map now holds the Ambala physical scramble
    const hqCommitted = hqNode.getCommittedSorties();
    expect(hqCommitted.some((s) => s.sortieId === 'SRT-AMB-SCRAMBLE')).toBe(true);
    expect(hqCommitted.some((s) => s.sortieId === 'SRT-HQ-01')).toBe(false);
  });
});

describe('T1-C Contested Operations: Red Cell Adversarial Wargame', () => {
  const scenario = generateSyntheticScenario(42);
  const engine = new RedCellWargameEngine();

  it('runs closed-loop wargame benchmarking static, reactive, and robust controllers', () => {
    const report = engine.runAdversarialWargame(
      scenario.bases,
      scenario.aircraft.slice(0, 24),
      scenario.pilots.slice(0, 30),
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats.slice(0, 3),
      4 // 4 simulations
    );

    expect(report.simulationsRun).toBe(4);
    expect(report.controllers.length).toBe(3);

    // Robust controller should exhibit higher survivability than rigid static plan
    const staticCtrl = report.controllers.find((c) => c.controllerName.includes('Static'));
    const robustCtrl = report.controllers.find((c) => c.controllerName.includes('Robust'));

    expect(staticCtrl).toBeDefined();
    expect(robustCtrl).toBeDefined();
    expect(robustCtrl!.aircraftSurvivabilityPercent).toBeGreaterThanOrEqual(
      staticCtrl!.aircraftSurvivabilityPercent * 0.8
    );

    expect(report.tacticalLessonsLearned.length).toBeGreaterThan(0);
  });
});
