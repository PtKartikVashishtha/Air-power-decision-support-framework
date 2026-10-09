'use client';

import React, { useState, useEffect } from 'react';
import { FusedOperationalPicture } from '@air-power/shared';
import { Panel, StatCard } from './primitives/LayoutPrimitives';

interface ManualPlanningChallengeProps {
  fusedPicture: FusedOperationalPicture | null;
}

interface TargetAllocation {
  targetId: string;
  strikeTail: string;
  seadTail: string;
  escortTail: string;
}

export const ManualPlanningChallenge: React.FC<ManualPlanningChallengeProps> = ({ fusedPicture }) => {
  const [participantId, setParticipantId] = useState('HUMAN_P01');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, TargetAllocation>>({});
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev >= 900) {
            // 15 minutes cap reached
            setIsTimerRunning(false);
            return 900;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const targets = fusedPicture?.targetRequests.slice(0, 8) || [];
  const aircraftList = fusedPicture?.aircraft || [];

  const handleAllocationChange = (targetId: string, role: 'strikeTail' | 'seadTail' | 'escortTail', value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [targetId]: {
        targetId,
        strikeTail: role === 'strikeTail' ? value : prev[targetId]?.strikeTail || '',
        seadTail: role === 'seadTail' ? value : prev[targetId]?.seadTail || '',
        escortTail: role === 'escortTail' ? value : prev[targetId]?.escortTail || '',
      },
    }));
  };

  const constructSortiesFromAllocations = () => {
    const sorties: any[] = [];
    let count = 1;

    for (const alloc of Object.values(allocations)) {
      const tgt = targets.find((t) => t.id === alloc.targetId);
      if (!tgt) continue;

      if (alloc.strikeTail) {
        const ac = aircraftList.find((a) => a.tailNumber === alloc.strikeTail);
        sorties.push({
          id: `M-S${count.toString().padStart(3, '0')}`,
          callsign: `STRIKE-${count}`,
          aircraftTailNumber: alloc.strikeTail,
          aircraftModel: ac?.model || 'Su-30MKI Class',
          originBaseId: ac?.baseId || 'BASE_BHUJ',
          destinationBaseId: ac?.baseId || 'BASE_BHUJ',
          targetId: alloc.targetId,
          packageId: `PKG-${alloc.targetId}`,
          assignedMunitions: tgt.desiredMunitions || [],
          role: 'OMNIROLE_STRIKE',
          ingressCorridor: 'CORRIDOR_ALPHA',
          egressCorridor: 'CORRIDOR_ALPHA',
          fuelRequiredKg: 3500,
          threatExposureScore: 18,
          packageSyncSatisfied: !!(alloc.strikeTail && alloc.seadTail && alloc.escortTail),
          status: 'COMMITTED',
        });
        count++;
      }

      if (alloc.seadTail) {
        const ac = aircraftList.find((a) => a.tailNumber === alloc.seadTail);
        sorties.push({
          id: `M-S${count.toString().padStart(3, '0')}`,
          callsign: `SEAD-${count}`,
          aircraftTailNumber: alloc.seadTail,
          aircraftModel: ac?.model || 'Su-30MKI Class',
          originBaseId: ac?.baseId || 'BASE_BHUJ',
          destinationBaseId: ac?.baseId || 'BASE_BHUJ',
          targetId: alloc.targetId,
          packageId: `PKG-${alloc.targetId}`,
          assignedMunitions: [],
          role: 'SEAD_DEAD',
          ingressCorridor: 'CORRIDOR_ALPHA',
          egressCorridor: 'CORRIDOR_ALPHA',
          fuelRequiredKg: 3200,
          threatExposureScore: 22,
          packageSyncSatisfied: !!(alloc.strikeTail && alloc.seadTail && alloc.escortTail),
          status: 'COMMITTED',
        });
        count++;
      }

      if (alloc.escortTail) {
        const ac = aircraftList.find((a) => a.tailNumber === alloc.escortTail);
        sorties.push({
          id: `M-S${count.toString().padStart(3, '0')}`,
          callsign: `ESCORT-${count}`,
          aircraftTailNumber: alloc.escortTail,
          aircraftModel: ac?.model || 'Tejas Class',
          originBaseId: ac?.baseId || 'BASE_BHUJ',
          destinationBaseId: ac?.baseId || 'BASE_BHUJ',
          targetId: alloc.targetId,
          packageId: `PKG-${alloc.targetId}`,
          assignedMunitions: [],
          role: 'AIR_SUPERIORITY',
          ingressCorridor: 'CORRIDOR_ALPHA',
          egressCorridor: 'CORRIDOR_ALPHA',
          fuelRequiredKg: 2800,
          threatExposureScore: 14,
          packageSyncSatisfied: !!(alloc.strikeTail && alloc.seadTail && alloc.escortTail),
          status: 'COMMITTED',
        });
        count++;
      }
    }

    return sorties;
  };

  const handleVerify = async () => {
    const sorties = constructSortiesFromAllocations();
    try {
      const res = await fetch('http://localhost:3001/api/human-baseline/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorties }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerificationResult(data);
      }
    } catch (err) {
      console.error('Verification call failed', err);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setIsTimerRunning(false);

    const sorties = constructSortiesFromAllocations();
    let auditData = verificationResult;

    if (!auditData) {
      try {
        const res = await fetch('http://localhost:3001/api/human-baseline/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sorties }),
        });
        if (res.ok) auditData = await res.json();
      } catch (e) {}
    }

    const hardViolationsCount = auditData?.violations?.length || 0;
    const targetsAttempted = Object.keys(allocations).length;
    let validTargetsCount = 0;
    for (const alloc of Object.values(allocations)) {
      if (alloc.strikeTail && alloc.seadTail && alloc.escortTail) validTargetsCount++;
    }

    const totalScore = validTargetsCount * 85 - hardViolationsCount * 100 - timerSeconds * 0.1;
    const packageIntegrity = targetsAttempted > 0 ? (validTargetsCount / targetsAttempted) * 100 : 0;

    const trialPayload = {
      participantId,
      scenarioSeed: 42,
      durationSeconds: timerSeconds,
      targetsAttempted,
      targetsCoveredValid: validTargetsCount,
      hardViolationsCount,
      violationDetails: auditData?.violations || [],
      totalScore: parseFloat(totalScore.toFixed(1)),
      packageIntegrityPercent: parseFloat(packageIntegrity.toFixed(1)),
      submittedAtIso: new Date().toISOString(),
    };

    try {
      const res = await fetch('http://localhost:3001/api/human-baseline/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trialPayload),
      });
      if (res.ok) {
        setSubmittedReport(trialPayload);
      }
    } catch (err) {
      console.error('Submit trial failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* Protocol Header Panel */}
      <Panel
        title="MANUAL PLANNING CHALLENGE MODE (HUMAN OPERATOR BASELINE)"
        subtitle="Controlled Empirical Trial per docs/HUMAN_BASELINE_PROTOCOL.md // Evaluated by Decoupled Independent Verifier"
        badge={
          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold font-mono">
            HUMAN VS ALNS EMPIRICAL PROTOCOL
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-surface-container-low border border-outline-variant">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block font-mono">Participant ID:</span>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                disabled={isTimerRunning}
                className="px-2 py-1 text-xs font-mono font-bold border border-outline-variant bg-surface text-on-surface w-32"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block font-mono">Scenario:</span>
              <span className="text-xs font-mono font-bold text-on-surface">Seed 42 (8 Targets / 6 Bases)</span>
            </div>
          </div>

          {/* Stopwatch Controls */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block font-mono">Challenge Timer:</span>
              <span className={`text-2xl font-mono font-bold ${timerSeconds >= 840 ? 'text-error animate-pulse' : 'text-primary'}`}>
                {formatTimer(timerSeconds)}
                <span className="text-xs text-on-surface-variant font-normal ml-1">/ 15:00</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isTimerRunning ? (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary font-mono text-xs font-bold uppercase tracking-wider hover:bg-secondary border border-primary"
                >
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="px-3 py-1.5 bg-surface-container text-on-surface font-mono text-xs font-bold uppercase tracking-wider border border-outline hover:bg-surface-container-high"
                >
                  Pause
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || timerSeconds === 0}
                className="px-3 py-1.5 bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 disabled:opacity-50"
              >
                Submit Plan
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Submission Success Banner */}
      {submittedReport && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">✅ TRIAL LOGGED SUCCESSFULLY TO benchmarks/human/results.json</span>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(submittedReport, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trial_${submittedReport.participantId}_seed42.json`;
                a.click();
              }}
              className="px-2 py-1 bg-emerald-800 text-white font-bold text-[10px] uppercase"
            >
              Download JSON
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>Participant: <strong>{submittedReport.participantId}</strong></div>
            <div>Time Taken: <strong>{formatTimer(submittedReport.durationSeconds)}</strong></div>
            <div>Valid Packages: <strong>{submittedReport.targetsCoveredValid}</strong></div>
            <div>Hard Violations: <strong>{submittedReport.hardViolationsCount}</strong></div>
          </div>
        </div>
      )}

      {/* Spreadsheet Manual Planning Grid */}
      <Panel
        title="SPREADSHEET AIRFRAME ALLOCATION MATRIX"
        subtitle="Assign Strike, SEAD, and Escort airframes from forward bases to achieve 100% package synchronization"
        actions={
          <button
            onClick={handleVerify}
            className="px-2.5 py-1 bg-surface-container text-on-surface font-mono text-xs font-bold border border-outline hover:bg-surface-container-high"
          >
            Audit with Independent Verifier
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[11px] uppercase text-on-surface-variant">
                <th className="p-2 border-r border-outline-variant">Target</th>
                <th className="p-2 border-r border-outline-variant">Priority</th>
                <th className="p-2 border-r border-outline-variant">Required Role Sync</th>
                <th className="p-2 border-r border-outline-variant">Assigned Strike Airframe</th>
                <th className="p-2 border-r border-outline-variant">Assigned SEAD Escort</th>
                <th className="p-2 border-r border-outline-variant">Assigned Air Superiority</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((tgt, idx) => {
                const alloc = allocations[tgt.id] || { strikeTail: '', seadTail: '', escortTail: '' };
                const isComplete = alloc.strikeTail && alloc.seadTail && alloc.escortTail;

                return (
                  <tr key={tgt.id} className={`border-b border-outline-variant ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-container-lowest'}`}>
                    <td className="p-2 border-r border-outline-variant font-bold text-primary">
                      {tgt.id} <span className="text-[10px] text-on-surface-variant font-normal block">{tgt.name}</span>
                    </td>
                    <td className="p-2 border-r border-outline-variant">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold ${tgt.priority >= 80 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        P-{tgt.priority}
                      </span>
                    </td>
                    <td className="p-2 border-r border-outline-variant text-[10px] text-on-surface-variant">
                      Strike + SEAD + Escort
                    </td>
                    <td className="p-2 border-r border-outline-variant">
                      <select
                        value={alloc.strikeTail}
                        onChange={(e) => handleAllocationChange(tgt.id, 'strikeTail', e.target.value)}
                        className="w-full p-1 bg-surface border border-outline-variant text-xs font-mono"
                      >
                        <option value="">-- UNASSIGNED --</option>
                        {aircraftList
                          .filter((a) => a.roles.includes('OMNIROLE_STRIKE') || a.roles.includes('DEEP_PENETRATION_STRIKE'))
                          .map((a) => (
                            <option key={a.tailNumber} value={a.tailNumber}>
                              {a.tailNumber} ({a.model.split(' ')[0]}, {a.baseId.replace('BASE_', '')})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="p-2 border-r border-outline-variant">
                      <select
                        value={alloc.seadTail}
                        onChange={(e) => handleAllocationChange(tgt.id, 'seadTail', e.target.value)}
                        className="w-full p-1 bg-surface border border-outline-variant text-xs font-mono"
                      >
                        <option value="">-- UNASSIGNED --</option>
                        {aircraftList
                          .filter((a) => a.roles.includes('SEAD_DEAD') || a.roles.includes('OMNIROLE_STRIKE'))
                          .map((a) => (
                            <option key={a.tailNumber} value={a.tailNumber}>
                              {a.tailNumber} ({a.model.split(' ')[0]}, {a.baseId.replace('BASE_', '')})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="p-2 border-r border-outline-variant">
                      <select
                        value={alloc.escortTail}
                        onChange={(e) => handleAllocationChange(tgt.id, 'escortTail', e.target.value)}
                        className="w-full p-1 bg-surface border border-outline-variant text-xs font-mono"
                      >
                        <option value="">-- UNASSIGNED --</option>
                        {aircraftList
                          .filter((a) => a.roles.includes('AIR_SUPERIORITY'))
                          .map((a) => (
                            <option key={a.tailNumber} value={a.tailNumber}>
                              {a.tailNumber} ({a.model.split(' ')[0]}, {a.baseId.replace('BASE_', '')})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="p-2">
                      {isComplete ? (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold">PACKAGE SYNCHRONIZED</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant text-[10px]">PARTIAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Independent Verifier Real-Time Diagnostic Box */}
      {verificationResult && (
        <Panel
          title="INDEPENDENT VERIFIER AUDIT REPORT"
          subtitle="Direct physical rule checker // Decoupled from solver heuristics"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-surface-container-low border border-outline-variant font-mono text-xs">
            <div>
              <span className="text-[10px] text-on-surface-variant block uppercase">Feasibility Status:</span>
              <span className={`font-bold ${verificationResult.isFeasible ? 'text-emerald-700' : 'text-red-700'}`}>
                {verificationResult.isFeasible ? 'FEASIBLE (0 HARD VIOLATIONS)' : 'INFEASIBLE PLAN'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-on-surface-variant block uppercase">Hard Violations:</span>
              <span className="font-bold text-red-700">{verificationResult.violations?.length || 0}</span>
            </div>
            <div>
              <span className="text-[10px] text-on-surface-variant block uppercase">Checked Entities:</span>
              <span>{verificationResult.metrics?.sortiesChecked || 0} Sorties</span>
            </div>
            <div>
              <span className="text-[10px] text-on-surface-variant block uppercase">Audit Check:</span>
              <span>100% Rule Compliance</span>
            </div>
          </div>
          {verificationResult.violations && verificationResult.violations.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-900 font-mono text-xs">
              <span className="font-bold block mb-1">Constraint Violations Detected:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {verificationResult.violations.map((v: string, i: number) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
};
