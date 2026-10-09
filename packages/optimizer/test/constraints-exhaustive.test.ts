import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '@air-power/sim';
import {
  AlnsTacticalOptimizer,
  IndependentPlanVerifier,
} from '../src/index';

describe('Exhaustive 12-Constraint Independent Verification Suite', () => {
  const scenario = generateSyntheticScenario(42);
  const optimizer = new AlnsTacticalOptimizer();
  const verifier = new IndependentPlanVerifier();
  const plan = optimizer.solve(
    scenario.bases,
    scenario.aircraft,
    scenario.pilots,
    scenario.munitionStocks,
    scenario.targetRequests,
    scenario.threats
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

  it('C1: Every assigned aircraft is verified Fully Mission Capable (no AOG)', () => {
    expect(audit.ruleAuditPassed.c1_aircraft_serviceability).toBe(true);
    for (const s of plan.sorties) {
      const plane = scenario.aircraft.find((a) => a.tailNumber === s.aircraftTail);
      expect(plane?.status).toBe('FMC');
    }
  });

  it('C2: Successive multi-wave sorties of the same aircraft respect ground turnaround separation', () => {
    expect(audit.ruleAuditPassed.c2_aircraft_turnaround_separation).toBe(true);
  });

  it('C3: Every pilot type rating strictly matches their aircraft model', () => {
    expect(audit.ruleAuditPassed.c3_pilot_type_rating).toBe(true);
    for (const s of plan.sorties) {
      const pilot = scenario.pilots.find((p) => p.id === s.pilotId);
      const plane = scenario.aircraft.find((a) => a.tailNumber === s.aircraftTail);
      expect(pilot?.typeRating).toBe(plane?.model);
    }
  });

  it('C4: Assigned pilots do not exceed 12 hours continuous duty in 24h', () => {
    expect(audit.ruleAuditPassed.c4_pilot_duty_hours).toBe(true);
  });

  it('C5: Assigned pilots are within safe fatigue thresholds (score <= 65)', () => {
    expect(audit.ruleAuditPassed.c5_pilot_fatigue_limits).toBe(true);
    for (const s of plan.sorties) {
      const pilot = scenario.pilots.find((p) => p.id === s.pilotId);
      expect(pilot?.fatigueScore).toBeLessThanOrEqual(65);
    }
  });

  it('C6: Pilots assigned to multiple waves receive mandatory rest separation', () => {
    expect(audit.ruleAuditPassed.c6_pilot_turnaround_rest).toBe(true);
  });

  it('C7: No sorties depart from bases with sub-minima weather closure', () => {
    expect(audit.ruleAuditPassed.c7_airbase_runway_open).toBe(true);
    for (const s of plan.sorties) {
      const base = scenario.bases.find((b) => b.id === s.originBaseId);
      expect(base?.currentWeatherStatus).not.toBe('CLOSED');
    }
  });

  it('C8: Hourly runway departure limits are never exceeded at any base', () => {
    expect(audit.ruleAuditPassed.c8_runway_hourly_capacity).toBe(true);
  });

  it('C9: Unrefueled mission distance does not exceed combat radius', () => {
    expect(audit.ruleAuditPassed.c9_combat_radius_and_range).toBe(true);
  });

  it('C10: Munition payloads are compatible with airframe hardpoints and stock is non-negative', () => {
    expect(audit.ruleAuditPassed.c10_munition_compatibility_and_stock).toBe(true);
  });

  it('C11: Sortie Time-on-Target aligns with designated target TOT window', () => {
    expect(audit.ruleAuditPassed.c11_time_on_target_window).toBe(true);
    for (const s of plan.sorties) {
      const tgt = scenario.targetRequests.find((t) => t.id === s.targetRequestId);
      expect(s.totMinutes).toBeGreaterThanOrEqual(tgt!.totStartMinutes);
      expect(s.totMinutes).toBeLessThanOrEqual(tgt!.totEndMinutes);
    }
  });

  it('C12: Chronological sequence strictly holds (Departure < TOT < Recovery)', () => {
    expect(audit.ruleAuditPassed.c12_departure_precedes_tot_and_recovery).toBe(true);
    for (const s of plan.sorties) {
      expect(s.depTimeMinutes).toBeLessThan(s.totMinutes);
      expect(s.totMinutes).toBeLessThan(s.recoveryTimeMinutes);
    }
  });

  it('Overall audit confirms total zero hard-constraint violations', () => {
    expect(audit.isFullyCompliant).toBe(true);
    expect(audit.totalViolations).toBe(0);
  });
});
