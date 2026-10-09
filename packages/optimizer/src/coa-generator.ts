import {
  PlanCOA,
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
} from '@air-power/shared';
import { AlnsTacticalOptimizer } from './alns-optimizer';

export interface CoaComparisonSuite {
  maxEffectCoa: PlanCOA;
  minRiskCoa: PlanCOA;
  balancedReserveCoa: PlanCOA;
  recommendedCoaId: string;
}

export class CourseOfActionGenerator {
  private optimizer = new AlnsTacticalOptimizer();

  public generateTripleCoas(
    bases: Airbase[],
    aircraft: Aircraft[],
    pilots: Aircrew[],
    munitions: MunitionStock[],
    targets: TargetRequest[],
    threats: ThreatIntel[]
  ): CoaComparisonSuite {
    const maxEffect = this.optimizer.solve(bases, aircraft, pilots, munitions, targets, threats, {
      doctrineFocus: 'MAX_EFFECT',
    });

    const minRisk = this.optimizer.solve(bases, aircraft, pilots, munitions, targets, threats, {
      doctrineFocus: 'MIN_RISK',
    });

    const balanced = this.optimizer.solve(bases, aircraft, pilots, munitions, targets, threats, {
      doctrineFocus: 'BALANCED_RESERVE',
    });

    return {
      maxEffectCoa: maxEffect,
      minRiskCoa: minRisk,
      balancedReserveCoa: balanced,
      recommendedCoaId: balanced.id,
    };
  }
}
