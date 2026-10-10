import {
  Sortie,
  Aircraft,
  Aircrew,
  Airbase,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  haversineDistanceKm,
  calculateRouteRisk,
  MUNITION_CATALOG,
  AIRCRAFT_MODEL_SPECS,
} from '@air-power/shared';
import { IndependentPlanVerifier } from './independent-verifier';

export interface ConstraintCheckResult {
  isValid: boolean;
  hardViolations: string[];
  softWarnings: string[];
  feasibilityScore: number; // 0..100
}

export class TacticalConstraintEngine {
  /**
   * Validates a single sortie against all physical, operational, and tactical constraints
   */
  public validateSortie(
    sortie: Sortie,
    aircraftMap: Map<string, Aircraft>,
    pilotMap: Map<string, Aircrew>,
    baseMap: Map<string, Airbase>,
    stockMap: Map<string, number>, // key: `${baseId}_${munitionId}`
    targetMap: Map<string, TargetRequest>,
    threats: ThreatIntel[]
  ): ConstraintCheckResult {
    const hardViolations: string[] = [];
    const softWarnings: string[] = [];

    const ac = aircraftMap.get(sortie.aircraftTail);
    const pilot = pilotMap.get(sortie.pilotId);
    const origBase = baseMap.get(sortie.originBaseId);
    const target = targetMap.get(sortie.targetRequestId);

    // 1. Aircraft existence & serviceability
    if (!ac) {
      hardViolations.push(`Aircraft tail ${sortie.aircraftTail} does not exist in inventory.`);
    } else {
      if (ac.status === 'AOG') {
        hardViolations.push(`Aircraft ${ac.tailNumber} is grounded (AOG: ${ac.snagDescription || 'maintenance'}).`);
      }
      if (ac.status === 'TURNAROUND') {
        hardViolations.push(`Aircraft ${ac.tailNumber} is currently in turnaround maintenance.`);
      }
    }

    // 2. Aircrew qualification & duty limits
    if (!pilot) {
      hardViolations.push(`Pilot ${sortie.pilotId} not found in personnel roster.`);
    } else {
      if (ac && pilot.typeRating !== ac.model) {
        hardViolations.push(
          `Pilot ${pilot.callsign} type rating (${pilot.typeRating}) does not match aircraft model (${ac.model}).`
        );
      }
      if (pilot.fatigueScore > 65) {
        hardViolations.push(
          `Pilot ${pilot.callsign} exceeds maximum allowable fatigue limit (Score: ${pilot.fatigueScore}/100 > 65).`
        );
      } else if (pilot.fatigueScore > 50) {
        softWarnings.push(`Pilot ${pilot.callsign} approaching fatigue threshold (${pilot.fatigueScore}/100).`);
      }
      if (pilot.dutyHoursLast24h > 12) {
        hardViolations.push(`Pilot ${pilot.callsign} exceeds mandatory 12-hour crew rest window.`);
      }
    }

    // 3. Airbase operational status
    if (!origBase) {
      hardViolations.push(`Origin airbase ${sortie.originBaseId} does not exist.`);
    } else {
      if (origBase.currentWeatherStatus === 'CLOSED') {
        hardViolations.push(`Origin airbase ${origBase.name} (${origBase.icao}) is CLOSED due to sub-minima weather.`);
      }
    }

    // 4. Combat Radius & Range
    if (ac && target && origBase) {
      const oneWayKm = haversineDistanceKm(origBase.location, target.location);
      const totalMissionDistKm = oneWayKm * 2; // Ingress + Egress
      if (totalMissionDistKm > ac.combatRadiusKm * 2.2) {
        hardViolations.push(
          `Mission distance (${Math.round(totalMissionDistKm)} km) exceeds aircraft unrefueled combat radius (${ac.combatRadiusKm * 2} km). Tanker required.`
        );
      }
    }

    // 5. Munitions Compatibility & Stock Availability
    const loadout = sortie.munitionLoadout || (sortie as any).assignedMunitions || [];
    for (const load of loadout) {
      const munSpec = MUNITION_CATALOG.find((m) => m.id === load.munitionId);
      if (!munSpec) {
        hardViolations.push(`Munition ${load.munitionId} not recognized in catalog.`);
        continue;
      }
      if (ac && !munSpec.compatibleModels.includes(ac.model)) {
        hardViolations.push(`Munition ${munSpec.name} is incompatible with ${ac.model} pylons.`);
      }
      const stockKey = `${sortie.originBaseId}_${load.munitionId}`;
      const available = stockMap.get(stockKey) ?? 0;
      if (available < load.count) {
        hardViolations.push(
          `Base ${sortie.originBaseId} has insufficient stock of ${munSpec.name} (Req: ${load.count}, Avail: ${available}).`
        );
      }
    }

    // 6. Timing & TOT Window
    if (target) {
      if (sortie.totMinutes < target.totStartMinutes || sortie.totMinutes > target.totEndMinutes) {
        hardViolations.push(
          `Sortie TOT (${sortie.totMinutes}m) is outside target window [${target.totStartMinutes}m - ${target.totEndMinutes}m].`
        );
      }
      if (sortie.depTimeMinutes >= sortie.totMinutes) {
        hardViolations.push(`Departure time (${sortie.depTimeMinutes}m) cannot be later than TOT (${sortie.totMinutes}m).`);
      }
    }

    const isValid = hardViolations.length === 0;
    const feasibilityScore = isValid ? Math.max(0, 100 - softWarnings.length * 10) : 0;

    return {
      isValid,
      hardViolations,
      softWarnings,
      feasibilityScore,
    };
  }

  /**
   * Validates an entire Master Plan / COA for package integrity, asset uniqueness, and runway throughput
   */
  public validatePlan(
    sorties: Sortie[],
    aircraft: Aircraft[],
    pilots: Aircrew[],
    bases: Airbase[],
    munitions: MunitionStock[],
    targets: TargetRequest[],
    threats: ThreatIntel[]
  ): {
    totalViolations: number;
    hardViolations: string[];
    packageIntegrityPercent: number;
    overloadedRunways: string[];
  } {
    const verifier = new IndependentPlanVerifier();
    const audit = verifier.verifyPlan(sorties, aircraft, pilots, bases, munitions, targets, threats);
    return {
      totalViolations: audit.totalViolations,
      hardViolations: audit.violationDetails,
      packageIntegrityPercent: audit.metrics.packageIntegrityPercent,
      overloadedRunways: audit.ruleAuditPassed.c8_runway_hourly_capacity ? [] : ['OVERLOADED_RUNWAY'],
    };
  }
}
