import {
  Sortie,
  Aircraft,
  Aircrew,
  Airbase,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  haversineDistanceKm,
  MUNITION_CATALOG,
} from '@air-power/shared';

/**
 * Independent Verification Engine for Joint Air Tasking Orders (ATO)
 * Built strictly to MoD / DSSC Operational Constraints Specification.
 *
 * NOTE: This is a standalone verification module completely decoupled
 * from solver heuristic and repair internals. It acts as an impartial auditor.
 */

export interface VerificationAuditResult {
  isFullyCompliant: boolean;
  totalViolations: number;
  violationDetails: string[];
  metrics: {
    sortiesAudited: number;
    multiWaveSortiesCount: number;
    targetsAudited: number;
    fullPackageTargetsCount: number;
    packageIntegrityPercent: number;
  };
  ruleAuditPassed: {
    c1_aircraft_serviceability: boolean;
    c2_aircraft_turnaround_separation: boolean;
    c3_pilot_type_rating: boolean;
    c4_pilot_duty_hours: boolean;
    c5_pilot_fatigue_limits: boolean;
    c6_pilot_turnaround_rest: boolean;
    c7_airbase_runway_open: boolean;
    c8_runway_hourly_capacity: boolean;
    c9_combat_radius_and_range: boolean;
    c10_munition_compatibility_and_stock: boolean;
    c11_time_on_target_window: boolean;
    c12_departure_precedes_tot_and_recovery: boolean;
  };
}

