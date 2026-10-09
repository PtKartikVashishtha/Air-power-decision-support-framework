'use client';

import React, { useState } from 'react';
import { PlanCOA, FusedOperationalPicture } from '@air-power/shared';
import { Panel } from './primitives/LayoutPrimitives';

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
    <div className="flex flex-col gap-4 w-full min-w-0">
      <Panel
        title="WHAT-IF TACTICAL SANDBOX & WARGAME SIMULATOR"
        subtitle="Non-Destructive Plan Forking // Stress-Testing Contingencies Without Live Plan Disruption"
        badge={
          <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold font-mono">
            SANDBOX ISOLATED
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as any)}
              className="bg-surface-container-lowest border border-outline-variant text-primary px-2.5 py-1 text-xs font-mono font-bold"
            >
              <option value="HALWARA_WEATHER_CLOSE">HYPOTHETICAL: FOB HALWARA WEATHER CLOSURE</option>
              <option value="SAM_CLUSTER_SURGE">HYPOTHETICAL: SECTOR NORTH SAM CLUSTER SURGE</option>
              <option value="MASS_TST_ALERT">HYPOTHETICAL: MULTIPLE FLEETING TST CONVOYS</option>
            </select>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className={`flex items-center gap-1 px-3 py-1 font-bold font-mono text-xs uppercase tracking-wider border transition shrink-0 ${
                isSimulating
                  ? 'bg-surface-container text-on-surface-variant border-outline-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary border-primary hover:bg-secondary'
              }`}
            >
              <span className={`material-symbols-outlined text-[14px] ${isSimulating ? 'animate-spin' : ''}`}>
                {isSimulating ? 'sync' : 'play_arrow'}
              </span>
              <span>{isSimulating ? 'FORKING...' : 'SIMULATE FORK'}</span>
            </button>
          </div>
        }
      >
        {/* Side-by-Side Live Plan vs Sandboxed Fork */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
          {/* Live Master Plan */}
          <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col justify-between gap-3">
            <div>
              <div className="flex justify-between items-center border-b border-outline-variant pb-1.5 mb-2 font-mono">
                <span className="font-bold text-emerald-800 uppercase text-xs">ACTIVE LIVE MASTER PLAN</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  COMMITTED
                </span>
              </div>

              {currentPlan ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className="text-primary font-bold">{currentPlan.name}</div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Priority Target Coverage:</span>
                    <span className="text-secondary font-bold">{currentPlan.kpis.priorityCoveragePercent}%</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Assigned Sorties:</span>
                    <span className="font-bold text-primary">{currentPlan.sorties.length}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Expected Fleet Risk:</span>
                    <span className="font-bold text-emerald-800">{currentPlan.kpis.totalExpectedLossScore}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Reserve Airframes Held:</span>
                    <span className="font-bold text-primary">{currentPlan.kpis.strategicReserveAircraft}</span>
                  </div>
                </div>
              ) : (
                <div className="text-on-surface-variant font-mono text-xs italic">No active plan committed.</div>
              )}
            </div>
          </div>

          {/* Sandboxed Plan */}
          <div className="p-3 bg-surface-container-lowest border-2 border-secondary flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex justify-between items-center border-b border-secondary/30 pb-1.5 mb-2 font-mono">
                <span className="font-bold text-secondary uppercase text-xs">FORKED SANDBOX SCENARIO</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  UNCOMMITTED EXPERIMENT
                </span>
              </div>

              {sandboxedPlan ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className="text-primary font-bold">{sandboxedPlan.name}</div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Hypothetical Coverage:</span>
                    <span className="text-secondary font-bold">{sandboxedPlan.kpis.priorityCoveragePercent}%</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Re-tasked Sorties:</span>
                    <span className="font-bold text-primary">{sandboxedPlan.sorties.length}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Hypothetical Risk:</span>
                    <span className="text-amber-800 font-bold">{sandboxedPlan.kpis.totalExpectedLossScore}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Reserve Maintained:</span>
                    <span className="font-bold text-primary">{sandboxedPlan.kpis.strategicReserveAircraft}</span>
                  </div>

                  <button
                    onClick={() => onCommitForkedPlan(sandboxedPlan)}
                    className="w-full py-2 bg-secondary text-on-secondary hover:bg-primary font-bold rounded-none transition flex items-center justify-center gap-1.5 mt-3 uppercase tracking-wider text-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">task_alt</span>
                    <span>PROMOTE FORK TO LIVE MASTER PLAN</span>
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-on-surface-variant italic font-mono text-xs">
                  Select a hypothetical contingency above and click &ldquo;SIMULATE FORK&rdquo; to test impacts safely without touching live operations.
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
