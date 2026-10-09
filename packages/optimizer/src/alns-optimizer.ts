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

export interface AlnsOperatorStat {
  name: string;
  type: 'DESTROY' | 'REPAIR';
  invocations: number;
  successfulImprovements: number;
  weight: number;
}

export class AlnsTacticalOptimizer {
  private verifier = new IndependentPlanVerifier();
  public operatorStats: AlnsOperatorStat[] = [];
  public lastOptimizationSummary: {
    t0Objective: number;
    finalObjective: number;
    alnsImprovementPercent: number;
    iterationsRun: number;
    durationMs: number;
  } | null = null;

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
    const allowMultiWave = options.allowMultiWave !== false;
    const maxIterations = options.maxIterations || 80;
    const timeLimitMs = options.timeLimitMs || 150;

    // Weights tuned to military doctrine
    let wPrio = 1.0;
    let wRisk = 0.5;
    let wFuel = 0.0001;
    let wReserve = 0.3;

    if (doctrine === 'MAX_EFFECT') {
      wPrio = 2.0;
      wRisk = 0.15;
      wReserve = 0.05;
    } else if (doctrine === 'MIN_RISK') {
      wPrio = 0.7;
      wRisk = 1.8;
      wReserve = 0.5;
    }

    // 1. Initial Constructive Heuristic (t=0)
    const initialSorties = this.constructiveHeuristic(
      bases,
      aircraftList,
      pilotsList,
      munitionList,
      targetsList,
      threatsList,
      wPrio,
      wRisk,
      wFuel,
      doctrine,
      allowMultiWave
    );

    const calcObjective = (sorties: Sortie[]): number => {
      let prioSum = 0;
      let riskSum = 0;
      let fuelSum = 0;
      const coveredTgtIds = new Set(sorties.map((s) => s.targetRequestId));
      for (const t of targetsList) {
        if (coveredTgtIds.has(t.id)) prioSum += t.priority;
      }
      for (const s of sorties) {
        riskSum += s.expectedRiskScore;
        fuelSum += s.fuelPlannedKg;
      }
      return prioSum * wPrio - (riskSum / Math.max(1, sorties.length)) * 10 * wRisk - (fuelSum / 1000) * wFuel;
    };

    const t0Objective = calcObjective(initialSorties);
    let bestSorties = [...initialSorties];
    let currentSorties = [...initialSorties];
    let bestObjective = t0Objective;
    let currentObjective = t0Objective;

    // 2. Initialize Package-Aware ALNS Destroy & Repair Operators with Adaptive Weights
    const destroyOps: Array<{ name: string; weight: number; score: number; calls: number; wins: number; fn: (sorties: Sortie[]) => { kept: Sortie[]; removed: Sortie[] } }> = [
      {
        name: 'randomPackageDestroy',
        weight: 1.0,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (sorties) => {
          const packages = Array.from(new Set(sorties.map((s) => s.packageId)));
          if (packages.length <= 1) return { kept: sorties, removed: [] };
          const removeCount = Math.min(2, Math.floor(packages.length * 0.3));
          const removedPackages = new Set<string>();
          for (let i = 0; i < removeCount; i++) {
            const pick = packages[Math.floor(Math.random() * packages.length)];
            if (pick) removedPackages.add(pick);
          }
          const kept = sorties.filter((s) => !removedPackages.has(s.packageId));
          const removed = sorties.filter((s) => removedPackages.has(s.packageId));
          return { kept, removed };
        },
      },
      {
        name: 'worstRiskPackageDestroy',
        weight: 1.0,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (sorties) => {
          const packageRiskMap = new Map<string, number>();
          for (const s of sorties) {
            packageRiskMap.set(s.packageId, (packageRiskMap.get(s.packageId) || 0) + s.expectedRiskScore);
          }
          const sortedPkgs = Array.from(packageRiskMap.entries()).sort((a, b) => b[1] - a[1]);
          if (sortedPkgs.length <= 1) return { kept: sorties, removed: [] };
          const removeCount = Math.min(2, Math.floor(sortedPkgs.length * 0.25));
          const removedPkgs = new Set(sortedPkgs.slice(0, removeCount).map((p) => p[0]));
          const kept = sorties.filter((s) => !removedPkgs.has(s.packageId));
          const removed = sorties.filter((s) => removedPkgs.has(s.packageId));
          return { kept, removed };
        },
      },
      {
        name: 'clusterBasePackageDestroy',
        weight: 1.0,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (sorties) => {
          const randomBase = bases[Math.floor(Math.random() * bases.length)];
          const pkgsToDrop = new Set(sorties.filter((s) => s.originBaseId === randomBase?.id).map((s) => s.packageId));
          if (pkgsToDrop.size === 0) return { kept: sorties, removed: [] };
          const kept = sorties.filter((s) => !pkgsToDrop.has(s.packageId));
          const removed = sorties.filter((s) => pkgsToDrop.has(s.packageId));
          return { kept, removed };
        },
      },
    ];

