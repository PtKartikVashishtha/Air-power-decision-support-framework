import { describe, it, expect } from 'vitest';
import {
  DataFusionEngine,
  TacticalStateStore,
  generateSyntheticScenario,
} from '../src/index';

describe('Data Fusion Engine & State Store Testing', () => {
  it('Bayesian temporal decay exponentially decays threat confidence based on time age', () => {
    const fusion = new DataFusionEngine();
    const scenario = generateSyntheticScenario(42);

    // Initial threats
    const initialDecayed = fusion.applyTemporalDecay(scenario.threats, 0);
    expect(initialDecayed[0].confidence).toBeGreaterThan(50);

    // Threat with simulated old lastUpdatedAt timestamp
    const agedThreats = scenario.threats.map((t) => ({
      ...t,
      lastUpdatedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours old
    }));

    const decayed = fusion.applyTemporalDecay(agedThreats, 240);
    for (let i = 0; i < decayed.length; i++) {
      expect(decayed[i].confidence).toBeLessThanOrEqual(agedThreats[i].confidence);
    }
  });

  it('Fusion engine detects operational conflicts between FMC aircraft and closed runways', () => {
    const fusion = new DataFusionEngine();
    const scenario = generateSyntheticScenario(42);

    // Close Base Ambala
    const modifiedBases = scenario.bases.map((b) =>
      b.id === 'BASE_AMBALA' ? { ...b, currentWeatherStatus: 'CLOSED' as const } : b
    );

    const fused = fusion.fuseState(
      10,
      modifiedBases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.threats,
      scenario.airspaceZones,
      scenario.targetRequests,
      []
    );

    expect(fused.activeConflictsCount).toBeGreaterThan(0);
    const conflicts = fusion.getActiveConflicts();
    expect(conflicts.some((c) => c.includes('BASE_AMBALA'))).toBe(true);
  });

  it('State store maintains cryptographic SHA-256 hash chaining across events', () => {
    const store = new TacticalStateStore(42);
    store.recordAudit('COMMANDER', 'APPROVE_ATO', { planId: 'PLAN-001' });
    store.recordAudit('INTEL_ANALYST', 'CONFIRM_SAM_EMISSION', { threatId: 'SAM-01' });

    const auditLog = store.getAuditLog();
    expect(auditLog.length).toBeGreaterThan(2);

    // Verify hash chain
    for (let i = 1; i < auditLog.length; i++) {
      expect(auditLog[i].prevHash).toBe(auditLog[i - 1].hash);
      expect(auditLog[i].hash).toBeDefined();
      expect(auditLog[i].hash.length).toBe(8);
    }
  });

  it('World clock advances simulation time and triggers registered injects', () => {
    const store = new TacticalStateStore(42);
    expect(store.clock.getSimTimeMinutes()).toBe(0);

    // Step clock by 15 minutes
    store.clock.step(15);
    expect(store.clock.getSimTimeMinutes()).toBe(15);

    // At H+15m, SAM pop-up inject at T+10m should have fired
    const fused = store.getFusedPicture();
    expect(fused.threats.some((t) => t.id === 'THREAT_SAM_POPUP_NORTH')).toBe(true);
  });
});
