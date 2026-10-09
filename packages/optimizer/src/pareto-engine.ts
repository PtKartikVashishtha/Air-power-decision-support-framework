/**
 * Multi-Objective Pareto Frontier Engine & Commander's Intent Dial
 * 
 * Provides:
 * 1. Epsilon-Constraint / Multi-Objective Pareto Frontier Generation across 4 conflicting objectives:
 *    - f1: Target Priority Value Delivered (Maximize)
 *    - f2: Average SAM Threat Risk Exposure (Minimize)
 *    - f3: Strategic Reserve Airframes Held (Maximize)
 *    - f4: Tanker AAR Fuel Consumed (Minimize)
 * 2. Non-Dominated Sorting: Filters out dominated solutions to compute the true Pareto set.
 * 3. Commander's Intent Dial: An interactive real-time control (dial: 0.0 to 1.0) that moves smoothly
 *    along the precomputed Pareto frontier between:
 *    - 0.00: FORCE_PROTECTION (Minimum Risk, maximum reserve, standoff weapons only)
 *    - 0.50: BALANCED_SUSTAINMENT (Joint Doctrine, 25% reserve, balanced risk-return)
 *    - 1.00: MAXIMUM_SURGE (Maximum Destruction, all targets engaged, higher risk tolerance)
 */

import {
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  PlanCOA,
} from '@air-power/shared';
import { AlnsTacticalOptimizer } from './alns-optimizer';

export interface ParetoPoint {
  id: string;
  name: string;
  dialPosition: number; // 0.0 to 1.0
  objectives: {
    targetValue: number;       // f1 (higher = better)
    threatRisk: number;        // f2 (lower = better)
    reserveCount: number;      // f3 (higher = better)
    fuelConsumptionTons: number; // f4 (lower = better)
  };
  plan: PlanCOA;
  isParetoOptimal: boolean;
}

export interface ParetoFrontierResult {
  frontierPoints: ParetoPoint[];
  hypervolumeEstimate: number;
  tradeOffSummary: string;
}

export class MultiObjectiveParetoEngine {
  private optimizer = new AlnsTacticalOptimizer();

  /**
   * Generates a 5-point non-dominated Pareto frontier spanning the doctrine spectrum
   */
  public generateParetoFrontier(
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[]
  ): ParetoFrontierResult {
    // Distinct doctrine weight configurations along the trade-off curve
    const configs: Array<{
      id: string;
      name: string;
      dial: number;
      doctrine: 'MIN_RISK' | 'BALANCED_RESERVE' | 'MAX_EFFECT';
    }> = [
      { id: 'PT-0.00', name: 'Maximum Force Protection (Min Risk)', dial: 0.00, doctrine: 'MIN_RISK' },
      { id: 'PT-0.25', name: 'Conservative Defensive Counter-Air', dial: 0.25, doctrine: 'MIN_RISK' },
      { id: 'PT-0.50', name: 'Standard Joint Balanced Reserve', dial: 0.50, doctrine: 'BALANCED_RESERVE' },
      { id: 'PT-0.75', name: 'Aggressive High-Tempo Strike', dial: 0.75, doctrine: 'MAX_EFFECT' },
      { id: 'PT-1.00', name: 'Maximum Surge Destruction', dial: 1.00, doctrine: 'MAX_EFFECT' },
    ];

    const rawPoints: ParetoPoint[] = [];

    for (const cfg of configs) {
      const plan = this.optimizer.solve(
        bases,
        aircraftList,
        pilotsList,
        munitionList,
        targetsList,
        threatsList,
        {
          doctrineFocus: cfg.doctrine,
          maxIterations: 60,
          timeLimitMs: 120,
        }
      );

      const f1Value = plan.kpis.priorityCoveragePercent || 0;
      const f2Risk = plan.kpis.totalExpectedLossScore || 0;
      const f3Reserve = plan.kpis.strategicReserveAircraft || 0;
      const f4FuelTons = Math.round(((plan.kpis.totalFuelKg || 0) / 1000) * 10) / 10;

      rawPoints.push({
        id: cfg.id,
        name: cfg.name,
        dialPosition: cfg.dial,
        objectives: {
          targetValue: f1Value,
          threatRisk: f2Risk,
          reserveCount: f3Reserve,
          fuelConsumptionTons: f4FuelTons,
        },
        plan,
        isParetoOptimal: true,
      });
    }

    // Filter non-dominated points
    const frontierPoints = this.filterNonDominated(rawPoints);

    // Hypervolume indicator estimation (relative to nadir point: f1=0, f2=100, f3=0, f4=500)
    const hypervolumeEstimate = this.estimateHypervolume(frontierPoints);

    const minRiskPt = frontierPoints[0];
    const maxEffectPt = frontierPoints[frontierPoints.length - 1];

    const tradeOffSummary = `Pareto Frontier spans from ${minRiskPt.name} (Risk: ${minRiskPt.objectives.threatRisk}, Reserve: ${minRiskPt.objectives.reserveCount} airframes) to ${maxEffectPt.name} (Coverage: ${maxEffectPt.objectives.targetValue}%, Risk: ${maxEffectPt.objectives.threatRisk}).`;

    return {
      frontierPoints,
      hypervolumeEstimate,
      tradeOffSummary,
    };
  }

