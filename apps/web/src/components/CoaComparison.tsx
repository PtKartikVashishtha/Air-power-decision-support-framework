'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA } from '@air-power/shared';
import { Panel } from './primitives/LayoutPrimitives';

interface CoaComparisonProps {
  onSelectCoa: (plan: PlanCOA) => void;
}

interface ParetoPoint {
  id: string;
  name: string;
  dialPosition: number;
  objectives: {
    targetValue: number;
    threatRisk: number;
    reserveCount: number;
    fuelConsumptionTons: number;
  };
  plan: PlanCOA;
  isParetoOptimal: boolean;
}

interface RobustEvaluation {
  nominalPlan: PlanCOA;
  robustPlan: PlanCOA;
  scenariosEvaluatedCount: number;
  nominalMeanSurvivalRate: number;
  robustMeanSurvivalRate: number;
  chanceConstraintMet: boolean;
  priceOfRobustnessPercent: number;
  conformalInterval90: {
    lowerBoundScore: number;
    upperBoundScore: number;
    coverageConfidencePercent: number;
  };
  executiveRationale: string;
}

export const CoaComparison: React.FC<CoaComparisonProps> = ({ onSelectCoa }) => {
  const [coas, setCoas] = useState<{
    maxEffectCoa: PlanCOA;
    minRiskCoa: PlanCOA;
    balancedReserveCoa: PlanCOA;
    recommendedCoaId: string;
  } | null>(null);

  const [paretoFrontier, setParetoFrontier] = useState<ParetoPoint[]>([]);
  const [commanderDial, setCommanderDial] = useState<number>(0.5);
  const [robustEval, setRobustEval] = useState<RobustEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [robustLoading, setRobustLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoasAndPareto();
  }, []);

  const fetchCoasAndPareto = async () => {
    setLoading(true);
    try {
      const [coaRes, paretoRes] = await Promise.all([
        fetch('http://localhost:3001/api/plan/coas'),
        fetch('http://localhost:3001/api/solver/pareto'),
      ]);

      if (coaRes.ok) {
        const data = await coaRes.json();
        setCoas(data);
        setSelectedId(data.recommendedCoaId);
      }

      if (paretoRes.ok) {
        const pData = await paretoRes.json();
        setParetoFrontier(pData.frontierPoints || []);
      }
    } catch (err) {
      console.error('Failed to load COAs and Pareto frontier', err);
    } finally {
      setLoading(false);
    }
  };

  const evaluateRobustStochastic = async () => {
    setRobustLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/solver/robust');
      if (res.ok) {
        const data = await res.json();
        setRobustEval(data);
      }
    } catch (err) {
      console.error('Failed to evaluate robust planning', err);
    } finally {
      setRobustLoading(false);
    }
  };

  // Find Pareto point closest to commanderDial
  const activeDialPoint = React.useMemo(() => {
    if (paretoFrontier.length === 0) return null;
    let closest = paretoFrontier[0];
    let minDiff = Math.abs(paretoFrontier[0].dialPosition - commanderDial);
    for (const pt of paretoFrontier) {
      const diff = Math.abs(pt.dialPosition - commanderDial);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest;
  }, [paretoFrontier, commanderDial]);

  if (loading || !coas) {
    return (
      <div className="p-8 text-center font-mono text-xs text-on-surface-variant bg-surface-container-lowest border border-outline-variant">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        COMPUTING MULTI-OBJECTIVE PARETO FRONTIER &amp; TRIPLE DOCTRINE COAS...
      </div>
    );
  }

  const coaList = [
    { key: 'BALANCED', data: coas.balancedReserveCoa, label: 'COA 3: BALANCED RESERVE (RECOMMENDED)', highlight: true },
    { key: 'MAX_EFFECT', data: coas.maxEffectCoa, label: 'COA 1: MAX EFFECT (OFFENSIVE SURGE)', highlight: false },
    { key: 'MIN_RISK', data: coas.minRiskCoa, label: 'COA 2: MIN RISK (FORCE PRESERVATION)', highlight: false },
  ];

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* 1. Commander's Intent Dial (Real-Time Pareto Frontier Slider) */}
      <Panel
        title="COMMANDER'S INTENT DIAL // MULTI-OBJECTIVE PARETO CONTROLLER"
        subtitle="Real-Time Interpolation Across the Non-Dominated Trade-Off Frontier (Value ↔ Risk ↔ Strategic Reserve)"
        badge={
          <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed border border-secondary text-[10px] font-bold font-mono">
            {paretoFrontier.length} NON-DOMINATED POINTS
          </span>
        }
      >
        <div className="space-y-4">
          {/* Dial Slider */}
          <div className="p-4 bg-surface-container-low border border-outline-variant">
            <div className="flex items-center justify-between mb-2 font-mono text-xs">
              <span className="text-emerald-700 font-bold">0.00 FORCE PROTECTION (MIN RISK)</span>
              <span className="text-primary font-bold text-sm">
                DIAL SETTING: {commanderDial.toFixed(2)} [
                {commanderDial < 0.35
                  ? 'FORCE PROTECTION'
                  : commanderDial > 0.65
                  ? 'OFFENSIVE SURGE'
                  : 'BALANCED DOCTRINE'}
                ]
              </span>
              <span className="text-rose-700 font-bold">1.00 MAXIMUM SURGE (OFFENSIVE)</span>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={commanderDial}
              onChange={(e) => setCommanderDial(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-surface-container rounded-lg accent-secondary cursor-pointer"
            />

            {/* Dial Active Metrics */}
            {activeDialPoint && (
              <div className="mt-4 p-3 bg-surface-container-lowest border border-outline-variant grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-on-surface-variant">PARETO DESIGNATION</div>
                  <div className="text-primary font-bold truncate">{activeDialPoint.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant">TARGET COVERAGE (f1)</div>
                  <div className="text-secondary font-bold">{activeDialPoint.objectives.targetValue}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant">FLEET THREAT RISK (f2)</div>
                  <div className="text-rose-700 font-bold">{activeDialPoint.objectives.threatRisk} / 100</div>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant">STRATEGIC RESERVE (f3)</div>
                  <div className="text-emerald-800 font-bold">{activeDialPoint.objectives.reserveCount} Airframes</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* 2. Side-by-Side COA Cards */}
      <Panel
        title="COMMANDER'S COURSE OF ACTION (COA) COMPARISON STUDIO"
        subtitle="Multi-Doctrine Trade-Off Analysis // Side-by-Side KPI Evaluation"
        badge={
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold font-mono">
            3 PARETO COAS READY
          </span>
        }
        actions={
          <button
            onClick={fetchCoasAndPareto}
            className="flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold transition"
          >
            <span className="material-symbols-outlined text-[13px]">sync</span>
            <span>RE-EVALUATE COAS</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full min-w-0">
          {coaList.map(({ key, data, label, highlight }) => {
            const isSelected = selectedId === data.id;

            return (
              <div
                key={key}
                className={`p-3.5 flex flex-col justify-between gap-3 border transition ${
                  isSelected
                    ? 'bg-surface-container-lowest border-2 border-secondary shadow-sm'
                    : highlight
                    ? 'bg-surface-container-lowest border-secondary/60'
                    : 'bg-surface-container-low border-outline-variant'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        highlight
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                      }`}
                    >
                      {data.doctrineFocus}
                    </span>
                    {highlight && (
                      <span className="text-[10px] text-secondary font-bold font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>DOCTRINE CHOICE</span>
                      </span>
                    )}
                  </div>

                  <div className="text-primary font-bold text-xs uppercase mb-1">{label}</div>
                  <div className="text-on-surface-variant text-[11px] leading-relaxed mb-3">{data.description}</div>

                  <div className="space-y-1.5 border-t border-b border-outline-variant/40 py-2.5 my-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Target Coverage:</span>
                      <span className="text-secondary font-bold">{data.kpis.priorityCoveragePercent}%</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Package Coordination:</span>
                      <span className="text-emerald-800 font-bold">{data.kpis.packageIntegrityPercent}%</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Expected Fleet Risk:</span>
                      <span className="font-bold text-primary">{data.kpis.totalExpectedLossScore} / 100</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Strategic Reserve Held:</span>
                      <span className="text-primary font-bold">{data.kpis.strategicReserveAircraft} Airframes</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Fuel Required:</span>
                      <span className="text-on-surface-variant font-bold">{Math.round(data.kpis.totalFuelKg / 1000)} Tons</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Solve Latency:</span>
                      <span className="text-on-surface-variant">{data.kpis.solveTimeMs} ms</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedId(data.id);
                    onSelectCoa(data);
                  }}
                  className={`w-full py-2 font-bold font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container text-primary border border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isSelected ? 'check_circle' : 'task_alt'}
                  </span>
                  <span>{isSelected ? 'ACTIVE COMMANDER PLAN' : 'SELECT & COMMIT COA'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 3. Robust Stochastic Planning & Price of Robustness Dashboard */}
      <Panel
        title="ROBUST STOCHASTIC WARGAME // TWO-STAGE UNCERTAINTY EVALUATION"
        subtitle="Chance-Constraint Verification Across 8 Monte Carlo Combat Realizations (AOG Hydraulic Snags, Base Closures, SAM Pops)"
        actions={
          <button
            onClick={evaluateRobustStochastic}
            disabled={robustLoading}
            className="flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold transition disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[13px]">military_tech</span>
            <span>{robustLoading ? 'EVALUATING SCENARIOS...' : 'RUN STOCHASTIC AUDIT'}</span>
          </button>
        }
      >
        {robustEval ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-sans text-xs">
              <span className="font-bold font-mono">EXECUTIVE RATIONALE: </span>
              {robustEval.executiveRationale}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-container-low border border-outline-variant text-center">
                <div className="text-[10px] text-on-surface-variant">PRICE OF ROBUSTNESS (PoR)</div>
                <div className="text-xl font-bold text-amber-700">{robustEval.priceOfRobustnessPercent}%</div>
                <div className="text-[10px] text-on-surface-variant">Nominal Score Trade-Off</div>
              </div>

              <div className="p-3 bg-surface-container-low border border-outline-variant text-center">
                <div className="text-[10px] text-on-surface-variant">SURVIVAL RESILIENCE GAIN</div>
                <div className="text-xl font-bold text-emerald-800">
                  +{Math.round((robustEval.robustMeanSurvivalRate - robustEval.nominalMeanSurvivalRate) * 10) / 10}%
                </div>
                <div className="text-[10px] text-emerald-800 font-semibold">
                  {robustEval.nominalMeanSurvivalRate}% → {robustEval.robustMeanSurvivalRate}%
                </div>
              </div>

              <div className="p-3 bg-surface-container-low border border-outline-variant text-center">
                <div className="text-[10px] text-on-surface-variant">CHANCE CONSTRAINT P(≥90%)</div>
                <div className="text-xl font-bold text-primary">
                  {robustEval.chanceConstraintMet ? 'SATISFIED (✓)' : 'INSPECTION REQUIRED'}
                </div>
                <div className="text-[10px] text-on-surface-variant">Package Viability Under Recourse</div>
              </div>

              <div className="p-3 bg-surface-container-low border border-outline-variant text-center">
                <div className="text-[10px] text-on-surface-variant">CONFORMAL 90% INTERVAL</div>
                <div className="text-base font-bold text-primary">
                  [{robustEval.conformalInterval90.lowerBoundScore}, {robustEval.conformalInterval90.upperBoundScore}]
                </div>
                <div className="text-[10px] text-on-surface-variant">Calibrated Coverage Bound</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-container-low border border-outline-variant text-center font-mono text-xs text-on-surface-variant">
            Click &quot;RUN STOCHASTIC AUDIT&quot; to evaluate the two-stage recourse model across 8 Monte Carlo disruption realizations and quantify the Price of Robustness.
          </div>
        )}
      </Panel>
    </div>
  );
};
