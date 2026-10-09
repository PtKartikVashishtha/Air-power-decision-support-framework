'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA } from '@air-power/shared';
import { Panel, TruncatedText } from './primitives/LayoutPrimitives';

interface CoaComparisonProps {
  onSelectCoa: (plan: PlanCOA) => void;
}

export const CoaComparison: React.FC<CoaComparisonProps> = ({ onSelectCoa }) => {
  const [coas, setCoas] = useState<{
    maxEffectCoa: PlanCOA;
    minRiskCoa: PlanCOA;
    balancedReserveCoa: PlanCOA;
    recommendedCoaId: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoas();
  }, []);

  const fetchCoas = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/plan/coas');
      if (res.ok) {
        const data = await res.json();
        setCoas(data);
        setSelectedId(data.recommendedCoaId);
      }
    } catch (err) {
      console.error('Failed to load COAs', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !coas) {
    return (
      <div className="p-8 text-center font-mono text-xs text-on-surface-variant bg-surface-container-lowest border border-outline-variant">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        GENERATING TRIPLE TACTICAL COURSES OF ACTION (COA)...
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
            onClick={fetchCoas}
            className="flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold transition"
          >
            <span className="material-symbols-outlined text-[13px]">sync</span>
            <span>RE-EVALUATE COAS</span>
          </button>
        }
      >
        {/* Side-by-Side COA Cards */}
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

                  {/* KPI Metrics List */}
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

                {/* Action Button */}
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
    </div>
  );
};