export class IndependentPlanVerifier {
  public verifyPlan(
    sorties: Sortie[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    basesList: Airbase[],
    munitionsStockList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[]
  ): VerificationAuditResult {
    const violations: string[] = [];

    const aircraftMap = new Map(aircraftList.map((a) => [a.tailNumber, a]));
    const pilotMap = new Map(pilotsList.map((p) => [p.id, p]));
    const baseMap = new Map(basesList.map((b) => [b.id, b]));
    const targetMap = new Map(targetsList.map((t) => [t.id, t]));
    const stockAvailable = new Map(munitionsStockList.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));

    // Track rule audit statuses
    const passed = {
      c1_aircraft_serviceability: true,
      c2_aircraft_turnaround_separation: true,
      c3_pilot_type_rating: true,
      c4_pilot_duty_hours: true,
      c5_pilot_fatigue_limits: true,
      c6_pilot_turnaround_rest: true,
      c7_airbase_runway_open: true,
      c8_runway_hourly_capacity: true,
      c9_combat_radius_and_range: true,
      c10_munition_compatibility_and_stock: true,
      c11_time_on_target_window: true,
      c12_departure_precedes_tot_and_recovery: true,
    };

    // 1. Sort sorties by departure time for temporal timeline checks
    const sortedSorties = [...sorties].sort((a, b) => a.depTimeMinutes - b.depTimeMinutes);

    // Multi-wave tracking
    const tailTimeline = new Map<string, Array<{ dep: number; rec: number; id: string }>>();
    const pilotTimeline = new Map<string, Array<{ dep: number; rec: number; id: string }>>();
    const baseHourlyDepartures = new Map<string, number>(); // `${baseId}_${hour}` -> count
    let multiWaveCount = 0;

    for (const sortie of sortedSorties) {
      const ac = aircraftMap.get(sortie.aircraftTail);
      const pilot = pilotMap.get(sortie.pilotId);
      const base = baseMap.get(sortie.originBaseId);
      const target = targetMap.get(sortie.targetRequestId);

      // C1: Aircraft serviceability
      if (!ac) {
        violations.push(`[C1] Tail ${sortie.aircraftTail} does not exist in inventory.`);
        passed.c1_aircraft_serviceability = false;
      } else {
        if (ac.status === 'AOG') {
          violations.push(`[C1] Aircraft ${ac.tailNumber} is grounded (AOG).`);
          passed.c1_aircraft_serviceability = false;
        }
      }

      // C2: Multi-wave turnaround separation
      if (ac) {
        const prevSorties = tailTimeline.get(ac.tailNumber) || [];
        for (const prev of prevSorties) {
          const minSeparation = ac.turnaroundTimeMinutes || 35;
          if (sortie.depTimeMinutes < prev.rec + minSeparation && sortie.recoveryTimeMinutes > prev.dep) {
            violations.push(
              `[C2] Aircraft ${ac.tailNumber} turnaround violation: sortie ${sortie.sortieId} departs at H+${sortie.depTimeMinutes}m but previous sortie ${prev.id} recovers at H+${prev.rec}m (min turnaround: ${minSeparation}m).`
            );
            passed.c2_aircraft_turnaround_separation = false;
          }
        }
        if (prevSorties.length > 0) multiWaveCount++;
        prevSorties.push({ dep: sortie.depTimeMinutes, rec: sortie.recoveryTimeMinutes, id: sortie.sortieId });
        tailTimeline.set(ac.tailNumber, prevSorties);
      }

      // C3: Pilot type rating
      if (!pilot) {
        violations.push(`[C3] Pilot ${sortie.pilotId} does not exist in roster.`);
        passed.c3_pilot_type_rating = false;
      } else if (ac) {
        if (pilot.typeRating !== ac.model) {
          violations.push(
            `[C3] Pilot ${pilot.callsign} rated for ${pilot.typeRating} but assigned to ${ac.model}.`
          );
          passed.c3_pilot_type_rating = false;
        }
      }

      // C4: Pilot duty hours & C5: Pilot fatigue limits
      if (pilot) {
        if (pilot.fatigueScore > 65) {
          violations.push(
            `[C5] Pilot ${pilot.callsign} exceeds maximum allowable fatigue score (${pilot.fatigueScore} > 65).`
          );
          passed.c5_pilot_fatigue_limits = false;
        }
        if (pilot.dutyHoursLast24h > 12) {
          violations.push(
            `[C4] Pilot ${pilot.callsign} duty hours exceed 12h threshold (${pilot.dutyHoursLast24h}h).`
          );
          passed.c4_pilot_duty_hours = false;
        }

        // C6: Pilot turnaround rest between sorties
        const prevPilotSorties = pilotTimeline.get(pilot.id) || [];
        for (const prev of prevPilotSorties) {
          const REQUIRED_REST_MINUTES = 45;
          if (sortie.depTimeMinutes < prev.rec + REQUIRED_REST_MINUTES && sortie.recoveryTimeMinutes > prev.dep) {
            violations.push(
              `[C6] Pilot ${pilot.callsign} assigned successive sorties without mandatory ${REQUIRED_REST_MINUTES}m rest between H+${prev.rec}m and H+${sortie.depTimeMinutes}m.`
            );
            passed.c6_pilot_turnaround_rest = false;
          }
        }
        prevPilotSorties.push({ dep: sortie.depTimeMinutes, rec: sortie.recoveryTimeMinutes, id: sortie.sortieId });
        pilotTimeline.set(pilot.id, prevPilotSorties);
      }

      // C7: Airbase runway status
      if (!base) {
        violations.push(`[C7] Base ${sortie.originBaseId} does not exist.`);
        passed.c7_airbase_runway_open = false;
      } else {
        if (base.currentWeatherStatus === 'CLOSED') {
          violations.push(`[C7] Origin base ${base.name} (${base.icao}) is CLOSED due to sub-minima weather.`);
          passed.c7_airbase_runway_open = false;
        }
      }

      // C8: Runway hourly departure capacity
      if (base) {
        const hour = Math.floor(sortie.depTimeMinutes / 60);
        const slotKey = `${base.id}_${hour}`;
        const count = (baseHourlyDepartures.get(slotKey) || 0) + 1;
        baseHourlyDepartures.set(slotKey, count);
        if (count > base.maxSortiePerHour) {
          violations.push(
            `[C8] Base ${base.name} runway hourly limit exceeded in hour ${hour}: ${count} departures (max: ${base.maxSortiePerHour}).`
          );
          passed.c8_runway_hourly_capacity = false;
        }
      }

      // C9: Combat radius and range
      if (ac && base && target) {
        const roundtripDistKm = haversineDistanceKm(base.location, target.location) * 2;
        if (roundtripDistKm > ac.combatRadiusKm * 2.2) {
          violations.push(
            `[C9] Mission roundtrip distance (${Math.round(roundtripDistKm)}km) exceeds combat radius (${ac.combatRadiusKm * 2}km) without verified refueling.`
          );
          passed.c9_combat_radius_and_range = false;
        }
      }

      // C10: Munition compatibility and base stock non-negativity
      for (const mLoad of sortie.munitionLoadout) {
        const munSpec = MUNITION_CATALOG.find((m) => m.id === mLoad.munitionId);
        if (!munSpec) {
          violations.push(`[C10] Unknown munition ID ${mLoad.munitionId}.`);
          passed.c10_munition_compatibility_and_stock = false;
        } else if (ac && !munSpec.compatibleModels.includes(ac.model)) {
          violations.push(`[C10] Munition ${munSpec.name} is incompatible with ${ac.model} pylons.`);
          passed.c10_munition_compatibility_and_stock = false;
        }

        const stockKey = `${sortie.originBaseId}_${mLoad.munitionId}`;
        const remaining = stockAvailable.get(stockKey) ?? 0;
        if (remaining < mLoad.count) {
          violations.push(
            `[C10] Stock depleted at ${sortie.originBaseId} for ${mLoad.munitionId} (Available: ${remaining}, Required: ${mLoad.count}).`
          );
          passed.c10_munition_compatibility_and_stock = false;
        } else {
          stockAvailable.set(stockKey, remaining - mLoad.count);
        }
      }

      // C11: Time-on-Target window compliance
      if (target) {
        if (sortie.totMinutes < target.totStartMinutes || sortie.totMinutes > target.totEndMinutes) {
          violations.push(
            `[C11] Sortie TOT H+${sortie.totMinutes}m outside target window [H+${target.totStartMinutes}m - H+${target.totEndMinutes}m].`
          );
          passed.c11_time_on_target_window = false;
        }
      }

      // C12: Departure precedes TOT and recovery
      if (sortie.depTimeMinutes >= sortie.totMinutes || sortie.totMinutes >= sortie.recoveryTimeMinutes) {
        violations.push(
          `[C12] Chronological sequencing invalid: Dep (${sortie.depTimeMinutes}m) -> TOT (${sortie.totMinutes}m) -> Rec (${sortie.recoveryTimeMinutes}m).`
        );
        passed.c12_departure_precedes_tot_and_recovery = false;
      }
    }

    // Package Integrity Verification
    const packagesByTarget = new Map<string, Sortie[]>();
    for (const s of sorties) {
      const list = packagesByTarget.get(s.targetRequestId) || [];
      list.push(s);
      packagesByTarget.set(s.targetRequestId, list);
    }

    let fullPackageTargets = 0;
    for (const [targetId, pSorties] of packagesByTarget.entries()) {
      const t = targetMap.get(targetId);
      if (!t) continue;
      const strikes = pSorties.filter((s) => s.role === 'OMNIROLE_STRIKE' || s.role === 'DEEP_PENETRATION_STRIKE').length;
      const sead = pSorties.filter((s) => s.role === 'SEAD_DEAD').length;
      const escorts = pSorties.filter((s) => s.role === 'AIR_SUPERIORITY').length;

      if (
        strikes >= t.requiredPackage.strikeSorties &&
        sead >= t.requiredPackage.seadSorties &&
        escorts >= t.requiredPackage.escortSorties
      ) {
        fullPackageTargets++;
      }
    }

    const packageIntegrityPercent =
      packagesByTarget.size > 0 ? Math.round((fullPackageTargets / packagesByTarget.size) * 100) : 100;

    return {
      isFullyCompliant: violations.length === 0,
      totalViolations: violations.length,
      violationDetails: violations,
      metrics: {
        sortiesAudited: sorties.length,
        multiWaveSortiesCount: multiWaveCount,
        targetsAudited: packagesByTarget.size,
        fullPackageTargetsCount: fullPackageTargets,
        packageIntegrityPercent,
      },
      ruleAuditPassed: passed,
    };
  }
}
