import { describe, it, expect } from 'vitest';
import {
  REASON_CODES,
  getReasonCode,
  mapViolationToReasonCode,
  ReasonCodeEntry,
} from '../src/reason-codes';

describe('Phase 5.3: Reason Codes Catalogue & Coverage Verification', () => {
  it('defines a comprehensive, valid catalogue where every entry has stable plain-English text', () => {
    const entries = Object.values(REASON_CODES);
    expect(entries.length).toBeGreaterThanOrEqual(15);

    for (const entry of entries) {
      expect(entry.code).toBeDefined();
      expect(entry.code.length).toBeGreaterThan(3);
      expect(entry.plainEnglish).toBeDefined();
      expect(entry.plainEnglish.length).toBeGreaterThan(15);
      expect(entry.title).toBeDefined();
      expect(entry.doctrineRule).toBeDefined();
      expect(entry.badgeColor).toHaveProperty('bg');
      expect(entry.badgeColor).toHaveProperty('text');
      expect(entry.badgeColor).toHaveProperty('border');
    }
  });

  it('provides safe fallback for unknown or null reason codes', () => {
    const unknownEntry = getReasonCode('NON_EXISTENT_CODE_XYZ');
    expect(unknownEntry.code).toBe('NON_EXISTENT_CODE_XYZ');
    expect(unknownEntry.plainEnglish).toBeDefined();

    const nullEntry = getReasonCode(null);
    expect(nullEntry.code).toBe('UNCLASSIFIED_CONSTRAINT');
    expect(nullEntry.plainEnglish).toBeDefined();
  });

  it('guarantees that every physical and operational constraint violation path emits a valid reason code', () => {
    const sampleViolations = [
      { text: 'Aircraft tail SB-101 is grounded (AOG: hydraulic leak).', expected: 'AIRFRAME_UNSERVICEABLE' },
      { text: 'Aircraft turnaround window 45 min not satisfied at Base Ambala.', expected: 'TURNAROUND_SLOT_UNAVAILABLE' },
      { text: 'Pilot PLT-04 exceeded maximum 8 cumulative combat flight hours (duty fatigue).', expected: 'CREW_FATIGUE_LIMIT' },
      { text: 'Airbase Uttarlai is CLOSED due to thunderstorm weather minima.', expected: 'RUNWAY_WEATHER_MINIMA' },
      { text: 'Runway interdicted and cratered by hostile precision strike.', expected: 'RUNWAY_INTERDICTED' },
      { text: 'Combat radius of 850 km exceeds unrefueled flight range for LCA Tejas.', expected: 'RANGE_EXCEEDS_RADIUS' },
      { text: 'Requested weapon SCALP-EG munition is incompatible with aircraft pylon.', expected: 'MUNITION_INCOMPATIBLE' },
      { text: 'Munition magazine stock depleted for Spice-2000 at Base Jodhpur.', expected: 'MAGAZINE_STOCK_EXHAUSTED' },
      { text: 'Flight path intersects hostile S-400 MEZ SAM missile envelope.', expected: 'MEZ_ROUTE_DENIED' },
      { text: 'Sortie departure time is later than mandatory target TOT window.', expected: 'TIME_WINDOW_MISMATCH' },
      { text: 'Airspace corridor conflict: 3-minute minimum separation violated.', expected: 'DECONFLICTION_CORRIDOR_BLOCKED' },
    ];

    for (const item of sampleViolations) {
      const code = mapViolationToReasonCode(item.text);
      expect(code).toBe(item.expected);
      expect(REASON_CODES[code]).toBeDefined();
      expect(REASON_CODES[code].plainEnglish.length).toBeGreaterThan(10);
    }
  });

  it('includes positive assignment reason codes for explainable AI', () => {
    expect(REASON_CODES.PRIMARY_STRIKE_MATCH).toBeDefined();
    expect(REASON_CODES.PRIMARY_STRIKE_MATCH.category).toBe('ASSIGNMENT');

    expect(REASON_CODES.FAST_QRA_SCRAMBLE).toBeDefined();
    expect(REASON_CODES.FAST_QRA_SCRAMBLE.category).toBe('ASSIGNMENT');

    expect(REASON_CODES.RESERVE_PRESERVED).toBeDefined();
    expect(REASON_CODES.RESERVE_PRESERVED.category).toBe('ASSIGNMENT');

    expect(REASON_CODES.MIN_RISK_TERRAIN_MASK).toBeDefined();
    expect(REASON_CODES.MIN_RISK_TERRAIN_MASK.category).toBe('ASSIGNMENT');
  });

  it('includes retasking disruption and frozen-zone reason codes', () => {
    expect(REASON_CODES.POPUP_THREAT_DIVERT).toBeDefined();
    expect(REASON_CODES.POPUP_THREAT_DIVERT.category).toBe('RETASKING');

    expect(REASON_CODES.AIRFRAME_AOG_SWAP).toBeDefined();
    expect(REASON_CODES.AIRFRAME_AOG_SWAP.category).toBe('RETASKING');

    expect(REASON_CODES.TST_HIGH_PRIORITY_TASK).toBeDefined();
    expect(REASON_CODES.TST_HIGH_PRIORITY_TASK.category).toBe('RETASKING');

    expect(REASON_CODES.FROZEN_ZONE_LOCKED).toBeDefined();
    expect(REASON_CODES.FROZEN_ZONE_LOCKED.category).toBe('RETASKING');
  });
});
