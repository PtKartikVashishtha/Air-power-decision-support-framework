'use client';

import React, { useState, useEffect } from 'react';
import { PlanCOA, RetaskingDiffReport, TacticalInject, mapViolationToReasonCode } from '@air-power/shared';
import { Panel, TruncatedText } from './primitives/LayoutPrimitives';
import { ReasonCodeChip } from './ReasonCodeChip';

interface RetaskingConsoleProps {
  currentPlan: PlanCOA | null;
  onPlanUpdated: (newPlan: PlanCOA) => void;
}

export const RetaskingConsole: React.FC<RetaskingConsoleProps> = ({
  currentPlan,
  onPlanUpdated,
}) => {
  const [injects, setInjects] = useState<TacticalInject[]>([]);
  const [selectedInject, setSelectedInject] = useState<TacticalInject | null>(null);
  const [diffReport, setDiffReport] = useState<RetaskingDiffReport | null>(null);
  const [isRetasking, setIsRetasking] = useState(false);

  useEffect(() => {
    fetchInjects();
  }, []);

  const fetchInjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/injects');
      if (res.ok) {
        const data = await res.json();
        setInjects(data.pending || []);
        if (data.pending && data.pending.length > 0) {
          setSelectedInject(data.pending[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load injects', err);
    }
  };

  const handleExecuteRetask = async () => {
    if (!selectedInject) return;
    setIsRetasking(true);
    try {
      const res = await fetch('http://localhost:3001/api/plan/retask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ injectId: selectedInject.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiffReport(data.diffReport);
        onPlanUpdated(data.updatedPlan);
        fetchInjects();
      }
    } catch (err) {
      console.error('Failed to execute retask', err);
    } finally {
      setIsRetasking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      <Panel
        title="DYNAMIC RETASKING & REAL-TIME CONTINGENCY CONSOLE"
        subtitle="Frozen-Zone Policy Enforcement // Incremental Re-optimisation with Disruption Penalty"
        badge={
          <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold font-mono">
            FROZEN ZONE: 15-MIN TOT
          </span>
        }
        actions={
          <button
            onClick={fetchInjects}
            className="flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-container text-xs font-mono font-bold transition"
          >
            <span className="material-symbols-outlined text-[13px]">sync</span>
            <span>REFRESH INJECTS</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full min-w-0">
          {/* Injects Selection on Left (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-2.5 min-w-0">
            <div className="font-bold text-primary uppercase text-xs font-mono flex justify-between items-center border-b border-outline-variant pb-1">
              <span>PENDING TACTICAL INJECTS</span>
              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px]">
                {injects.length} Active
              </span>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto w-full min-w-0 pr-1">
              {injects.length === 0 ? (
                <div className="text-on-surface-variant italic p-4 text-center text-xs font-mono bg-surface-container-low border border-outline-variant">
                  All injected contingencies acknowledged and mitigated.
                </div>
              ) : (
                injects.map((inj) => (
                  <div
                    key={inj.id}
                    onClick={() => setSelectedInject(inj)}
                    className={`p-2.5 border cursor-pointer transition flex flex-col gap-1 ${
                      selectedInject?.id === inj.id
                        ? 'bg-rose-50/50 border-rose-400 shadow-xs'
                        : 'bg-surface-container-low border-outline-variant hover:border-outline'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold font-mono text-rose-800 uppercase">{inj.type}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">H+{inj.simTimeMinutes}m</span>
                    </div>
                    <div className="font-bold text-xs text-primary">{inj.title}</div>
                    <div className="text-[10px] text-on-surface-variant line-clamp-2 leading-tight">
                      {inj.description}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedInject && (
              <button
                onClick={handleExecuteRetask}
                disabled={isRetasking}
                className={`w-full py-2 font-bold font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  isRetasking
                    ? 'bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed'
                    : 'bg-rose-700 text-white hover:bg-rose-800 shadow-xs'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${isRetasking ? 'animate-spin' : ''}`}>
                  {isRetasking ? 'sync' : 'bolt'}
                </span>
                <span>{isRetasking ? 'CALCULATING RETASK...' : 'EXECUTE DYNAMIC RE-PLAN'}</span>
              </button>
            )}
          </div>

          {/* Retasking Diff and Assessment on Right (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-2.5 min-w-0">
            <div className="flex justify-between items-center border-b border-outline-variant pb-1 font-mono text-xs">
              <span className="font-bold text-primary uppercase">
                PLAN STABILITY &amp; IMPACT DIFF REPORT
              </span>
              {diffReport && (
                <span className="text-secondary font-bold text-[11px]">
                  STABILITY INDEX: {diffReport.stabilityIndex}% (MINIMAL DISRUPTION)
                </span>
              )}
            </div>

            {diffReport ? (
              <div className="space-y-3 w-full min-w-0">
                {/* Diff Changes Table */}
                <div className="space-y-1.5 w-full min-w-0">
                  <div className="text-primary font-bold text-[11px] font-mono">SORTIE-LEVEL ADJUSTMENTS:</div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto w-full min-w-0">
                    {diffReport.changes.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-surface-container-low border border-outline-variant flex flex-wrap items-center justify-between gap-2 font-mono text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${
                              c.changeType === 'ADDED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : c.changeType === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {c.changeType}
                          </span>
                          <span className="font-bold text-primary shrink-0">{c.callsign}</span>
                          <TruncatedText text={c.impactAssessment} className="text-on-surface-variant text-[11px]" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ReasonCodeChip code={c.reasonCode || mapViolationToReasonCode(c.reason)} />
                          <span className="text-on-surface-variant text-[10px] hidden lg:inline">{c.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commander Brief Box */}
                <div className="p-3 bg-surface-container-low border border-outline-variant flex flex-col gap-1 w-full min-w-0">
                  <div className="text-secondary font-bold text-xs uppercase font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">description</span>
                    <span>AUTOMATED COMMANDER&apos;S OPERATIONAL BRIEF</span>
                  </div>
                  <div className="text-on-surface-variant text-[11px] font-mono whitespace-pre-line leading-relaxed max-h-[220px] overflow-y-auto">
                    {diffReport.commanderBriefMarkdown}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-on-surface-variant italic font-mono text-xs bg-surface-container-low border border-outline-variant">
                Select a pending tactical inject on the left and click &ldquo;EXECUTE DYNAMIC RE-PLAN&rdquo; to view real-time impact diff and automated commander&apos;s brief.
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
};
