'use client';

import React, { useState, useEffect } from 'react';
import {
  PlanCOA,
  RetaskingDiffReport,
  TacticalInject,
} from '@air-power/shared';
import { AlertCircle, RefreshCw, CheckCircle, Shield, FileText, ArrowRight } from 'lucide-react';

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
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-ops-alert font-bold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-ops-alert" />
            DYNAMIC RETASKING & REAL-TIME CONTINGENCY CONSOLE
          </div>
          <div className="text-gray-400 text-[11px] mt-0.5">
            Frozen-Zone Policy Enforcement // Incremental Re-optimisation with Disruption Penalty
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchInjects}
            className="bg-ops-800 hover:bg-ops-700 border border-ops-700 px-3 py-1.5 rounded text-gray-200 transition"
          >
            REFRESH INJECTS
          </button>
        </div>
      </div>

      {/* Injects Selection & Retask Trigger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg md:col-span-1 space-y-3">
          <div className="font-bold text-gray-200 uppercase text-xs flex justify-between">
            <span>PENDING TACTICAL INJECTS</span>
            <span className="text-ops-alert font-bold">{injects.length} Active</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {injects.length === 0 ? (
              <div className="text-gray-500 italic p-3 text-center">
                All injected contingencies acknowledged and mitigated.
              </div>
            ) : (
              injects.map((inj) => (
                <div
                  key={inj.id}
                  onClick={() => setSelectedInject(inj)}
                  className={`p-3 rounded border cursor-pointer transition ${
                    selectedInject?.id === inj.id
                      ? 'bg-ops-alert/15 border-ops-alert text-white'
                      : 'bg-ops-850 border-ops-700/50 text-gray-300 hover:bg-ops-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-ops-alert">{inj.type}</span>
                    <span className="text-[10px] text-gray-400">H+{inj.simTimeMinutes}m</span>
                  </div>
                  <div className="font-semibold text-xs">{inj.title}</div>
                  <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">{inj.description}</div>
                </div>
              ))
            )}
          </div>

          {selectedInject && (
            <button
              onClick={handleExecuteRetask}
              disabled={isRetasking}
              className={`w-full py-2.5 rounded font-bold transition flex items-center justify-center space-x-2 ${
                isRetasking
                  ? 'bg-ops-700 text-gray-400 cursor-not-allowed'
                  : 'bg-ops-alert hover:bg-rose-600 text-white shadow-lg'
              }`}
            >
              {isRetasking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CALCULATING RETASK...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>EXECUTE DYNAMIC RE-PLAN</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Retasking Diff and Assessment */}
        <div className="bg-ops-900 border border-ops-700/60 p-4 rounded-lg md:col-span-2 space-y-3">
          <div className="flex justify-between items-center border-b border-ops-800/80 pb-2">
            <span className="font-bold text-white uppercase text-xs">
              PLAN STABILITY &amp; IMPACT DIFF REPORT
            </span>
            {diffReport && (
              <span className="text-ops-accent font-bold">
                STABILITY INDEX: {diffReport.stabilityIndex}% (MINIMAL DISRUPTION)
              </span>
            )}
          </div>

          {diffReport ? (
            <div className="space-y-4">
              {/* Diff Changes Table */}
              <div className="space-y-2">
                <div className="text-gray-300 font-bold text-[11px]">SORTIE-LEVEL ADJUSTMENTS:</div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {diffReport.changes.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-ops-850 p-2.5 rounded border border-ops-700/50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.changeType === 'ADDED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : c.changeType === 'CANCELLED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {c.changeType}
                        </span>
                        <span className="font-bold text-white">{c.callsign}</span>
                        <span className="text-gray-400 text-[11px]">{c.impactAssessment}</span>
                      </div>
                      <span className="text-gray-400 text-[10px]">{c.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commander Brief Markdown Box */}
              <div className="bg-ops-950 p-3 rounded border border-ops-700/50">
                <div className="text-ops-accent font-bold text-[11px] mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  AUTOMATED COMMANDER&apos;S OPERATIONAL BRIEF
                </div>
                <div className="text-gray-300 text-[11px] whitespace-pre-line leading-relaxed">
                  {diffReport.commanderBriefMarkdown}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 italic">
              Select a pending tactical inject on the left and click &ldquo;EXECUTE DYNAMIC RE-PLAN&rdquo; to view real-time impact diff and automated commander&apos;s brief.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