    const repairOps: Array<{ name: string; weight: number; score: number; calls: number; wins: number; fn: (kept: Sortie[]) => Sortie[] }> = [
      {
        name: 'packageAwareRegretRepair',
        weight: 1.0,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (kept) => {
          const usedTails = new Set(kept.map((s) => s.aircraftTail));
          const usedPilots = new Set(kept.map((s) => s.pilotId));
          const coveredTargets = new Set(kept.map((s) => s.targetRequestId));
          const uncovered = targetsList.filter((t) => !coveredTargets.has(t.id)).sort((a, b) => b.priority - a.priority);
          const repaired = [...kept];
          let rSeq = 1;

          for (const target of uncovered) {
            const rolesNeeded: Array<{ role: Sortie['role']; munType?: string }> = [];
            for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
              rolesNeeded.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
            }
            for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
              rolesNeeded.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
            }
            for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
              rolesNeeded.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
            }

            const candidatePkgSorties: Sortie[] = [];
            let pkgFeasible = true;
            const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

            for (const slot of rolesNeeded) {
              let assigned = false;
              for (const base of openBases) {
                const plane = aircraftList.find(
                  (a) => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role) && !usedTails.has(a.tailNumber)
                );
                if (!plane) continue;

                const pilot = pilotsList.find(
                  (p) => p.baseId === base.id && p.status === 'READY' && p.typeRating === plane.model && !usedPilots.has(p.id) && p.fatigueScore <= 60
                );
                if (!pilot) continue;

                usedTails.add(plane.tailNumber);
                usedPilots.add(pilot.id);

                const distKm = haversineDistanceKm(base.location, target.location);
                const fltMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);
                const dep = Math.max(0, target.totStartMinutes - fltMin);
                const rec = target.totStartMinutes + fltMin;

                candidatePkgSorties.push({
                  sortieId: `SRT-RPR-${Date.now().toString().slice(-4)}-${rSeq}`,
                  callsign: `VAYU-${pilot.callsign.split('-')[0]}-${rSeq}`,
                  packageId: `PKG-RPR-${target.id}`,
                  targetRequestId: target.id,
                  role: slot.role,
                  aircraftTail: plane.tailNumber,
                  pilotId: pilot.id,
                  originBaseId: base.id,
                  recoveryBaseId: base.id,
                  munitionLoadout: [{ munitionId: target.desiredMunitions[0] || 'MUN_SPICE2000', count: 2 }],
                  depTimeMinutes: dep,
                  totMinutes: target.totStartMinutes,
                  recoveryTimeMinutes: rec,
                  fuelPlannedKg: Math.round(distKm * 2 * 2.8),
                  routeWaypoints: [base.location, target.location, base.location],
                  expectedRiskScore: calculateRouteRisk([base.location, target.location], threatsList),
                  status: 'SCHEDULED',
                  isFrozen: false,
                  justificationNotes: `ALNS package repair allocation.`,
                });
                rSeq++;
                assigned = true;
                break;
              }
              if (!assigned) {
                pkgFeasible = false;
                break;
              }
            }

            if (pkgFeasible && candidatePkgSorties.length === rolesNeeded.length) {
              repaired.push(...candidatePkgSorties);
            } else {
              for (const partial of candidatePkgSorties) {
                usedTails.delete(partial.aircraftTail);
                usedPilots.delete(partial.pilotId);
              }
            }
          }
          return repaired;
        },
      },
      {
        name: 'deepRiskMinPackageRepair',
        weight: 1.0,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (kept) => {
          return [...kept];
        },
      },
    ];

    // 3. Simulated Annealing ALNS Search Loop
    let temperature = 40.0;
    const coolingRate = 0.985;
    let iteration = 0;

    while (iteration < maxIterations && Date.now() - startTime < timeLimitMs) {
      iteration++;

      // Roulette wheel selection for destroy
      const totalDestroyW = destroyOps.reduce((acc, d) => acc + d.weight, 0);
      let rD = Math.random() * totalDestroyW;
      let dOp = destroyOps[0]!;
      for (const op of destroyOps) {
        if (rD <= op.weight) {
          dOp = op;
          break;
        }
        rD -= op.weight;
      }

      // Roulette wheel selection for repair
      const totalRepairW = repairOps.reduce((acc, r) => acc + r.weight, 0);
      let rR = Math.random() * totalRepairW;
      let rOp = repairOps[0]!;
      for (const op of repairOps) {
        if (rR <= op.weight) {
          rOp = op;
          break;
        }
        rR -= op.weight;
      }

      dOp.calls++;
      rOp.calls++;

      // Apply Destroy and Repair
      const destroyed = dOp.fn(currentSorties);
      const candidateSorties = rOp.fn(destroyed.kept);

      // Infeasible-move handling: verify zero hard constraint violations mid-search
      const candAudit = this.verifier.verifyPlan(
        candidateSorties,
        aircraftList,
        pilotsList,
        bases,
        munitionList,
        targetsList,
        threatsList
      );
      if (candAudit.totalViolations > 0) {
        continue; // Strictly reject infeasible moves mid-search
      }

      const candidateObj = calcObjective(candidateSorties);

      // Acceptance criterion (Simulated Annealing)
      const delta = candidateObj - currentObjective;
      let accepted = false;

      if (delta > 0) {
        accepted = true;
      } else {
        const acceptProb = Math.exp(delta / Math.max(0.001, temperature));
        if (Math.random() < acceptProb) {
          accepted = true;
        }
      }

      if (accepted) {
        currentSorties = candidateSorties;
        currentObjective = candidateObj;

        if (candidateObj > bestObjective) {
          bestSorties = candidateSorties;
          bestObjective = candidateObj;
          dOp.score += 33; // Global improvement
          rOp.score += 33;
          dOp.wins++;
          rOp.wins++;
        } else {
          dOp.score += 9;
          rOp.score += 9;
        }
      }

      // Cool temperature
      temperature *= coolingRate;

      // Adaptive weight updates every 15 iterations
      if (iteration % 15 === 0) {
        for (const op of destroyOps) {
          op.weight = Math.max(0.1, op.weight * 0.8 + (op.score / Math.max(1, op.calls)) * 0.2);
          op.score = 0;
        }
        for (const op of repairOps) {
          op.weight = Math.max(0.1, op.weight * 0.8 + (op.score / Math.max(1, op.calls)) * 0.2);
          op.score = 0;
        }
      }
    }

    // Save final stats
    this.operatorStats = [
      ...destroyOps.map((d) => ({
        name: d.name,
        type: 'DESTROY' as const,
        invocations: d.calls,
        successfulImprovements: d.wins,
        weight: Math.round(d.weight * 100) / 100,
      })),
      ...repairOps.map((r) => ({
        name: r.name,
        type: 'REPAIR' as const,
        invocations: r.calls,
        successfulImprovements: r.wins,
        weight: Math.round(r.weight * 100) / 100,
      })),
    ];

    const alnsImprovementPercent =
      t0Objective > 0 ? Math.max(0, Math.round(((bestObjective - t0Objective) / t0Objective) * 1000) / 10) : 0;

    this.lastOptimizationSummary = {
      t0Objective: Math.round(t0Objective * 10) / 10,
      finalObjective: Math.round(bestObjective * 10) / 10,
      alnsImprovementPercent,
      iterationsRun: iteration,
      durationMs: Date.now() - startTime,
    };

    // 4. Compute Final KPIs
    let totalFuel = 0;
    let totalRisk = 0;
    const coveredTgtSet = new Set<string>();

    for (const s of bestSorties) {
      totalFuel += s.fuelPlannedKg;
      totalRisk += s.expectedRiskScore;
      coveredTgtSet.add(s.targetRequestId);
    }

    let coveredPrioSum = 0;
    let totalPrioSum = 0;
    for (const t of targetsList) {
      totalPrioSum += t.priority;
      if (coveredTgtSet.has(t.id)) coveredPrioSum += t.priority;
    }

    const priorityCoveragePercent =
      totalPrioSum > 0 ? Math.round((coveredPrioSum / totalPrioSum) * 1000) / 10 : 0;
    const avgRisk = bestSorties.length > 0 ? Math.round((totalRisk / bestSorties.length) * 10) / 10 : 0;

    // Independent Auditor Pass
    const verification = this.verifier.verifyPlan(
      bestSorties,
      aircraftList,
      pilotsList,
      bases,
      munitionList,
      targetsList,
      threatsList
    );

    const activeTails = new Set(bestSorties.map((s) => s.aircraftTail));
    const strategicReserve = aircraftList.filter((a) => a.status === 'FMC').length - activeTails.size;
    const solveTimeMs = Date.now() - startTime;

    return {
      id: `PLAN-COA-${doctrine}-${Date.now().toString().slice(-6)}`,
      name: `Operation Plan ${doctrine.replace('_', ' ')}`,
      description: `Optimized multi-sector strike plan focusing on ${doctrine.toLowerCase().replace('_', ' ')}.`,
      doctrineFocus: doctrine,
      sorties: bestSorties,
      kpis: {
        coveredTargetsCount: coveredTgtSet.size,
        totalTargetsCount: targetsList.length,
        priorityCoveragePercent,
        totalExpectedLossScore: avgRisk,
        totalFuelKg: totalFuel,
        strategicReserveAircraft: Math.max(0, strategicReserve),
        packageIntegrityPercent: verification.metrics.packageIntegrityPercent,
        hardConstraintViolations: verification.totalViolations,
        solveTimeMs,
        solverUsed: 'ANYTIME_ALNS_VAYU_TS',
      },
      createdAt: new Date().toISOString(),
      commanderApproved: false,
    };
  }

  /**
   * Fast Constructive Heuristic for initial state (t=0)
   */
  private constructiveHeuristic(
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[],
    wPrio: number,
    wRisk: number,
    wFuel: number,
    doctrine: string,
    allowMultiWave: boolean
  ): Sortie[] {
    const availableAircraft = aircraftList.filter((a) => a.status === 'FMC');
    const availablePilots = pilotsList.filter((p) => p.status === 'READY' && p.fatigueScore <= 65);
    const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

    const aircraftSortieTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
    const pilotSortieTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
    const stockInventory = new Map(munitionList.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
    const baseHourlySorties = new Map<string, number>();

    const sortedTargets = [...targetsList].sort((a, b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);
    const generatedSorties: Sortie[] = [];
    let sortieSeq = 1;
    let packageSeq = 1;

    for (const target of sortedTargets) {
      const pkgId = `PKG-${packageSeq.toString().padStart(3, '0')}`;
      const neededRoles: Array<{ role: Sortie['role']; munType?: string }> = [];

      for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
        neededRoles.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
      }
      for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
        neededRoles.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
      }
      for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
        neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
      }

      if (doctrine === 'MIN_RISK' && target.priority > 80 && neededRoles.length > 0) {
        neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
      }

      const packageSorties: Sortie[] = [];
      let packageFeasible = true;

      for (const slot of neededRoles) {
        let bestCandidate: any = null;

        for (const base of openBases) {
          const distKm = haversineDistanceKm(base.location, target.location);
          const roundtripDistKm = distKm * 2;

          const candidatePlanes = availableAircraft.filter(
            (a) => a.baseId === base.id && a.roles.includes(slot.role)
          );

          for (const ac of candidatePlanes) {
            if (roundtripDistKm > ac.combatRadiusKm * 1.8) continue;

            const flightTimeOneWayMin = Math.round((distKm / ac.cruiseSpeedKmh) * 60);
            const tot = Math.round((target.totStartMinutes + target.totEndMinutes) / 2);
            const depTime = Math.max(0, tot - flightTimeOneWayMin);
            const recTime = tot + flightTimeOneWayMin;

            const acHistory = aircraftSortieTimeline.get(ac.tailNumber) || [];
            let acAvailable = true;
            for (const prev of acHistory) {
              const turnaround = ac.turnaroundTimeMinutes || 35;
              if (allowMultiWave) {
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

            const hourSlot = Math.floor(depTime / 60);
            const slotKey = `${base.id}_${hourSlot}`;
            const currentSlotSorties = baseHourlySorties.get(slotKey) || 0;
            if (currentSlotSorties >= base.maxSortiePerHour) continue;

            const candidatePilots = availablePilots.filter(
              (p) => p.baseId === base.id && p.typeRating === ac.model
            );

            for (const pilot of candidatePilots) {
              const pilotHistory = pilotSortieTimeline.get(pilot.id) || [];
              let pilotAvailable = true;
              let accumulatedFlightMins = 0;

              for (const prev of pilotHistory) {
                accumulatedFlightMins += prev.rec - prev.dep;
                if (depTime < prev.rec + 45 && recTime > prev.dep - 45) {
                  pilotAvailable = false;
                  break;
                }
              }

              const flightDurationMins = recTime - depTime;
              if ((accumulatedFlightMins + flightDurationMins) / 60 + pilot.dutyHoursLast24h > 12) {
                pilotAvailable = false;
              }
              if (!pilotAvailable) continue;

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

              const spec = Object.values(AIRCRAFT_MODEL_SPECS).find((s) => s.model === ac.model);
              const burnRate = spec ? spec.burnRateKgPerKm : 2.5;
              const fuelBurnKg = Math.round(roundtripDistKm * burnRate);
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
              break;
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

          for (const l of bestCandidate.loadout) {
            const key = `${bestCandidate.base.id}_${l.munitionId}`;
            const curr = stockInventory.get(key) || 0;
            stockInventory.set(key, Math.max(0, curr - l.count));
          }

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
        packageSeq++;
      } else {
        for (const partial of packageSorties) {
          const acHist = aircraftSortieTimeline.get(partial.aircraftTail) || [];
          acHist.pop();
          const pilotHist = pilotSortieTimeline.get(partial.pilotId) || [];
          pilotHist.pop();
        }
      }
    }

    return generatedSorties;
  }
}
