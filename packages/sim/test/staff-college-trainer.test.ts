import { describe, it, expect } from 'vitest';
import {
  StaffCollegeTrainerEngine,
  AfterActionReviewEngine,
  generateSyntheticScenario,
} from '../src';
import { Sortie } from '@air-power/shared';

describe('T1-D Staff-College Trainer & After-Action Review Suite', () => {
  const scenario = generateSyntheticScenario(42);

  it('evaluates student plan with SEAD missing and SGR violation, assigning appropriate penalty critiques', () => {
    const trainer = new StaffCollegeTrainerEngine();

    // Create a student plan with intentional doctrine flaws:
    // 1. Strike sortie without SEAD
    // 2. Airframe SB-101 turnaround violation (< 45 min)
    const flawedSorties: Sortie[] = [
      {
        id: 'SRT-FLAW-01',
        callsign: 'TIGER-01',
        packageId: 'PKG-01',
        targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'SB-101',
        pilotId: 'PILOT-01',
        originBaseId: 'BASE_JODHPUR',
        recoveryBaseId: 'BASE_JODHPUR',
        depTimeMinutes: 60,
        totMinutes: 90,
        recoveryTimeMinutes: 120,
        status: 'SCHEDULED',
        expectedRiskScore: 65,
        fuelPlannedKg: 4500,
        munitionLoadout: [],
        routeWaypoints: [scenario.bases[0].location, scenario.targetRequests[0].location],
        isFrozen: false,
      },
      {
        id: 'SRT-FLAW-02',
        callsign: 'TIGER-02',
        packageId: 'PKG-02',
        targetRequestId: scenario.targetRequests[1]?.id || 'TGT-002',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'SB-101', // Same airframe!
        pilotId: 'PILOT-02',
        originBaseId: 'BASE_JODHPUR',
        recoveryBaseId: 'BASE_JODHPUR',
        depTimeMinutes: 135, // Only 15 mins after recovery (120 min), breaching 45 min minimum!
        totMinutes: 165,
        recoveryTimeMinutes: 195,
        status: 'SCHEDULED',
        expectedRiskScore: 70,
        fuelPlannedKg: 4500,
        munitionLoadout: [],
        routeWaypoints: [scenario.bases[0].location, scenario.targetRequests[1].location],
        isFrozen: false,
      },
    ];

    const report = trainer.gradePlan(flawedSorties, {
      bases: scenario.bases,
      aircraft: scenario.aircraft,
      pilots: scenario.pilots,
      munitionStocks: scenario.munitionStocks,
      threats: scenario.threats,
      targetRequests: scenario.targetRequests,
    });

    expect(report.studentScore).toBeLessThan(80);
    expect(['B', 'C', 'D', 'F']).toContain(report.letterGrade);
    expect(report.critiques.length).toBeGreaterThan(0);

    const seadCritique = report.critiques.find((c) => c.category === 'SEAD_SYNCHRONIZATION');
    expect(seadCritique).toBeDefined();
    expect(seadCritique?.severity).toBe('CRITICAL');

    const sgrCritique = report.critiques.find((c) => c.category === 'SGR_TURNAROUND_TIMING');
    expect(sgrCritique).toBeDefined();
    expect(sgrCritique?.critique).toContain('Airframe requires minimum');
  });

  it('awards high grade (A/A+) to sound, synchronized operational plan with SEAD escort and valid turnarounds', () => {
    const trainer = new StaffCollegeTrainerEngine();

    const soundSorties: Sortie[] = [
      // SEAD Escort arriving at T+85m
      {
        id: 'SRT-SEAD-01',
        callsign: 'GARUDA-SEAD',
        packageId: 'PKG-SYNC',
        targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
        role: 'SEAD_DEAD',
        aircraftTail: 'RB-101',
        pilotId: 'PILOT-01',
        originBaseId: 'BASE_AMBALA',
        recoveryBaseId: 'BASE_AMBALA',
        depTimeMinutes: 55,
        totMinutes: 85,
        recoveryTimeMinutes: 115,
        status: 'SCHEDULED',
        expectedRiskScore: 22,
        fuelPlannedKg: 3800,
        munitionLoadout: [],
        routeWaypoints: [],
        isFrozen: false,
      },
      // Strike arriving at T+90m (within 5 min of SEAD!)
      {
        id: 'SRT-STRIKE-01',
        callsign: 'VAJRA-STRIKE',
        packageId: 'PKG-SYNC',
        targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'SB-101',
        pilotId: 'PILOT-02',
        originBaseId: 'BASE_JODHPUR',
        recoveryBaseId: 'BASE_JODHPUR',
        depTimeMinutes: 60,
        totMinutes: 90,
        recoveryTimeMinutes: 120,
        status: 'SCHEDULED',
        expectedRiskScore: 25,
        fuelPlannedKg: 4200,
        munitionLoadout: [],
        routeWaypoints: [],
        isFrozen: false,
      },
    ];

    const report = trainer.gradePlan(soundSorties, {
      bases: scenario.bases,
      aircraft: scenario.aircraft,
      pilots: scenario.pilots,
      munitionStocks: scenario.munitionStocks,
      threats: scenario.threats,
      targetRequests: scenario.targetRequests,
    });

    expect(report.studentScore).toBeGreaterThanOrEqual(88);
    expect(['A+', 'A']).toContain(report.letterGrade);
    expect(report.metrics.seadCoveredStrikeRatio).toBe(100);
    expect(report.metrics.turnaroundViolationsCount).toBe(0);
  });

  it('runs After-Action Review branching simulation and computes counterfactual deltas', () => {
    const aar = new AfterActionReviewEngine();
    const timeline = aar.getCampaignTimelineEvents();

    expect(timeline.length).toBeGreaterThanOrEqual(4);

    // Branch what-if on Event 2 (Popup SAM) with early retasking
    const branch = aar.simulateBranchWhatIf('EVT-02', 'EARLY_RETASK_15M');

    expect(branch.comparison.counterfactualLosses).toBe(0);
    expect(branch.comparison.lossesDelta).toBe(-1); // 1 airframe saved
    expect(branch.comparison.riskReductionPercent).toBeGreaterThan(50);
    expect(branch.pedagogicalTakeaway).toContain('Pir Panjal mountain ridge');

    const htmlReport = aar.generatePrintableAarHtml();
    expect(htmlReport).toContain('Formal After-Action Review (AAR)');
    expect(htmlReport).toContain('EARLY RETASKING ADVANTAGE');
  });
});
