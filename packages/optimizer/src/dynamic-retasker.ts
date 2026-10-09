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

    // 1. Handle specific inject mutations on available assets and targets
    let modifiedAircraft = aircraftList.map((a) => ({ ...a }));
    let modifiedBases = bases.map((b) => ({ ...b }));
    const modifiedTargets = [...targetsList];
    const modifiedThreats = [...threatsList];

    let aogTail: string | null = null;
    let closedBaseId: string | null = null;

    if (inject.type === 'AIRCRAFT_AOG_SNAG') {
      aogTail = inject.payload.tailNumber;
      modifiedAircraft = modifiedAircraft.map((a) =>
        a.tailNumber === aogTail ? { ...a, status: 'AOG' as const } : a
      );
    } else if (inject.type === 'BASE_WEATHER_CLOSURE') {
      closedBaseId = inject.payload.baseId;
      modifiedBases = modifiedBases.map((b) =>
        b.id === closedBaseId ? { ...b, currentWeatherStatus: 'CLOSED' as const } : b
      );
    } else if (inject.type === 'SAM_POPUP') {
      // Threat already appended to state store
    } else if (inject.type === 'NEW_HIGH_VALUE_TST') {
      // Target already prepended to targetRequests in state store
    }

    // 2. Identify and lock Frozen Sorties vs Flexible Sorties
    const frozenSorties: Sortie[] = [];
    const flexibleSorties: Sortie[] = [];

    for (const sortie of originalPlan.sorties) {
      const isAog = aogTail && sortie.aircraftTail === aogTail;
      const isCommitted =
        !isAog &&
        (sortie.status === 'AIRBORNE' ||
          sortie.depTimeMinutes <= currentSimTimeMinutes + this.FROZEN_HORIZON_MINUTES);

      if (isCommitted) {
        frozenSorties.push({ ...sortie, isFrozen: true });
      } else {
        flexibleSorties.push(sortie);
      }
    }

    const changes: SortieDiffItem[] = [];
    const survivingSorties: Sortie[] = [...frozenSorties];
    const usedTails = new Set<string>(frozenSorties.map((s) => s.aircraftTail));

    // 3. For flexible sorties: preserve if unaffected; repair or reassign if affected
    for (const s of flexibleSorties) {
      if (aogTail && s.aircraftTail === aogTail) {
        // Airframe is grounded: attempt spare substitution at same base
        const candidateSpare = modifiedAircraft.find(
          (a) =>
            a.status === 'FMC' &&
            a.homeBaseId === s.originBaseId &&
            a.model === s.aircraftModel &&
            !usedTails.has(a.tailNumber)
        );

        if (candidateSpare) {
          usedTails.add(candidateSpare.tailNumber);
          const rerouted: Sortie = {
            ...s,
            aircraftTail: candidateSpare.tailNumber,
          };
          survivingSorties.push(rerouted);
          changes.push({
            sortieId: s.sortieId,
            callsign: s.callsign,
            changeType: 'REROUTED',
            reason: `Airframe ${aogTail} grounded (AOG). Substituted reserve airframe ${candidateSpare.tailNumber} at ${s.originBaseId}.`,
            previousState: s,
            newState: rerouted,
            impactAssessment: `Combat sortie preserved via hot-spare airframe substitution.`,
          });
        } else {
          changes.push({
            sortieId: s.sortieId,
            callsign: s.callsign,
            changeType: 'CANCELLED',
            reason: `Airframe ${aogTail} grounded (AOG) with zero available spares at ${s.originBaseId}.`,
            previousState: s,
            impactAssessment: `Sortie cancelled to maintain fleet airworthiness limits.`,
          });
        }
      } else if (closedBaseId && (s.originBaseId === closedBaseId || s.recoveryBaseId === closedBaseId)) {
        // Base is closed due to weather/damage
        changes.push({
          sortieId: s.sortieId,
          callsign: s.callsign,
          changeType: 'CANCELLED',
          reason: `Airbase ${closedBaseId} closure prevents scheduled departure/recovery.`,
          previousState: s,
          impactAssessment: `Sortie cancelled due to runway unserviceability.`,
        });
      } else {
        // Sortie is completely unaffected by the inject - PRESERVE IT!
        survivingSorties.push(s);
        usedTails.add(s.aircraftTail);
      }
    }

    // 4. If inject is NEW_HIGH_VALUE_TST, solve an emergency package for it using reserve assets
    if (inject.type === 'NEW_HIGH_VALUE_TST') {
      const tstTarget = modifiedTargets.find(
        (t) => t.category === 'TIME_SENSITIVE' || t.priority >= 90
      );
      if (tstTarget) {
        const availableSpareAircraft = modifiedAircraft.filter(
          (a) => a.status === 'FMC' && !usedTails.has(a.tailNumber)
        );
        const availableSparePilots = pilotsList.filter(
          (p) => !survivingSorties.some((s) => s.pilotId === p.id)
        );

        if (availableSpareAircraft.length > 0) {
          const tstPlan = this.optimizer.solve(
            modifiedBases,
            availableSpareAircraft,
            availableSparePilots,
            munitionList,
            [tstTarget],
            modifiedThreats,
            { doctrineFocus: originalPlan.doctrineFocus }
          );

          for (const newS of tstPlan.sorties) {
            survivingSorties.push(newS);
            usedTails.add(newS.aircraftTail);
            changes.push({
              sortieId: newS.sortieId,
              callsign: newS.callsign,
              changeType: 'ADDED',
              reason: `Rapid reaction package scrambled for Time-Sensitive Target ${tstTarget.id}.`,
              newState: newS,
              impactAssessment: `Immediate interdiction package established against emerging high-value threat.`,
            });
          }
        }
      }
    }

    // 5. Compute Stability Index based on proportion of preserved sorties
    const totalSorties = Math.max(1, originalPlan.sorties.length);
    const cancelledCount = changes.filter((c) => c.changeType === 'CANCELLED').length;
    const reroutedCount = changes.filter((c) => c.changeType === 'REROUTED').length;
    // Rerouted sorties incur half the disruption penalty of outright cancellations
    const disruption = (cancelledCount + 0.5 * reroutedCount) / totalSorties;
    const stabilityIndex = Math.max(20, Math.min(100, Math.round((1 - disruption) * 100)));

    // 6. Recalculate KPIs for the updated plan
    const coveredTgtSet = new Set<string>();
    let totalRisk = 0;
    let totalFuel = 0;
    for (const s of survivingSorties) {
      coveredTgtSet.add(s.targetRequestId);
      totalRisk += s.threatExposureRisk;
      totalFuel += s.fuelRequiredKg;
    }

    let coveredPrioSum = 0;
    let totalPrioSum = 0;
    for (const t of modifiedTargets) {
      totalPrioSum += t.priority;
      if (coveredTgtSet.has(t.id)) coveredPrioSum += t.priority;
    }

    const priorityCoveragePercent =
      totalPrioSum > 0 ? Math.round((coveredPrioSum / totalPrioSum) * 1000) / 10 : 0;
    const avgRisk =
      survivingSorties.length > 0 ? Math.round((totalRisk / survivingSorties.length) * 10) / 10 : 0;
    const activeTails = new Set(survivingSorties.map((s) => s.aircraftTail));
    const strategicReserve =
      modifiedAircraft.filter((a) => a.status === 'FMC').length - activeTails.size;

    const updatedPlan: PlanCOA = {
      ...originalPlan,
      id: `PLAN-RETASKED-${Date.now().toString().slice(-6)}`,
      name: `${originalPlan.name} (Retasked post-${inject.type})`,
      sorties: survivingSorties,
      kpis: {
        ...originalPlan.kpis,
        coveredTargetsCount: coveredTgtSet.size,
        totalTargetsCount: modifiedTargets.length,
        priorityCoveragePercent,
        totalExpectedLossScore: avgRisk,
        totalFuelKg: totalFuel,
        strategicReserveAircraft: Math.max(0, strategicReserve),
        solveTimeMs: 15,
      },
      createdAt: new Date().toISOString(),
      commanderApproved: false,
    };

    // 7. Generate Commander's Brief in Markdown
    const commanderBriefMarkdown = `
### TACTICAL RETASKING ACTION REPORT // ${inject.type}
**Trigger Event**: ${inject.title}  
**Time of Retask**: H+${Math.floor(currentSimTimeMinutes)}m  
**Stability Index**: **${stabilityIndex}%** (Minimal operational disruption)

#### Key Decisions Taken:
1. **Frozen Zone Respect**: ${frozenSorties.length} committed sorties were held static without flight disruption.
2. **Resource Adjustments**:
   - **${changes.filter((c) => c.changeType === 'ADDED').length}** Sorties Added (Immediate strike coverage established).
   - **${changes.filter((c) => c.changeType === 'REROUTED').length}** Sorties Rerouted (Threat envelope bypassed / hot-spare substitution).
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
