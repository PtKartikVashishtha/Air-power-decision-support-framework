import {
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  ThreatIntel,
  AirspaceZone,
  TargetRequest,
  WeatherReport,
  TacticalInject,
  PlanCOA,
  FusedOperationalPicture,
} from '@air-power/shared';
import { generateSyntheticScenario } from './synthetic-data';
import { DataFusionEngine } from './fusion-core';
import { WorldClock } from './world-clock';

export interface AuditEventRecord {
  index: number;
  timestampIso: string;
  simTimeMinutes: number;
  actorRole: string;
  action: string;
  details: Record<string, any>;
  prevHash: string;
  hash: string;
}

// Simple deterministic hash helper for browser/node
function computeRecordHash(data: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export class TacticalStateStore {
  public clock: WorldClock;
  public fusionEngine: DataFusionEngine;

  private bases: Airbase[] = [];
  private aircraft: Aircraft[] = [];
  private pilots: Aircrew[] = [];
  private munitionStocks: MunitionStock[] = [];
  private threats: ThreatIntel[] = [];
  private airspaceZones: AirspaceZone[] = [];
  private targetRequests: TargetRequest[] = [];
  private weatherReports: WeatherReport[] = [];

  private currentPlan: PlanCOA | null = null;
  private alternativeCOAs: PlanCOA[] = [];
  private injectQueue: TacticalInject[] = [];
  private processedInjects: TacticalInject[] = [];

  private auditLog: AuditEventRecord[] = [];
  private stateSnapshots: Array<{ simTimeMinutes: number; picture: FusedOperationalPicture }> = [];

  constructor(seed = 42) {
    this.clock = new WorldClock(0);
    this.fusionEngine = new DataFusionEngine();
    this.initializeScenario(seed);
    this.initDefaultInjects();

    // Hook clock progression
    this.clock.subscribe((simTime, _delta) => {
      this.evaluateInjectsAtTime(simTime);
      this.capturePeriodicSnapshot(simTime);
    });
  }

  public initializeScenario(seed = 42): void {
    const data = generateSyntheticScenario(seed);
    this.bases = data.bases;
    this.aircraft = data.aircraft;
    this.pilots = data.pilots;
    this.munitionStocks = data.munitionStocks;
    this.threats = data.threats;
    this.airspaceZones = data.airspaceZones;
    this.targetRequests = data.targetRequests;

    // Generate weather for bases
    this.weatherReports = this.bases.map((b) => ({
      baseOrZoneId: b.id,
      timestamp: new Date().toISOString(),
      visibilityKm: b.weatherMinimaVisibilityKm * 4,
      cloudCeilingFt: 4500,
      windSpeedKnots: 12,
      windDirectionDeg: 270,
      icingRisk: 'NONE',
      turbulenceRisk: 'NONE',
      flightCategory: 'VMC',
    }));

    this.recordAudit('SYSTEM', 'SCENARIO_INITIALIZED', { seed, aircraftCount: this.aircraft.length });
  }

  private initDefaultInjects(): void {
    this.injectQueue = [
      {
        id: 'INJ-001',
        type: 'SAM_POPUP',
        simTimeMinutes: 10,
        title: 'Tactical SAM Pop-up in Sector North Corridor',
        description: 'New mobile HQ-16 class radar emission detected overlapping Route Alpha at 31.6N 74.8E.',
        payload: {
          threatId: 'THREAT_SAM_POPUP_NORTH',
          name: 'Mobile High-Threat SAM HQ-16 Battery',
          lat: 31.62,
          lon: 74.85,
          engagementRadiusKm: 65,
          lethalityScore: 88,
        },
        acknowledged: false,
      },
      {
        id: 'INJ-002',
        type: 'BASE_WEATHER_CLOSURE',
        simTimeMinutes: 25,
        title: 'Severe Weather Inversion at Forward Base Ambala',
        description: 'Visibility at VIAM has plummeted to 0.4 km with zero-zero ceiling. Runway closure ordered.',
        payload: {
          baseId: 'BASE_AMBALA',
          newVisibilityKm: 0.4,
          newCeilingFt: 150,
          status: 'CLOSED',
        },
        acknowledged: false,
      },
      {
        id: 'INJ-003',
        type: 'AIRCRAFT_AOG_SNAG',
        simTimeMinutes: 40,
        title: 'Strike Lead Rafale (RB-101) Main Radar Snag',
        description: 'RBE2 AESA radar transmitter trip during taxi; airframe declared AOG.',
        payload: {
          tailNumber: 'RB-101',
          snag: 'Radar Transmitter Trip / AOG',
        },
        acknowledged: false,
      },
      {
        id: 'INJ-004',
        type: 'NEW_HIGH_VALUE_TST',
        simTimeMinutes: 55,
        title: 'Time-Sensitive Target: Mobile High-Value Command Convoy',
        description: 'Adversary Corps HQ staff convoy stationary at grid 30.82N 73.15E. Fleeting 25-minute window!',
        payload: {
          targetId: 'TST-099',
          name: 'Moving Command & Comms Convoy (TST)',
          lat: 30.82,
          lon: 73.15,
          priority: 99,
          totWindowMinutes: [65, 90],
          isTimeSensitive: true,
        },
        acknowledged: false,
      },
    ];
  }

  public getFusedPicture(): FusedOperationalPicture {
    return this.fusionEngine.fuseState(
      this.clock.getSimTimeMinutes(),
      this.bases,
      this.aircraft,
      this.pilots,
      this.munitionStocks,
      this.threats,
      this.airspaceZones,
      this.targetRequests,
      this.weatherReports
    );
  }

  public getPendingInjects(): TacticalInject[] {
    return this.injectQueue.filter((i) => !i.acknowledged);
  }

  public getAuditLog(): AuditEventRecord[] {
    return [...this.auditLog];
  }

  public getCurrentPlan(): PlanCOA | null {
    return this.currentPlan;
  }

  public setCurrentPlan(plan: PlanCOA): void {
    this.currentPlan = plan;
    this.recordAudit('PLANNER', 'PLAN_COMMITTED', {
      planId: plan.id,
      name: plan.name,
      sortiesCount: plan.sorties.length,
      kpis: plan.kpis,
    });
  }

  public getAlternativeCOAs(): PlanCOA[] {
    return [...this.alternativeCOAs];
  }

  public setAlternativeCOAs(coas: PlanCOA[]): void {
    this.alternativeCOAs = coas;
  }

  /**
   * Applies a tactical inject to mutable world state
   */
  public applyInject(inject: TacticalInject): void {
    inject.acknowledged = true;
    this.processedInjects.push(inject);

    if (inject.type === 'SAM_POPUP') {
      const p = inject.payload;
      this.threats.push({
        id: p.threatId,
        name: p.name,
        type: 'MEDIUM_RANGE_SAM',
        location: { lat: p.lat, lon: p.lon, altM: 300 },
        detectionRadiusKm: p.engagementRadiusKm * 1.8,
        engagementRadiusKm: p.engagementRadiusKm,
        lethalityScore: p.lethalityScore,
        confidence: 95,
        sourceSystem: 'AIRBORNE_RECCE_CONFIRMED',
        firstDetectedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        active: true,
      });
    } else if (inject.type === 'BASE_WEATHER_CLOSURE') {
      const base = this.bases.find((b) => b.id === inject.payload.baseId);
      if (base) {
        base.currentWeatherStatus = 'CLOSED';
        const wReport = this.weatherReports.find((w) => w.baseOrZoneId === base.id);
        if (wReport) {
          wReport.flightCategory = 'BELOW_MINIMA';
          wReport.visibilityKm = inject.payload.newVisibilityKm;
          wReport.cloudCeilingFt = inject.payload.newCeilingFt;
        }
      }
    } else if (inject.type === 'AIRCRAFT_AOG_SNAG') {
      const ac = this.aircraft.find((a) => a.tailNumber === inject.payload.tailNumber);
      if (ac) {
        ac.status = 'AOG';
        ac.snagDescription = inject.payload.snag;
      }
    } else if (inject.type === 'NEW_HIGH_VALUE_TST') {
      const p = inject.payload;
      this.targetRequests.unshift({
        id: p.targetId,
        name: p.name,
        category: 'TIME_SENSITIVE_TARGET_CONVOY',
        location: { lat: p.lat, lon: p.lon, altM: 200 },
        priority: p.priority,
        totStartMinutes: p.totWindowMinutes[0],
        totEndMinutes: p.totWindowMinutes[1],
        requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 2, tankerSorties: 0 },
        desiredMunitions: ['PRECISION_GUIDED_BOMB'],
        minMunitionsCount: 4,
        isTimeSensitive: true,
        status: 'PENDING',
      });
    }

    this.recordAudit('SIMULATION_INJECT', inject.type, {
      injectId: inject.id,
      title: inject.title,
      payload: inject.payload,
    });
  }

  private evaluateInjectsAtTime(simTimeMinutes: number): void {
    for (const inject of this.injectQueue) {
      if (!inject.acknowledged && simTimeMinutes >= inject.simTimeMinutes) {
        this.applyInject(inject);
      }
    }
  }

  private capturePeriodicSnapshot(simTimeMinutes: number): void {
    if (this.stateSnapshots.length === 0 || simTimeMinutes - this.stateSnapshots[this.stateSnapshots.length - 1].simTimeMinutes >= 5) {
      this.stateSnapshots.push({
        simTimeMinutes,
        picture: this.getFusedPicture(),
      });
      if (this.stateSnapshots.length > 200) {
        this.stateSnapshots.shift();
      }
    }
  }

  public recordAudit(actorRole: string, action: string, details: Record<string, any>): void {
    const prevHash = this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1].hash : 'GENESIS_00000000';
    const index = this.auditLog.length + 1;
    const timestampIso = new Date().toISOString();
    const rawData = `${index}:${timestampIso}:${actorRole}:${action}:${JSON.stringify(details)}:${prevHash}`;
    const hash = computeRecordHash(rawData);

    this.auditLog.push({
      index,
      timestampIso,
      simTimeMinutes: this.clock.getSimTimeMinutes(),
      actorRole,
      action,
      details,
      prevHash,
      hash,
    });
  }
}
