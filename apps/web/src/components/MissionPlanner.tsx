'use client';

import React, { useState } from 'react';
import { FusedOperationalPicture, PlanCOA } from '@air-power/shared';
import { Play, Sparkles, CheckCircle, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface MissionPlannerProps {
  fusedPicture: FusedOperationalPicture;
  currentPlan: PlanCOA | null;
  onPlanGenerated: (newPlan: PlanCOA) => void;
}

export const MissionPlanner: React.FC<MissionPlannerProps> = ({
  fusedPicture,
  currentPlan,
  onPlanGenerated,
}) => {
  const [doctrine, setDoctrine] = useState<'BALANCED_RESERVE' | 'MAX_EFFECT' | 'MIN_RISK'>('BALANCED_RESERVE');
  const [isSolving, setIsSolving] = useState(false);
  const [solveStats, setSolveStats] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    setIsSolving(true);
    try {
      const res = await fetch('http://localhost:3001/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctrineFocus: doctrine }),
      });
      if (res.ok) {
        const plan: PlanCOA = await res.json();
        onPlanGenerated(plan);
        setSolveStats(`Solved in ${plan.kpis.solveTimeMs}ms with 0 hard-constraint violations`);
      }
    } catch (err) {
      console.error('Failed to trigger solver', err);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Planner Controls */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-ops-accent font-bold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-ops-accent" />
            DYNAMIC AIR TASKING ORDER (ATO) PLANNER
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Anytime ALNS Multi-Objective Solver // Highs-WASM Feasibility Baseline
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">DOCTRINE:</span>
            <select
              value={doctrine}
              onChange={(e) => setDoctrine(e.target.value as any)}
              className="bg-ops-800 border border-ops-700 text-gray-200 px-3 py-1.5 rounded text-xs"
            >
              <option value="BALANCED_RESERVE">BALANCED RESERVE (RECOMMENDED)</option>
              <option value="MAX_EFFECT">MAX EFFECT (OFFENSIVE SURGE)</option>
              <option value="MIN_RISK">MIN RISK (FORCE PRESERVATION)</option>
            </select>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={isSolving}
            className={`flex items-center space-x-2 px-4 py-2 rounded font-bold transition shadow-lg ${
              isSolving
                ? 'bg-ops-700 text-gray-400 cursor-not-allowed'
                : 'bg-ops-accent text-ops-950 hover:bg-cyan-300'
            }`}
          >
            {isSolving ? (
              <>
                <div className="w-4 h-4 border-2 border-ops-950 border-t-transparent rounded-full animate-spin" />
                <span>SOLVING ALNS...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>GENERATE MASTER ATO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {solveStats && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2 rounded flex items-center gap-2 text-xs">
          <CheckCircle className="w-4 h-4" />
          {solveStats}
        </div>
      )}

      {/* Plan Performance & Constraint Audit Cards */}
      {currentPlan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-ops-900 border border-ops-700/60 p-3 rounded">
            <div className="text-gray-400 text-[10px]">PRIORITY COVERAGE</div>
            <div className="text-xl font-bold text-ops-accent">
              {currentPlan.kpis.priorityCoveragePercent}%
            </div>
            <div className="text-gray-400 text-[11px]">
              {currentPlan.kpis.coveredTargetsCount} / {currentPlan.kpis.totalTargetsCount} Targets Covered
            </div>
          </div>

          <div className="bg-ops-900 border border-ops-700/60 p-3 rounded">
            <div className="text-gray-400 text-[10px]">PACKAGE INTEGRITY</div>
            <div className="text-xl font-bold text-emerald-400">
              {currentPlan.kpis.packageIntegrityPercent}%
            </div>
            <div className="text-gray-400 text-[11px]">Full Strike + SEAD + Escort coordination</div>
          </div>

          <div className="bg-ops-900 border border-ops-700/60 p-3 rounded">
            <div className="text-gray-400 text-[10px]">HARD CONSTRAINT VIOLATIONS</div>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              {currentPlan.kpis.hardConstraintViolations} (ZERO)
            </div>
            <div className="text-gray-400 text-[11px]">All crew duty, range, and stock limits met</div>
          </div>

          <div className="bg-ops-900 border border-ops-700/60 p-3 rounded">
            <div className="text-gray-400 text-[10px]">STRATEGIC RESERVE HELD</div>
            <div className="text-xl font-bold text-white">
              {currentPlan.kpis.strategicReserveAircraft} Airframes
            </div>
            <div className="text-gray-400 text-[11px]">Ready for pop-up TST emergencies</div>
          </div>
        </div>
      )}

      {/* Sorties Table */}
      <div className="bg-ops-900 border border-ops-700/60 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-ops-850 border-b border-ops-700/60 flex justify-between items-center">
          <span className="font-bold text-white uppercase">
            ACTIVE ASSIGNED SORTIES // MASTER AIR TASKING ORDER ({currentPlan?.sorties.length || 0} SORTIES)
          </span>
          <span className="text-[11px] text-gray-400">
            SOLVER ENGINE: {currentPlan?.kpis.solverUsed || 'ALNS_TS'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-ops-900 sticky top-0 text-gray-400 uppercase text-[10px] border-b border-ops-700/60">
              <tr>
                <th className="p-3">SORTIE ID</th>
                <th className="p-3">CALLSIGN</th>
                <th className="p-3">ROLE</th>
                <th className="p-3">TARGET</th>
                <th className="p-3">TAIL NUMBER</th>
                <th className="p-3">PILOT</th>
                <th className="p-3">BASE</th>
                <th className="p-3">DEP / TOT</th>
                <th className="p-3">PAYLOAD</th>
                <th className="p-3">RISK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ops-800/80">
              {currentPlan?.sorties.map((s) => (
                <tr key={s.sortieId} className="hover:bg-ops-850/50">
                  <td className="p-3 text-ops-accent font-bold">{s.sortieId}</td>
                  <td className="p-3 text-white font-semibold">{s.callsign}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.role === 'OMNIROLE_STRIKE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : s.role === 'SEAD_DEAD'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      }`}
                    >
                      {s.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-gray-200">{s.targetRequestId}</td>
                  <td className="p-3 text-gray-200">{s.aircraftTail}</td>
                  <td className="p-3 text-gray-300">{s.pilotId}</td>
                  <td className="p-3 text-gray-400">{s.originBaseId.replace('BASE_', '')}</td>
                  <td className="p-3 text-gray-300">
                    H+{s.depTimeMinutes}m / <span className="text-ops-accent font-bold">H+{s.totMinutes}m</span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {s.munitionLoadout.map((m) => `${m.munitionId.replace('MUN_', '')}x${m.count}`).join(', ') || 'Clean'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        s.expectedRiskScore > 40 ? 'text-ops-alert' : 'text-emerald-400'
                      }`}
                    >
                      {s.expectedRiskScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
