'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA } from '@air-power/shared';
import { CheckCircle2, ShieldAlert, Award, Fuel, Shield, Zap } from 'lucide-react';

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
      <div className="p-8 text-center font-mono text-xs text-gray-400">
        <div className="w-6 h-6 border-2 border-ops-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
    <div className="space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-ops-accent font-bold text-sm">
            COMMANDER&apos;S COURSE OF ACTION (COA) COMPARISON STUDIO
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Multi-Doctrine Trade-Off Analysis // Side-by-Side KPI Evaluation
          </div>
        </div>

        <button
          onClick={fetchCoas}
          className="bg-ops-800 hover:bg-ops-700 border border-ops-700 px-3 py-1.5 rounded text-gray-200 transition"
        >
          RE-EVALUATE COAS
        </button>
      </div>

      {/* Side-by-Side COA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coaList.map(({ key, data, label, highlight }) => {
          const isSelected = selectedId === data.id;

          return (
            <div
              key={key}
              className={`bg-ops-900 border rounded-lg p-4 flex flex-col justify-between transition shadow-xl ${
                isSelected
                  ? 'border-ops-accent ring-1 ring-ops-accent'
                  : highlight
                  ? 'border-ops-accent/40'
                  : 'border-ops-700/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      highlight ? 'bg-ops-accent text-ops-950' : 'bg-ops-800 text-gray-300'
                    }`}
                  >
                    {data.doctrineFocus}
                  </span>
                  {highlight && (
                    <span className="text-[10px] text-ops-accent flex items-center gap-1 font-bold">
                      <Award className="w-3 h-3" /> BEST FIT
                    </span>
                  )}
                </div>

                <div className="text-white font-bold text-sm mb-2">{label}</div>
                <div className="text-gray-400 text-[11px] mb-4">{data.description}</div>

                {/* KPI Metrics List */}
                <div className="space-y-2 border-t border-b border-ops-800/80 py-3 my-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Value Coverage:</span>
                    <span className="text-ops-accent font-bold">
                      {data.kpis.priorityCoveragePercent}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Package Coordination:</span>
                    <span className="text-emerald-400 font-bold">
                      {data.kpis.packageIntegrityPercent}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Expected Fleet Risk:</span>
                    <span
                      className={`font-bold ${
                        data.kpis.totalExpectedLossScore > 40 ? 'text-ops-alert' : 'text-emerald-400'
                      }`}
                    >
                      {data.kpis.totalExpectedLossScore} / 100
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Strategic Reserve Held:</span>
                    <span className="text-white font-bold">
                      {data.kpis.strategicReserveAircraft} Airframes
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Fuel Required:</span>
                    <span className="text-gray-300 font-bold">
                      {Math.round(data.kpis.totalFuelKg / 1000)} Tons
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Solve Latency:</span>
                    <span className="text-gray-400">{data.kpis.solveTimeMs} ms</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setSelectedId(data.id);
                  onSelectCoa(data);
                }}
                className={`w-full py-2 rounded font-bold transition flex items-center justify-center space-x-2 ${
                  isSelected
                    ? 'bg-ops-success text-ops-950'
                    : 'bg-ops-800 hover:bg-ops-700 text-gray-200'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ACTIVE COMMANDER PLAN</span>
                  </>
                ) : (
                  <span>SELECT & COMMIT COA</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
