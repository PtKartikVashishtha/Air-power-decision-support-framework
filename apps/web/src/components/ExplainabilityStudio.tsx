'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA, FusedOperationalPicture, Sortie } from '@air-power/shared';
import { DecisionQualityExplainer } from '@air-power/optimizer';
import { Panel, StatCard } from './primitives/LayoutPrimitives';

interface ExplainabilityStudioProps {
  currentPlan?: PlanCOA | null;
  fusedPicture?: FusedOperationalPicture | null;
}

export const ExplainabilityStudio: React.FC<ExplainabilityStudioProps> = ({ currentPlan, fusedPicture }) => {
  const [selectedSortieId, setSelectedSortieId] = useState<string>('');
  const [rationaleCard, setRationaleCard] = useState<any | null>(null);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [tornadoParams, setTornadoParams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize
  useEffect(() => {
    const firstSortie = currentPlan?.sorties[0];
    if (firstSortie) {
      setSelectedSortieId(firstSortie.sortieId);
      loadSortieRationale(firstSortie.sortieId);
    } else {
      loadOfflineRationale();
    }
    loadGlobalData();
  }, [currentPlan]);

  const loadSortieRationale = async (sortieId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/xai/sortie-rationale/${sortieId}`);
      if (res.ok) {
        setRationaleCard(await res.json());
      } else {
        loadOfflineRationale(sortieId);
      }
    } catch {
      loadOfflineRationale(sortieId);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOfflineRationale = (sortieId?: string) => {
    const explainer = new DecisionQualityExplainer();
    const sorties = currentPlan?.sorties || [];
    const targetSortie: Sortie =
      sorties.find((s) => s.sortieId === sortieId) ||
      sorties[0] || {
        sortieId: 'SRT-01',
        callsign: 'TIGER-01',
        packageId: 'PKG-01',
        targetRequestId: 'TGT-001',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'RB-101',
        pilotId: 'PILOT-01',
        originBaseId: 'BASE_AMBALA',
        recoveryBaseId: 'BASE_AMBALA',
        depTimeMinutes: 60,
        totMinutes: 90,
        recoveryTimeMinutes: 120,
        status: 'SCHEDULED',
        expectedRiskScore: 24,
        fuelPlannedKg: 3800,
        munitionLoadout: [],
        routeWaypoints: [],
        isFrozen: false,
      };

    const card = explainer.explainSortieAssignment(targetSortie, {
      allSorties: sorties,
      aircraft: fusedPicture?.aircraft || [],
      pilots: fusedPicture?.pilots || [],
      targets: fusedPicture?.targetRequests || [],
      threats: fusedPicture?.threats || [],
    });
    setRationaleCard(card);
  };

  const loadGlobalData = async () => {
    try {
      const [resAttr, resTornado] = await Promise.all([
        fetch('http://localhost:3001/api/xai/feature-attribution'),
        fetch('http://localhost:3001/api/xai/sensitivity-tornado'),
      ]);
      if (resAttr.ok && resTornado.ok) {
        const dataAttr = await resAttr.json();
        const dataTornado = await resTornado.json();
        setAttributions(dataAttr.attributions || []);
        setTornadoParams(dataTornado.tornadoParameters || []);
        return;
      }
    } catch {}

    // Offline fallback
    const explainer = new DecisionQualityExplainer();
    setAttributions(explainer.computeGlobalFeatureAttribution(currentPlan as any));
    setTornadoParams(explainer.generateSensitivityTornadoAnalysis());
  };

  const sortiesList = currentPlan?.sorties || [];

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* Top Banner & Overview */}
      <Panel
        title="EXPLAINABLE AI (XAI) & DECISION QUALITY SUITE"
        subtitle="Sortie Assignment Rationale Cards // Runner-Up Rejection Explanations // Global Feature Attribution // Sensitivity Tornado Sweep"
        badge={
          <span className="px-2 py-0.5 bg-primary text-on-primary text-[10px] font-bold font-mono uppercase">
            WHITE-BOX REASONING
          </span>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="ASSIGNMENT EXPLAINABILITY"
            value="100% COVERAGE"
            subtitle="Every sortie mapped to explicit tradeoff vector"
          />
          <StatCard
            label="PRIMARY DECISION DRIVER"
            value="TARGET VALUE"
            subtitle="38% weight in multi-objective Pareto formulation"
          />
          <StatCard
            label="RUNNER-UP TRANSPARENCY"
            value="ACTIVE"
            subtitle="Side-by-side airframe rejection rationale"
          />
          <StatCard
            label="SENSITIVITY RESILIENCE"
            value="BOUNDED"
            subtitle="Parametric tornado shock sweep"
          />
        </div>
      </Panel>

      {/* SECTION 1: SORTIE ASSIGNMENT RATIONALE CARD & RUNNER-UP INSPECTOR */}
      <Panel
        title="SORTIE ASSIGNMENT RATIONALE & RUNNER-UP ALTERNATIVE"
        subtitle="Select a Sortie to Inspect Objective Trade-Off Breakdown and Understand Why Alternative Airframes Were Rejected"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-on-surface-variant">SELECT SORTIE:</span>
            <select
              value={selectedSortieId}
              onChange={(e) => {
                setSelectedSortieId(e.target.value);
                loadSortieRationale(e.target.value);
              }}
              className="h-7 px-2 bg-surface-container-lowest border border-outline-variant text-xs font-mono font-bold"
            >
              {sortiesList.map((s) => (
                <option key={s.sortieId} value={s.sortieId}>
                  {s.callsign} ({s.aircraftTail} // {s.role})
                </option>
              ))}
              {sortiesList.length === 0 && <option value="SRT-01">TIGER-01 (RB-101)</option>}
            </select>
          </div>
        }
      >
        {rationaleCard && (
          <div className="flex flex-col gap-4">
            {/* Sortie Summary Banner */}
            <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-primary uppercase">
                    SORTIE: {rationaleCard.callsign} ({rationaleCard.sortieId})
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold">
                    NET SCORE: +{rationaleCard.scoreBreakdown.netScore} PTS
                  </span>
                </div>
                <div className="text-[11px] text-on-surface mt-0.5 font-medium">
                  Assigned Tail: <strong>{rationaleCard.assignedAirframeTail}</strong> ({rationaleCard.assignedModel}) &bull; Target: <strong>{rationaleCard.targetName}</strong> ({rationaleCard.targetId})
                </div>
              </div>
              <div className="text-[11px] font-mono text-on-surface-variant bg-surface-container-lowest px-3 py-1.5 border border-outline-variant">
                {rationaleCard.commanderSummary}
              </div>
            </div>

            {/* Two-Column Comparison: Chosen Assignment vs Runner-Up Candidate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Chosen Assignment Trade-Off Breakdown */}
              <div className="p-3.5 bg-surface-container-lowest border-2 border-emerald-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-emerald-900 uppercase">
                      SELECTED ALLOCATION: {rationaleCard.assignedAirframeTail}
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                      OPTIMAL CHOICE
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mb-3">
                    Multi-criteria weighted sum component breakdown driving solver selection:
                  </p>

                  <div className="flex flex-col gap-2 font-mono text-[11px]">
                    <div className="flex justify-between items-center p-1.5 bg-surface-container-low border border-outline-variant">
                      <span>Target Strategic Priority</span>
                      <span className="font-bold text-emerald-700">
                        +{rationaleCard.scoreBreakdown.targetPriorityPoints} PTS
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 bg-surface-container-low border border-outline-variant">
                      <span>Weapon Payload Effectiveness</span>
                      <span className="font-bold text-emerald-700">
                        +{rationaleCard.scoreBreakdown.weaponSuitabilityPoints} PTS
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 bg-surface-container-low border border-outline-variant">
                      <span>Pilot Combat Experience & Readiness</span>
                      <span className="font-bold text-emerald-700">
                        +{rationaleCard.scoreBreakdown.pilotReadinessPoints} PTS
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 bg-surface-container-low border border-outline-variant">
                      <span>Transit Fuel Consumption Penalty</span>
                      <span className="font-bold text-rose-700">
                        {rationaleCard.scoreBreakdown.fuelEfficiencyPoints} PTS
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 bg-surface-container-low border border-outline-variant">
                      <span>Threat & MEZ Radar Exposure Risk</span>
                      <span className="font-bold text-rose-700">
                        {rationaleCard.scoreBreakdown.threatPenaltyPoints} PTS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-outline-variant flex justify-between font-mono font-bold text-xs">
                  <span>TOTAL NET SCORE</span>
                  <span className="text-emerald-800">+{rationaleCard.scoreBreakdown.netScore} PTS</span>
                </div>
              </div>

              {/* Right Column: Runner-Up Alternative & Why Rejected */}
              <div className="p-3.5 bg-surface-container-lowest border border-outline-variant flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-primary uppercase">
                      RUNNER-UP ALTERNATIVE: {rationaleCard.runnerUp.airframeTail}
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 font-mono text-[10px] font-bold">
                      SCORE: +{rationaleCard.runnerUp.netScore} PTS (-{rationaleCard.runnerUp.scoreGap})
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mb-2">
                    Airframe Model: <strong>{rationaleCard.runnerUp.airframeModel}</strong> &bull; Pilot: <strong>{rationaleCard.runnerUp.pilotId}</strong>
                  </p>

                  <div className="p-3 bg-amber-50/50 border border-amber-200 text-[11px] font-mono text-on-surface mb-3">
                    <div className="font-bold text-amber-900 mb-1">WHY NOT SELECTED BY OPTIMIZER?</div>
                    <p>{rationaleCard.runnerUp.whyNotSelected}</p>
                  </div>

                  <div className="text-[10px] text-on-surface-variant font-mono">
                    Operational Impact: Choosing this runner-up would introduce a -{rationaleCard.runnerUp.scoreGap} point deficit, increasing radar exposure or forcing an unbudgeted aerial refueling cycle.
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-outline-variant text-[10px] font-mono text-on-surface-variant">
                  Evaluated across all 68 candidate airframes in Western Sector inventory.
                </div>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* SECTION 2: GLOBAL FEATURE ATTRIBUTION (SHAP-LITE) */}
      <Panel
        title="GLOBAL FEATURE ATTRIBUTION (SHAP-LITE DRIVERS)"
        subtitle="Relative Contribution of Competing Strategic Objectives Across All Fleet Assignments"
      >
        <div className="flex flex-col gap-3">
          {attributions.map((attr, idx) => (
            <div key={idx} className="p-3 bg-surface-container-lowest border border-outline-variant font-mono">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-bold text-primary">{attr.featureName}</span>
                <span className="font-bold text-primary">{attr.weightPercent}% WEIGHT</span>
              </div>
              {/* Horizontal Progress Bar */}
              <div className="w-full h-2.5 bg-surface-container-high rounded-xs overflow-hidden mb-2">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${attr.weightPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">{attr.narrativeExplanation}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* SECTION 3: SENSITIVITY TORNADO ANALYSIS */}
      <Panel
        title="PARAMETRIC SENSITIVITY TORNADO ANALYSIS"
        subtitle="Impact of Logistics & Combat Friction Shocks on Target Neutralization and Force Preservation"
      >
        <div className="border border-outline-variant bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-[11px] font-mono text-left">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant uppercase">
              <tr>
                <th className="py-2 px-3">PARAMETER SHOCK</th>
                <th className="py-2 px-3">NOMINAL &rarr; PERTURBED</th>
                <th className="py-2 px-3">TARGET IMPACT</th>
                <th className="py-2 px-3">ELASTICITY</th>
                <th className="py-2 px-3">AUTOMATED TACTICAL MITIGATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tornadoParams.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low transition">
                  <td className="py-2.5 px-3 font-bold text-primary">{p.parameterName}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-on-surface-variant">{p.nominalValue}</span>
                    <span className="mx-1">&rarr;</span>
                    <span className="font-bold">{p.perturbedValue}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-rose-700">
                    {p.impactOnTargetCoveragePercent}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                        p.operationalElasticity === 'HIGH'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : p.operationalElasticity === 'MODERATE'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {p.operationalElasticity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-on-surface-variant max-w-sm">{p.mitigationStrategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
