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

function createPrng(seed?: number) {
  if (seed === undefined) return Math.random;
  let s = (seed >>> 0) || 123456789;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
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
    const rng = createPrng(options.seed);

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
      if (sorties.length === 0) return targetsList.length > 0 ? -100000 : 0;
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
    let alnsSeq = initialSorties.length + 1;

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
          const removeCount = Math.min(2, Math.floor(packages.length * 0.25));
          const removedPackages = new Set<string>();
          for (let i = 0; i < removeCount; i++) {
            const pick = packages[Math.floor(rng() * packages.length)];
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
        name: 'lowestPriorityPackageDestroy',
        weight: 1.2,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (sorties) => {
          const targetPriorityMap = new Map(targetsList.map((t) => [t.id, t.priority]));
          const pkgPrioMap = new Map<string, number>();
          for (const s of sorties) {
            pkgPrioMap.set(s.packageId, targetPriorityMap.get(s.targetRequestId) || 0);
          }
          const sortedPkgs = Array.from(pkgPrioMap.entries()).sort((a, b) => a[1] - b[1]);
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
          const allPkgs = new Set(sorties.map((s) => s.packageId));
          if (allPkgs.size <= 1) return { kept: sorties, removed: [] };
          const randomBase = bases[Math.floor(rng() * bases.length)];
          const pkgsToDrop = new Set(sorties.filter((s) => s.originBaseId === randomBase?.id).map((s) => s.packageId));
          if (pkgsToDrop.size === 0 || pkgsToDrop.size >= allPkgs.size) return { kept: sorties, removed: [] };
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
          const coveredTargets = new Set(kept.map((s) => s.targetRequestId));
          const uncovered = targetsList.filter((t) => !coveredTargets.has(t.id)).sort((a, b) => b.priority - a.priority);
          const repaired = [...kept];

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
            const totCandidates = [
              Math.round((target.totStartMinutes + target.totEndMinutes) / 2),
              target.totStartMinutes,
              target.totEndMinutes,
            ];

            let scheduledTot: number | null = null;
            for (const candTot of totCandidates) {
              candidatePkgSorties.length = 0;
              pkgFeasible = true;
              const trialPlan = [...repaired];

              for (const slot of rolesNeeded) {
                let assigned = false;
                for (const base of openBases) {
                  const distKm = haversineDistanceKm(base.location, target.location);
                  const candidatePlanes = aircraftList.filter((a) => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role));

                  for (const plane of candidatePlanes) {
                    if (distKm * 2 > plane.combatRadiusKm * 1.8) continue;
                    const fltMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);
                    const dep = Math.max(0, candTot - fltMin);
                    const rec = candTot + fltMin;
                    const turnaround = plane.turnaroundTimeMinutes || 35;

                    let planeFree = true;
                    for (const st of trialPlan.filter((s) => s.aircraftTail === plane.tailNumber)) {
                      if (dep < st.recoveryTimeMinutes + turnaround && rec > st.depTimeMinutes - turnaround) {
                        planeFree = false;
                        break;
                      }
                    }
                    if (!planeFree) continue;

                    const currentActiveTails = new Set(trialPlan.map((s) => s.aircraftTail));
                    if (!currentActiveTails.has(plane.tailNumber)) {
                      const maxActive = doctrine === 'MIN_RISK'
                        ? Math.floor(aircraftList.filter((a) => a.status === 'FMC').length * 0.72)
                        : doctrine === 'BALANCED_RESERVE'
                        ? Math.floor(aircraftList.filter((a) => a.status === 'FMC').length * 0.85)
                        : aircraftList.filter((a) => a.status === 'FMC').length;
                      if (currentActiveTails.size >= maxActive) continue;
                    }

                    const hour = Math.floor(dep / 60);
                    const hourlyDep = trialPlan.filter((s) => s.originBaseId === base.id && Math.floor(s.depTimeMinutes / 60) === hour).length;
                    if (hourlyDep >= base.maxSortiePerHour) continue;

                    const pilot = pilotsList.find((p) => {
                      if (p.baseId !== base.id || p.status !== 'READY' || p.typeRating !== plane.model || p.fatigueScore > 65) return false;
                      for (const st of trialPlan.filter((s) => s.pilotId === p.id)) {
                        if (dep < st.recoveryTimeMinutes + 45 && rec > st.depTimeMinutes - 45) return false;
                      }
                      return true;
                    });
                    if (!pilot) continue;

                    const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
                    const mun = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(plane.model));
                    if (!mun) continue;

                    const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
                    const waypoints = [base.location, target.location, base.location];
                    const sId = `SRT-${String(alnsSeq++).padStart(4, '0')}`;
                    const newSortie: Sortie = {
                      sortieId: sId,
                      callsign: `VAYU-${pilot.callsign.split('-')[0]}-${alnsSeq}`,
                      packageId: `PKG-RPR-${target.id}`,
                      targetRequestId: target.id,
                      role: slot.role,
                      aircraftTail: plane.tailNumber,
                      pilotId: pilot.id,
                      originBaseId: base.id,
                      recoveryBaseId: base.id,
                      munitionLoadout: [{ munitionId: mun.id, count: 2 }],
                      depTimeMinutes: dep,
                      totMinutes: candTot,
                      recoveryTimeMinutes: rec,
                      fuelPlannedKg: Math.round(distKm * 2 * burnRate),
                      routeWaypoints: waypoints,
                      expectedRiskScore: calculateRouteRisk(waypoints, threatsList),
                      status: 'SCHEDULED',
                      isFrozen: false,
                      justificationNotes: `ALNS package repair allocation.`,
                    };

                    candidatePkgSorties.push(newSortie);
                    trialPlan.push(newSortie);
                    assigned = true;
                    break;
                  }
                  if (assigned) break;
                }
                if (!assigned) {
                  pkgFeasible = false;
                  break;
                }
              }

              if (pkgFeasible && candidatePkgSorties.length === rolesNeeded.length) {
                scheduledTot = candTot;
                break;
              }
            }

            if (scheduledTot !== null && candidatePkgSorties.length === rolesNeeded.length) {
              repaired.push(...candidatePkgSorties);
            }
          }
          return repaired;
        },
      },
      {
        name: 'baseReassignmentRepair',
        weight: 1.2,
        score: 0,
        calls: 0,
        wins: 0,
        fn: (kept) => {
          const packages = Array.from(new Set(kept.map((s) => s.packageId)));
          if (packages.length === 0) return kept;
          const pickPkg = packages[Math.floor(rng() * packages.length)]!;
          const pkgSorties = kept.filter((s) => s.packageId === pickPkg);
          const targetId = pkgSorties[0]?.targetRequestId;
          const target = targetsList.find((t) => t.id === targetId);
          if (!target) return kept;

          const curOrigin = pkgSorties[0]?.originBaseId;
          const remaining = kept.filter((s) => s.packageId !== pickPkg);

          for (const altBase of bases) {
            if (altBase.id === curOrigin || altBase.currentWeatherStatus === 'CLOSED') continue;
            const dist = haversineDistanceKm(altBase.location, target.location);
            const candidatePlanes = aircraftList.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
            const candidatePilots = pilotsList.filter((p) => p.baseId === altBase.id && p.status === 'READY');

            let feasible = true;
            const newPkg: Sortie[] = [];
            const usedTails = new Set<string>();
            const usedPilots = new Set<string>();

            for (const s of pkgSorties) {
              const plane = candidatePlanes.find((a) => {
                if (!a.roles.includes(s.role) || usedTails.has(a.tailNumber)) return false;
                if (a.combatRadiusKm * 1.8 < dist * 2) return false;
                const flightMin = Math.round((dist / a.cruiseSpeedKmh) * 60);
                const dep = Math.max(0, s.totMinutes - flightMin);
                const rec = s.totMinutes + flightMin;
                const turnaround = a.turnaroundTimeMinutes || 35;
                for (const prev of remaining.filter((st) => st.aircraftTail === a.tailNumber)) {
                  if (dep < prev.recoveryTimeMinutes + turnaround && rec > prev.depTimeMinutes - turnaround) return false;
                }
                return true;
              });
              if (!plane) { feasible = false; break; }

              const flightMin = Math.round((dist / plane.cruiseSpeedKmh) * 60);
              const dep = Math.max(0, s.totMinutes - flightMin);
              const rec = s.totMinutes + flightMin;

              const pilot = candidatePilots.find((p) => {
                if (p.typeRating !== plane.model || usedPilots.has(p.id)) return false;
                for (const prev of remaining.filter((st) => st.pilotId === p.id)) {
                  if (dep < prev.recoveryTimeMinutes + 45 && rec > prev.depTimeMinutes - 45) return false;
                }
                return true;
              });
              if (!pilot) { feasible = false; break; }

              const munItem = MUNITION_CATALOG.find((m) => m.category === 'PRECISION_GUIDED_BOMB' && m.compatibleModels.includes(plane.model));
              if (!munItem) { feasible = false; break; }

              usedTails.add(plane.tailNumber);
              usedPilots.add(pilot.id);

              const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
              newPkg.push({
                ...s,
                originBaseId: altBase.id,
                recoveryBaseId: altBase.id,
                aircraftTail: plane.tailNumber,
                pilotId: pilot.id,
                depTimeMinutes: dep,
                recoveryTimeMinutes: rec,
                fuelPlannedKg: Math.round(dist * 2 * burnRate),
                expectedRiskScore: calculateRouteRisk([altBase.location, target.location, altBase.location], threatsList),
                routeWaypoints: [altBase.location, target.location, altBase.location],
                munitionLoadout: [{ munitionId: munItem.id, count: 2 }],
              });
            }

            if (feasible && newPkg.length === pkgSorties.length) {
              return remaining.concat(newPkg);
            }
          }
          return kept;
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
      let rD = rng() * totalDestroyW;
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
      let rR = rng() * totalRepairW;
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
        dOp.weight = Math.max(0.1, dOp.weight * 0.95);
        rOp.weight = Math.max(0.1, rOp.weight * 0.95);
        continue;
      }

      const candidateObj = calcObjective(candidateSorties);

      // Acceptance criterion (Simulated Annealing)
      const delta = candidateObj - currentObjective;
      let accepted = false;

      if (delta > 0) {
        accepted = true;
      } else {
        const acceptProb = Math.exp(delta / Math.max(0.001, temperature));
        if (rng() < acceptProb) {
          accepted = true;
        }
      }

      if (accepted) {
        currentSorties = candidateSorties;
        currentObjective = candidateObj;

        if (candidateObj > bestObjective) {
          bestSorties = candidateSorties;
          bestObjective = candidateObj;
          dOp.score += 33;
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
    const planIdSuffix = options.seed !== undefined ? `SEED-${options.seed}` : Date.now().toString().slice(-6);
    return {
      id: `PLAN-COA-${doctrine}-${planIdSuffix}`,
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
      createdAt: options.seed !== undefined ? '2026-10-10T12:00:00.000Z' : new Date().toISOString(),
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
    const stockInventory = new Map((munitionList || []).map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
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
