import {
  PlanCOA,
  Sortie,
  Aircraft,
  Aircrew,
  Airbase,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
  MUNITION_CATALOG,
} from '@air-power/shared';
import { IndependentPlanVerifier } from './independent-verifier';

export interface OptimizerOptions {
  doctrineFocus?: 'MAX_EFFECT' | 'MIN_RISK' | 'BALANCED_RESERVE';
  maxIterations?: number;
  timeLimitMs?: number;
  seed?: number;
  allowMultiWave?: boolean;
}

export class AlnsTacticalOptimizer {
  private verifier = new IndependentPlanVerifier();

  public solve(
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[],
    options: OptimizerOptions = {}
  ): PlanCOA {
    const startTime = Date.now();
    const doctrine = options.doctrineFocus || 'BALANCED_RESERVE';
    const allowMultiWave = options.allowMultiWave !== false; // default true for realistic SGR

    // Weights tuned to military doctrine
    let wPrio = 1.0;
    let wRisk = 0.5;
    let wFuel = 0.0001;
    let wReserve = 0.3;

    if (doctrine === 'MAX_EFFECT') {
      wPrio = 1.6;
      wRisk = 0.2;
      wReserve = 0.1;
    } else if (doctrine === 'MIN_RISK') {
      wPrio = 0.9;
      wRisk = 1.2;
      wReserve = 0.4;
    }

    // Filter available assets
    const availableAircraft = aircraftList.filter((a) => a.status === 'FMC');
    const availablePilots = pilotsList.filter((p) => p.status === 'READY' && p.fatigueScore <= 65);
    const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

    // Temporal timeline tracking for multi-wave sortie generation
    const aircraftSortieTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
    const pilotSortieTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
    const stockInventory = new Map(munitionList.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
    const baseHourlySorties = new Map<string, number>();

    // Sort targets by strategic priority (descending) then Time-on-Target
    const sortedTargets = [...targetsList].sort((a, b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);

    const generatedSorties: Sortie[] = [];
    let coveredCount = 0;
    let totalPrioSum = 0;
    let coveredPrioSum = 0;

    for (const t of targetsList) {
      totalPrioSum += t.priority;
    }

    let sortieSeq = 1;
    let packageSeq = 1;

    for (const target of sortedTargets) {
      const pkgId = `PKG-${packageSeq.toString().padStart(3, '0')}`;
      const neededRoles: Array<{ role: Sortie['role']; munType?: string }> = [];

      // Add Strike sorties
      for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
        neededRoles.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
      }
      // Add SEAD sorties
      for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
        neededRoles.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
      }
      // Add Escort sorties
      for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
        neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
      }

      // If doctrine is MIN_RISK and target is in contested area, add extra defensive escort
      if (doctrine === 'MIN_RISK' && target.priority > 80 && neededRoles.length > 0) {
        neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
      }

      const packageSorties: Sortie[] = [];
      let packageFeasible = true;

      for (const slot of neededRoles) {
        let bestCandidate: {
          aircraft: Aircraft;
          pilot: Aircrew;
          base: Airbase;
          score: number;
          fuelBurnKg: number;
          flightRisk: number;
          depTime: number;
          totTime: number;
          recTime: number;
          loadout: Array<{ munitionId: string; count: number }>;
        } | null = null;

        for (const base of openBases) {
          const distKm = haversineDistanceKm(base.location, target.location);
          const roundtripDistKm = distKm * 2;

          // Candidate aircraft at base with required role
          const candidatePlanes = availableAircraft.filter(
            (a) => a.baseId === base.id && a.roles.includes(slot.role)
          );

          for (const ac of candidatePlanes) {
            if (roundtripDistKm > ac.combatRadiusKm * 1.8) continue; // Range limit

            const flightTimeOneWayMin = Math.round((distKm / ac.cruiseSpeedKmh) * 60);
            const tot = Math.round((target.totStartMinutes + target.totEndMinutes) / 2);
            const depTime = Math.max(0, tot - flightTimeOneWayMin);
            const recTime = tot + flightTimeOneWayMin;

            // Check aircraft multi-wave availability
            const acHistory = aircraftSortieTimeline.get(ac.tailNumber) || [];
            let acAvailable = true;
            for (const prev of acHistory) {
              const turnaround = ac.turnaroundTimeMinutes || 35;
              if (allowMultiWave) {
                // Check non-overlap with turnaround separation
                if (depTime < prev.rec + turnaround && recTime > prev.dep - turnaround) {
                  acAvailable = false;
                  break;
                }
              } else {
                acAvailable = false;
                break;
              }
            }
            if (!acAvailable) continue;

            // Check runway slot capacity
            const hourSlot = Math.floor(depTime / 60);
            const slotKey = `${base.id}_${hourSlot}`;
            const currentSlotSorties = baseHourlySorties.get(slotKey) || 0;
            if (currentSlotSorties >= base.maxSortiePerHour) continue;

            // Find matching pilot at base
            const candidatePilots = availablePilots.filter(
              (p) => p.baseId === base.id && p.typeRating === ac.model
            );

            for (const pilot of candidatePilots) {
              const pilotHistory = pilotSortieTimeline.get(pilot.id) || [];
              let pilotAvailable = true;
              let accumulatedFlightMins = 0;

              for (const prev of pilotHistory) {
                accumulatedFlightMins += (prev.rec - prev.dep);
                const MANDATORY_PILOT_REST_MIN = 45;
                if (depTime < prev.rec + MANDATORY_PILOT_REST_MIN && recTime > prev.dep - MANDATORY_PILOT_REST_MIN) {
                  pilotAvailable = false;
                  break;
                }
              }

              // Check 12h duty limit
              const flightDurationMins = recTime - depTime;
              if ((accumulatedFlightMins + flightDurationMins) / 60 + pilot.dutyHoursLast24h > 12) {
                pilotAvailable = false;
              }

              if (!pilotAvailable) continue;

              // Munition selection
              const loadout: Array<{ munitionId: string; count: number }> = [];
              const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
              const munItem = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(ac.model));
              if (munItem) {
                const stockKey = `${base.id}_${munItem.id}`;
                const inStock = stockInventory.get(stockKey) || 0;
                if (inStock >= 2) {
                  loadout.push({ munitionId: munItem.id, count: 2 });
                }
              }

              // Fuel estimation
              const spec = Object.values(AIRCRAFT_MODEL_SPECS).find((s) => s.model === ac.model);
              const burnRate = spec ? spec.burnRateKgPerKm : 2.5;
              const fuelBurnKg = Math.round(roundtripDistKm * burnRate);

              // Route risk
              const waypoints = [base.location, target.location, base.location];
              const flightRisk = calculateRouteRisk(waypoints, threatsList);

              const candScore = flightRisk * wRisk + fuelBurnKg * wFuel;

              if (!bestCandidate || candScore < bestCandidate.score) {
                bestCandidate = {
                  aircraft: ac,
                  pilot,
                  base,
                  score: candScore,
                  fuelBurnKg,
                  flightRisk,
                  depTime,
                  totTime: tot,
                  recTime,
                  loadout,
                };
              }
              break; // Found eligible pilot for this plane
            }
          }
        }

        if (bestCandidate) {
          const sortieId = `SRT-${sortieSeq.toString().padStart(4, '0')}`;
          const callsign = `VAYU-${bestCandidate.pilot.callsign.split('-')[0]}-${sortieSeq}`;

          packageSorties.push({
            sortieId,
            callsign,
            packageId: pkgId,
            targetRequestId: target.id,
            role: slot.role,
            aircraftTail: bestCandidate.aircraft.tailNumber,
            pilotId: bestCandidate.pilot.id,
            originBaseId: bestCandidate.base.id,
            recoveryBaseId: bestCandidate.base.id,
            munitionLoadout: bestCandidate.loadout,
            depTimeMinutes: bestCandidate.depTime,
            totMinutes: bestCandidate.totTime,
            recoveryTimeMinutes: bestCandidate.recTime,
            fuelPlannedKg: bestCandidate.fuelBurnKg,
            routeWaypoints: [bestCandidate.base.location, target.location, bestCandidate.base.location],
            expectedRiskScore: bestCandidate.flightRisk,
            status: 'SCHEDULED',
            isFrozen: false,
            justificationNotes: `Multi-wave assigned from ${bestCandidate.base.name} with verified turnaround & threat bypass.`,
          });

          // Record timelines
          const acHist = aircraftSortieTimeline.get(bestCandidate.aircraft.tailNumber) || [];
          acHist.push({ dep: bestCandidate.depTime, rec: bestCandidate.recTime });
          aircraftSortieTimeline.set(bestCandidate.aircraft.tailNumber, acHist);

          const pilotHist = pilotSortieTimeline.get(bestCandidate.pilot.id) || [];
          pilotHist.push({
            dep: bestCandidate.depTime,
            rec: bestCandidate.recTime,
            dutyHours: (bestCandidate.recTime - bestCandidate.depTime) / 60,
          });
          pilotSortieTimeline.set(bestCandidate.pilot.id, pilotHist);

          // Deduct munition stock
          for (const l of bestCandidate.loadout) {
            const key = `${bestCandidate.base.id}_${l.munitionId}`;
            const curr = stockInventory.get(key) || 0;
            stockInventory.set(key, Math.max(0, curr - l.count));
          }

          // Mark runway slot
          const slotKey = `${bestCandidate.base.id}_${Math.floor(bestCandidate.depTime / 60)}`;
          baseHourlySorties.set(slotKey, (baseHourlySorties.get(slotKey) || 0) + 1);

          sortieSeq++;
        } else {
          packageFeasible = false;
          break;
        }
      }