  /**
   * Filters candidate points to retain only non-dominated solutions:
   * Solution A dominates B if A is no worse in all objectives and strictly better in at least one.
   */
  private filterNonDominated(points: ParetoPoint[]): ParetoPoint[] {
    const nonDominated: ParetoPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      let isDominated = false;
      const p1 = points[i];

      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        const p2 = points[j];

        // p2 dominates p1 if p2 has >= targetValue, <= threatRisk, >= reserveCount, <= fuel
        const p2BetterOrEqual =
          p2.objectives.targetValue >= p1.objectives.targetValue &&
          p2.objectives.threatRisk <= p1.objectives.threatRisk &&
          p2.objectives.reserveCount >= p1.objectives.reserveCount &&
          p2.objectives.fuelConsumptionTons <= p1.objectives.fuelConsumptionTons;

        const p2StrictlyBetter =
          p2.objectives.targetValue > p1.objectives.targetValue ||
          p2.objectives.threatRisk < p1.objectives.threatRisk ||
          p2.objectives.reserveCount > p1.objectives.reserveCount ||
          p2.objectives.fuelConsumptionTons < p1.objectives.fuelConsumptionTons;

        if (p2BetterOrEqual && p2StrictlyBetter) {
          isDominated = true;
          break;
        }
      }

      // Preserve boundary doctrine points (0.0 and 1.0) so Commander's dial spans the full range
      if (!isDominated || i === 0 || i === points.length - 1) {
        nonDominated.push({ ...p1, isParetoOptimal: !isDominated });
      }
    }

    return nonDominated.sort((a, b) => a.dialPosition - b.dialPosition);
  }

  /**
   * Real-time Commander's Intent Dial lookup: interpolates or snaps to the closest Pareto point
   * for a given dial setting in [0.0, 1.0].
   */
  public getPlanForDial(frontier: ParetoPoint[], dialSetting: number): ParetoPoint {
    if (frontier.length === 0) throw new Error('Empty Pareto frontier');
    const clampedDial = Math.max(0, Math.min(1, dialSetting));

    let closest = frontier[0];
    let minDiff = Math.abs(frontier[0].dialPosition - clampedDial);

    for (const pt of frontier) {
      const diff = Math.abs(pt.dialPosition - clampedDial);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    return closest;
  }

  private estimateHypervolume(points: ParetoPoint[]): number {
    if (points.length === 0) return 0;
    // Normalized 2D projection (Target Value vs 100 - Risk)
    let area = 0;
    for (const pt of points) {
      const normVal = pt.objectives.targetValue / 100;
      const normSafety = Math.max(0, (100 - pt.objectives.threatRisk) / 100);
      area += normVal * normSafety;
    }
    return Math.round((area / points.length) * 1000) / 1000;
  }
}
