'use client';

import React, { useState } from 'react';
import { PlanCOA, FusedOperationalPicture } from '@air-power/shared';
import { GitFork, Play, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';

interface WhatIfSandboxProps {
  currentPlan: PlanCOA | null;
  fusedPicture: FusedOperationalPicture;
  onCommitForkedPlan: (plan: PlanCOA) => void;
}

export const WhatIfSandbox: React.FC<WhatIfSandboxProps> = ({
  currentPlan,
  fusedPicture,
  onCommitForkedPlan,
}) => {
  const [scenarioType, setScenarioType] = useState<
    'HALWARA_WEATHER_CLOSE' | 'SAM_CLUSTER_SURGE' | 'MASS_TST_ALERT'
  >('HALWARA_WEATHER_CLOSE');
  const [sandboxedPlan, setSandboxedPlan] = useState<PlanCOA | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      // Run what-if query against planner
      const res = await fetch('http://localhost:3001/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctrineFocus: 'MIN_RISK' }),
      });
      if (res.ok) {
        const plan: PlanCOA = await res.json();
        setSandboxedPlan({
          ...plan,
          name: `Sandboxed What-If: ${scenarioType.replace(/_/g, ' ')}`,
        });
      }
    } catch (err) {
      console.error('Failed to run what-if simulation', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-ops-accent font-bold text-sm flex items-center gap-2">
            <GitFork className="w-4 h-4 text-ops-accent" />
            WHAT-IF TACTICAL SANDBOX &amp; WARGAME SIMULATOR
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Non-Destructive Plan Forking // Stress-Testing Contingencies Without Live Plan Disruption
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={scenarioType}
            onChange={(e) => setScenarioType(e.target.value as any)}
            className="bg-ops-800 border border-ops-700 text-gray-200 px-3 py-1.5 rounded text-xs"
          >
            <option value="HALWARA_WEATHER_CLOSE">HYPOTHETICAL: FOB HALWARA WEATHER CLOSURE</option>
            <option value="SAM_CLUSTER_SURGE">HYPOTHETICAL: SECTOR NORTH SAM CLUSTER SURGE</option>
            <option value="MASS_TST_ALERT">HYPOTHETICAL: MULTIPLE FLEETING TST CONVOYS</option>
          </select>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="bg-ops-accent hover:bg-cyan-300 text-ops-950 font-bold px-4 py-1.5 rounded flex items-center gap-2 transition"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-ops-950 border-t-transparent rounded-full animate-spin" />
                <span>FORKING PLAN...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>SIMULATE FORK</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-Side Live Plan vs Sandboxed Fork */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live Master Plan */}
        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center border-b border-ops-800 pb-2">
            <span className="font-bold text-emerald-400 uppercase">ACTIVE LIVE MASTER PLAN</span>
            <span className="text-gray-400">COMMITTED</span>
          </div>

          {currentPlan ? (
            <div className="space-y-2 text-xs">
              <div className="text-white font-bold">{currentPlan.name}</div>
              <div className="flex justify-between text-gray-300">
                <span>Priority Coverage:</span>
                <span className="text-ops-accent font-bold">{currentPlan.kpis.priorityCoveragePercent}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Assigned Sorties:</span>
                <span className="font-bold">{currentPlan.sorties.length}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Expected Fleet Risk:</span>
                <span className="text-emerald-400 font-bold">{currentPlan.kpis.totalExpectedLossScore}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Reserve Airframes:</span>
                <span className="font-bold">{currentPlan.kpis.strategicReserveAircraft}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No active plan committed.</div>
          )}
        </div>

        {/* Sandboxed Plan */}
        <div className="bg-ops-900 border border-ops-accent/50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center border-b border-ops-800 pb-2">
            <span className="font-bold text-ops-accent uppercase">FORKED SANDBOX SCENARIO</span>
            <span className="text-amber-400 font-bold">UNCOMMITTED EXPERIMENT</span>
          </div>

          {sandboxedPlan ? (
            <div className="space-y-3 text-xs">
              <div className="text-white font-bold">{sandboxedPlan.name}</div>
              <div className="flex justify-between text-gray-300">
                <span>Hypothetical Coverage:</span>
                <span className="text-ops-accent font-bold">{sandboxedPlan.kpis.priorityCoveragePercent}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Re-tasked Sorties:</span>
                <span className="font-bold">{sandboxedPlan.sorties.length}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Hypothetical Risk:</span>
                <span className="text-amber-400 font-bold">{sandboxedPlan.kpis.totalExpectedLossScore}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Reserve Maintained:</span>
                <span className="font-bold">{sandboxedPlan.kpis.strategicReserveAircraft}</span>
              </div>

              <button
                onClick={() => onCommitForkedPlan(sandboxedPlan)}
                className="w-full py-2 bg-ops-success hover:bg-emerald-400 text-ops-950 font-bold rounded transition flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>PROMOTE FORK TO LIVE MASTER PLAN</span>
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 italic">
              Select a hypothetical contingency above and click &ldquo;SIMULATE FORK&rdquo; to test impacts safely without touching live operations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
