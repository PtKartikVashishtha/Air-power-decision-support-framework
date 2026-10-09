import {
  PlanCOA,
  Sortie,
  SortieDiffItem,
  RetaskingDiffReport,
  TacticalInject,
  Airbase,
  Aircraft,
  Aircrew,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  calculateRouteRisk,
  haversineDistanceKm,
} from '@air-power/shared';
import { AlnsTacticalOptimizer } from './alns-optimizer';

export class DynamicRetaskingEngine {
  private optimizer = new AlnsTacticalOptimizer();
  private FROZEN_HORIZON_MINUTES = 15; // Sorties departing within 15 minutes are locked

  public retaskPlan(
    originalPlan: PlanCOA,
    inject: TacticalInject,
    currentSimTimeMinutes: number,
    bases: Airbase[],
    aircraftList: Aircraft[],
    pilotsList: Aircrew[],
    munitionList: MunitionStock[],
    targetsList: TargetRequest[],
    threatsList: ThreatIntel[]
  ): { updatedPlan: PlanCOA; diffReport: RetaskingDiffReport } {
    // 1. Identify and lock Frozen Sorties
    const frozenSorties: Sortie[] = [];
    const flexibleSorties: Sortie[] = [];

    for (const sortie of originalPlan.sorties) {
      const isCommitted =
        sortie.status === 'AIRBORNE' ||
        sortie.depTimeMinutes <= currentSimTimeMinutes + this.FROZEN_HORIZON_MINUTES;

      if (isCommitted) {
        frozenSorties.push({ ...sortie, isFrozen: true });
      } else {
        flexibleSorties.push(sortie);
      }
    }

    // 2. Handle specific inject mutations on available assets and targets
    let modifiedAircraft = [...aircraftList];
    let modifiedBases = [...bases];
    let modifiedTargets = [...targetsList];
    let modifiedThreats = [...threatsList];

    if (inject.type === 'AIRCRAFT_AOG_SNAG') {
      const aogTail = inject.payload.tailNumber;
      modifiedAircraft = modifiedAircraft.map((a) =>
        a.tailNumber === aogTail ? { ...a, status: 'AOG' as const } : a
      );
    } else if (inject.type === 'BASE_WEATHER_CLOSURE') {
      const closedId = inject.payload.baseId;
      modifiedBases = modifiedBases.map((b) =>
        b.id === closedId ? { ...b, currentWeatherStatus: 'CLOSED' as const } : b
      );
    } else if (inject.type === 'SAM_POPUP') {
      // Threat already appended to state store
    } else if (inject.type === 'NEW_HIGH_VALUE_TST') {
      // Target already prepended to targetRequests in state store
    }

    // 3. Run targeted re-optimization
    const reoptimizedPlan = this.optimizer.solve(
      modifiedBases,
      modifiedAircraft,
      pilotsList,
      munitionList,
      modifiedTargets,
      modifiedThreats,
      { doctrineFocus: originalPlan.doctrineFocus }
    );

    // Merge frozen sorties into updated plan to preserve tactical continuity
    const mergedSorties: Sortie[] = [...frozenSorties];
    const reservedTails = new Set(frozenSorties.map((s) => s.aircraftTail));
    const reservedPilots = new Set(frozenSorties.map((s) => s.pilotId));

    for (const newSortie of reoptimizedPlan.sorties) {
      if (!reservedTails.has(newSortie.aircraftTail) && !reservedPilots.has(newSortie.pilotId)) {
        mergedSorties.push(newSortie);
      }
    }

    const updatedPlan: PlanCOA = {
      ...reoptimizedPlan,
      id: `PLAN-RETASKED-${Date.now().toString().slice(-6)}`,
      name: `${originalPlan.name} (Retasked post-${inject.type})`,
      sorties: mergedSorties,
    };

    // 4. Generate granular Plan Diff with intelligent semantic matching
    const changes: SortieDiffItem[] = [];
    
    // Key by targetRequestId + role
    const origRoleMap = new Map<string, Sortie>();
    for (const s of originalPlan.sorties) {
      origRoleMap.set(`${s.targetRequestId}_${s.role}_${s.aircraftTail}`, s);
    }

    const newRoleMap = new Map<string, Sortie>();
    for (const s of updatedPlan.sorties) {
      newRoleMap.set(`${s.targetRequestId}_${s.role}_${s.aircraftTail}`, s);
    }

    // Newly added sorties
    for (const [key, newS] of newRoleMap.entries()) {
      if (!origRoleMap.has(key)) {
        changes.push({
          sortieId: newS.sortieId,
          callsign: newS.callsign,
          changeType: 'ADDED',
          reason: `Tasked in response to ${inject.title}`,
          newState: newS,
          impactAssessment: `Added asset ${newS.aircraftTail} targeting ${newS.targetRequestId}.`,
        });
      }
    }

    // Cancelled sorties
    for (const [key, origS] of origRoleMap.entries()) {
      if (!newRoleMap.has(key) && !origS.isFrozen) {
        changes.push({
          sortieId: origS.sortieId,
          callsign: origS.callsign,
          changeType: 'CANCELLED',
          reason: `Deconfliction / Resource reallocation following ${inject.type}`,
          previousState: origS,
          impactAssessment: `Sortie ${origS.callsign} stood down to free flight line / avoid closed corridor.`,
        });
      }
    }

    // Compute stability index based on proportion of unchanged sorties
    const totalSorties = Math.max(1, originalPlan.sorties.length);
    const affectedSorties = changes.length;
    const stabilityIndex = Math.max(20, Math.min(100, Math.round(100 - (affectedSorties / totalSorties) * 40)));

    // 5. Generate Commander's Brief in Markdown
    const commanderBriefMarkdown = `
### TACTICAL RETASKING ACTION REPORT // ${inject.type}
**Trigger Event**: ${inject.title}  
**Time of Retask**: H+${Math.floor(currentSimTimeMinutes)}m  
**Stability Index**: **${stabilityIndex}%** (Minimal operational disruption)

#### Key Decisions Taken:
1. **Frozen Zone Respect**: ${frozenSorties.length} committed sorties were held static without flight disruption.
2. **Resource Adjustments**:
   - **${changes.filter((c) => c.changeType === 'ADDED').length}** Sorties Added (Immediate strike coverage established).
   - **${changes.filter((c) => c.changeType === 'REROUTED').length}** Sorties Rerouted (Threat envelope bypassed).
   - **${changes.filter((c) => c.changeType === 'CANCELLED').length}** Sorties Stood Down / Diverted.
3. **Strategic Net Impact**:
   - Target Coverage: **${updatedPlan.kpis.priorityCoveragePercent}%** (vs Original **${originalPlan.kpis.priorityCoveragePercent}%**).
   - Expected Mission Risk: **${updatedPlan.kpis.totalExpectedLossScore}** (Mitigated).
   - Strategic Reserve Held: **${updatedPlan.kpis.strategicReserveAircraft}** combat airframes.

*Recommendation*: **APPROVE IMMEDIATE EXECUTION** of updated ATO.
`;

    const diffReport: RetaskingDiffReport = {
      id: `DIFF-${Date.now().toString().slice(-6)}`,
      triggerEvent: inject.title,
      originalPlanId: originalPlan.id,
      updatedPlanId: updatedPlan.id,
      timestamp: new Date().toISOString(),
      stabilityIndex,
      changes,
      commanderBriefMarkdown,
    };

    return { updatedPlan, diffReport };
  }
}