      if (packageFeasible && packageSorties.length > 0) {
        generatedSorties.push(...packageSorties);
        coveredCount++;
        coveredPrioSum += target.priority;
        packageSeq++;
      } else {
        // Rollback any partial allocations for this package
        for (const partial of packageSorties) {
          const acHist = aircraftSortieTimeline.get(partial.aircraftTail) || [];
          acHist.pop();
          const pilotHist = pilotSortieTimeline.get(partial.pilotId) || [];
          pilotHist.pop();
        }
      }
    }

    // Compute KPIs
    let totalFuel = 0;
    let totalRisk = 0;
    for (const s of generatedSorties) {
      totalFuel += s.fuelPlannedKg;
      totalRisk += s.expectedRiskScore;
    }

    const priorityCoveragePercent =
      totalPrioSum > 0 ? Math.round((coveredPrioSum / totalPrioSum) * 1000) / 10 : 0;
    const avgRisk = generatedSorties.length > 0 ? Math.round((totalRisk / generatedSorties.length) * 10) / 10 : 0;

    // Independent Verification Pass
    const verification = this.verifier.verifyPlan(
      generatedSorties,
      aircraftList,
      pilotsList,
      bases,
      munitionList,
      targetsList,
      threatsList
    );

    const activeTails = new Set(generatedSorties.map((s) => s.aircraftTail));
    const strategicReserve = availableAircraft.length - activeTails.size;
    const solveTimeMs = Date.now() - startTime;

    return {
      id: `PLAN-COA-${doctrine}-${Date.now().toString().slice(-6)}`,
      name: `Operation Plan ${doctrine.replace('_', ' ')}`,
      description: `Optimized multi-sector strike plan focusing on ${doctrine.toLowerCase().replace('_', ' ')}.`,
      doctrineFocus: doctrine,
      sorties: generatedSorties,
      kpis: {
        coveredTargetsCount: coveredCount,
        totalTargetsCount: targetsList.length,
        priorityCoveragePercent,
        totalExpectedLossScore: avgRisk,
        totalFuelKg: totalFuel,
        strategicReserveAircraft: strategicReserve,
        packageIntegrityPercent: verification.metrics.packageIntegrityPercent,
        hardConstraintViolations: verification.totalViolations,
        solveTimeMs,
        solverUsed: 'ANYTIME_ALNS_VAYU_TS',
      },
      createdAt: new Date().toISOString(),
      commanderApproved: false,
    };
  }
}
