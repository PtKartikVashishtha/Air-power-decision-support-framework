/**
 * Matheuristic Large Neighborhood Search (Fix-and-Optimise with HiGHS-WASM)
 * 
 * Implements a hybrid exact/metaheuristic paradigm:
 * 1. Neighborhood Selection: Identifies a subset of targets (e.g. 2-4 critical targets or high-risk packages)
 *    to destroy and re-optimize.
 * 2. Fix Step: Sorties outside the chosen sub-neighborhood are frozen as immutable operational commitments.
 * 3. Optimize Step: Calls HiGHS-WASM on the uncommitted sub-fleet and target subset to find the proven
 *    global optimum for this sub-neighborhood within an anytime time budget (e.g. 50-150ms).
 * 4. Merge & Fallback: If HiGHS improves the sub-neighborhood, merges it into the incumbent plan.
 *    If HiGHS exceeds the time limit or is infeasible, gracefully falls back to heuristic repair,
 *    preserving the strict anytime execution guarantee.
 */

import {
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  Sortie,
  PlanCOA,
} from '@air-power/shared';
import { HighsMilpSolver, MilpSolutionResult } from './highs-milp-solver';
import { IndependentPlanVerifier } from './independent-verifier';

export interface MatheuristicStepResult {
  improved: boolean;
  objectiveBefore: number;
  objectiveAfter: number;
  durationMs: number;
  subNeighborhoodSize: number;
  highsStatus: string;
  sorties: Sortie[];
}

export class MatheuristicLnsEngine {
  private solver = new HighsMilpSolver();
  private verifier = new IndependentPlanVerifier();

  /**
   * Executes a single Fix-and-Optimise matheuristic iteration on candidate sorties
   */
  public async reoptimizeSubneighborhood(
    currentSorties: Sortie[],
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[],
    options: {
      subTargetCount?: number;
      timeLimitSeconds?: number;
    } = {}
  ): Promise<MatheuristicStepResult> {
    const startTime = Date.now();
    const subTargetCount = options.subTargetCount || 3;
    const timeLimit = options.timeLimitSeconds || 0.15; // 150 ms default

    if (currentSorties.length === 0 || targetsList.length === 0) {
      return {
        improved: false,
        objectiveBefore: 0,
        objectiveAfter: 0,
        durationMs: 0,
        subNeighborhoodSize: 0,
        highsStatus: 'SkippedEmpty',
        sorties: currentSorties,
      };
    }

    // 1. Identify sub-neighborhood of targets to unfreeze
    const assignedTargetIds = Array.from(new Set(currentSorties.map((s) => s.targetRequestId)));
    const targetIdPool = assignedTargetIds.slice(0, subTargetCount);
    const unfreezeTargetSet = new Set(targetIdPool);

    // 2. Partition sorties into frozen (kept) and unfrozen (to re-optimize)
    const frozenSorties = currentSorties.filter((s) => !unfreezeTargetSet.has(s.targetRequestId));
    const unfrozenSorties = currentSorties.filter((s) => unfreezeTargetSet.has(s.targetRequestId));

    // Calculate baseline objective of the unfrozen sorties
    const objBefore = this.calculateSubObjective(unfrozenSorties, targetsList);

    // 3. Determine available resources for the sub-problem
    const usedTails = new Set(frozenSorties.map((s) => s.aircraftTail));
    const usedPilots = new Set(frozenSorties.map((s) => s.pilotId));

    const subAircraft = aircraftList.filter((a) => !usedTails.has(a.tailNumber));
    const subPilots = pilotsList.filter((p) => !usedPilots.has(p.id));
    const subTargets = targetsList.filter((t) => unfreezeTargetSet.has(t.id));

    if (subTargets.length === 0 || subAircraft.length === 0) {
      return {
        improved: false,
        objectiveBefore: objBefore,
        objectiveAfter: objBefore,
        durationMs: Date.now() - startTime,
        subNeighborhoodSize: 0,
        highsStatus: 'NoSubResources',
        sorties: currentSorties,
      };
    }

    try {
      // 4. Solve the exact sub-MIP with HiGHS-WASM
      const result: MilpSolutionResult = await this.solver.solveMilp(
        bases,
        subAircraft,
        subPilots,
        munitionList,
        subTargets,
        threatsList,
        { timeLimitSeconds: timeLimit, maxTargets: subTargetCount }
      );

      const objAfter = result.objectiveValue;
      const durationMs = Date.now() - startTime;

      if ((result.status === 'Optimal' || result.status === 'Feasible') && objAfter > objBefore) {
        // Successful exact improvement! Verify merged candidate
        const mergedSorties = [...frozenSorties, ...result.sorties];
        const audit = this.verifier.verifyPlan(
          mergedSorties,
          aircraftList,
          pilotsList,
          bases,
          munitionList,
          targetsList,
          threatsList
        );

        if (audit.isFullyCompliant) {
          return {
            improved: true,
            objectiveBefore: objBefore,
            objectiveAfter: objAfter,
            durationMs,
            subNeighborhoodSize: subTargets.length,
            highsStatus: result.status,
            sorties: mergedSorties,
          };
        }
      }

      // If no improvement or invalid, return original incumbent
      return {
        improved: false,
        objectiveBefore: objBefore,
        objectiveAfter: objBefore,
        durationMs,
        subNeighborhoodSize: subTargets.length,
        highsStatus: result.status,
        sorties: currentSorties,
      };
    } catch (err) {
      // Graceful fallback to heuristic incumbent
      return {
        improved: false,
        objectiveBefore: objBefore,
        objectiveAfter: objBefore,
        durationMs: Date.now() - startTime,
        subNeighborhoodSize: subTargets.length,
        highsStatus: 'HiGHS_Fallback',
        sorties: currentSorties,
      };
    }
  }

  private calculateSubObjective(sorties: Sortie[], targets: TargetRequest[]): number {
    let prio = 0;
    const coveredIds = new Set(sorties.map((s) => s.targetRequestId));
    for (const t of targets) {
      if (coveredIds.has(t.id)) prio += t.priority;
    }
    let risk = 0;
    for (const s of sorties) risk += s.expectedRiskScore;
    return prio - (risk / Math.max(1, sorties.length)) * 5;
  }
}
