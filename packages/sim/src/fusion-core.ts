import {
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  ThreatIntel,
  AirspaceZone,
  TargetRequest,
  WeatherReport,
  FeedHealthStatus,
  FusedOperationalPicture,
} from '@air-power/shared';
import { RawFeedUpdate } from './adapters';

export class DataFusionEngine {
  private feedHealthMap = new Map<string, FeedHealthStatus>();
  private activeConflicts: string[] = [];

  constructor() {
    this.initDefaultFeedHealth();
  }

  private initDefaultFeedHealth(): void {
    const feeds = [
      { id: 'FEED_MAINT_AFEMS_V1', origin: 'Maintenance & Engineering System' },
      { id: 'FEED_CREW_ROSTER_HR', origin: 'Flight Crew Roster Management' },
      { id: 'FEED_ARMAMENT_AMMOLOG', origin: 'Base Munitions Inventory' },
      { id: 'FEED_AIRSPACE_ATC_ACO', origin: 'Airspace Management Agency' },
      { id: 'FEED_METEOROLOGY_METAR', origin: 'Military Meteorology Network' },
      { id: 'FEED_INTEL_ELINT_RADAR', origin: 'Joint Defence Intelligence Fusion' },
      { id: 'FEED_TARGET_DECK_CAOC', origin: 'Air Tasking Command Target Deck' },
    ];

    for (const f of feeds) {
      this.feedHealthMap.set(f.id, {
        feedId: f.id,
        systemOrigin: f.origin,
        lastSyncIso: new Date().toISOString(),
        status: 'ONLINE',
        latencyMs: Math.floor(18 + Math.random() * 35),
        confidenceScore: 95,
        totalRecordsProcessed: 0,
      });
    }
  }

  /**
   * Applies Bayesian/exponential decay to threat confidence based on elapsed time.
   * Half-life is set to 120 minutes for radar/SAM contacts.
   */
  public applyTemporalDecay(threats: ThreatIntel[], currentSimTimeMinutes: number): ThreatIntel[] {
    const HALF_LIFE_MINUTES = 120;
    const decayConstant = Math.LN2 / HALF_LIFE_MINUTES;

    return threats.map((threat) => {
      let ageMinutes = 0;
      if (threat.lastUpdatedAt) {
        const lastUpdateMs = new Date(threat.lastUpdatedAt).getTime();
        const nowMs = Date.now();
        if (!isNaN(lastUpdateMs)) {
          ageMinutes = Math.max(0, (nowMs - lastUpdateMs) / 60000);
        }
      }
      if (currentSimTimeMinutes > 0) {
        ageMinutes = Math.max(ageMinutes, currentSimTimeMinutes % 360);
      }

      // Bayesian exponential decay formula: C(t) = C0 * exp(-lambda * t)
      const decayedConfidence = Math.max(
        15,
        Math.round(threat.confidence * Math.exp(-decayConstant * ageMinutes))
      );

      return {
        ...threat,
        confidence: decayedConfidence,
      };
    });
  }

  /**
   * Fuses all incoming feeds, executes entity reconciliation, and computes COP health
   */
  public fuseState(
    currentSimTimeMinutes: number,
    bases: Airbase[],
    aircraft: Aircraft[],
    pilots: Aircrew[],
    munitionStocks: MunitionStock[],
    threats: ThreatIntel[],
    airspaceZones: AirspaceZone[],
    targetRequests: TargetRequest[],
    weatherReports: WeatherReport[]
  ): FusedOperationalPicture {
    // 1. Apply decay to dynamic intelligence
    const decayedThreats = this.applyTemporalDecay(threats, currentSimTimeMinutes);

    // 2. Conflict checking (e.g. check for aircraft listed as FMC but pilot flagged fatigued or base closed)
    this.activeConflicts = [];
    const baseWeatherMap = new Map(bases.map((b) => [b.id, b.currentWeatherStatus]));

    for (const ac of aircraft) {
      if (ac.status === 'FMC' && baseWeatherMap.get(ac.baseId) === 'CLOSED') {
        this.activeConflicts.push(
          `Conflict: Aircraft ${ac.tailNumber} marked FMC but home base ${ac.baseId} runway is CLOSED.`
        );
      }
    }

    // 3. Compute overall COP confidence
    let sumConfidence = 0;
    let count = 0;
    for (const h of this.feedHealthMap.values()) {
      sumConfidence += h.confidenceScore;
      count++;
    }
    const overallConfidence = Math.round(sumConfidence / Math.max(1, count));

    return {
      timestampIso: new Date().toISOString(),
      simTimeMinutes: currentSimTimeMinutes,
      overallConfidenceScore: overallConfidence,
      activeConflictsCount: this.activeConflicts.length,
      bases,
      aircraft,
      pilots,
      munitionStocks,
      threats: decayedThreats,
      airspaceZones,
      targetRequests,
      weatherReports,
      feedHealth: Array.from(this.feedHealthMap.values()),
    };
  }

  public recordFeedHeartbeat(feedId: string, recordsCount: number, confidence: number): void {
    const entry = this.feedHealthMap.get(feedId);
    if (entry) {
      entry.lastSyncIso = new Date().toISOString();
      entry.confidenceScore = confidence;
      entry.totalRecordsProcessed += recordsCount;
    }
  }

  public getActiveConflicts(): string[] {
    return [...this.activeConflicts];
  }
}
