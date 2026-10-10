'use client';

import React, { useState, useEffect } from 'react';
import {
  StaffCollegeTrainerEngine,
  AfterActionReviewEngine,
  generateSyntheticScenario,
} from '@air-power/sim';
import { Sortie, FusedOperationalPicture } from '@air-power/shared';
import { Panel, StatCard } from './primitives/LayoutPrimitives';

interface StaffCollegeTrainerStudioProps {
  fusedPicture?: FusedOperationalPicture | null;
}

export const StaffCollegeTrainerStudio: React.FC<StaffCollegeTrainerStudioProps> = ({ fusedPicture }) => {
  const [activeTab, setActiveTab] = useState<'TRAINER' | 'AAR'>('TRAINER');

  // Trainer State
  const [studentSorties, setStudentSorties] = useState<Sortie[]>([]);
  const [gradeReport, setGradeReport] = useState<any | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [showAiSolution, setShowAiSolution] = useState(false);

  // AAR State
  const [campaignEvents, setCampaignEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('EVT-02');
  const [selectedBranchKey, setSelectedBranchKey] = useState<string>('EARLY_RETASK_15M');
  const [branchResult, setBranchResult] = useState<any | null>(null);
  const [isBranching, setIsBranching] = useState(false);

  // Initialize data
  useEffect(() => {
    initTrainerData();
    initAarData();
  }, []);

  const initTrainerData = () => {
    const sc = generateSyntheticScenario(42);
    // Initial student draft plan with realistic tactical sorties (some synchronized, one intentional flaw to demonstrate pedagogical feedback)
    const initialStudentDraft: Sortie[] = [
      {
        sortieId: 'SRT-STU-01',
        callsign: 'TIGER-01',
        packageId: 'PKG-ALPHA',
        targetRequestId: sc.targetRequests[0]?.id || 'TGT-001',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'SB-101',
        pilotId: 'PILOT-01',
        originBaseId: 'BASE_JODHPUR',
        recoveryBaseId: 'BASE_JODHPUR',
        depTimeMinutes: 60,
        totMinutes: 90,
        recoveryTimeMinutes: 120,
        status: 'SCHEDULED',
        expectedRiskScore: 54,
        fuelPlannedKg: 4600,
        munitionLoadout: [],
        routeWaypoints: [sc.bases[0]?.location, sc.targetRequests[0]?.location],
        isFrozen: false,
      },
      {
        sortieId: 'SRT-STU-02',
        callsign: 'TIGER-02',
        packageId: 'PKG-BETA',
        targetRequestId: sc.targetRequests[1]?.id || 'TGT-002',
        role: 'DEEP_PENETRATION_STRIKE',
        aircraftTail: 'SB-101', // SGR violation: only 15 min turnaround after SRT-STU-01 recovered at 120m!
        pilotId: 'PILOT-02',
        originBaseId: 'BASE_JODHPUR',
        recoveryBaseId: 'BASE_JODHPUR',
        depTimeMinutes: 135,
        totMinutes: 165,
        recoveryTimeMinutes: 195,
        status: 'SCHEDULED',
        expectedRiskScore: 48,
        fuelPlannedKg: 4600,
        munitionLoadout: [],
        routeWaypoints: [sc.bases[0]?.location, sc.targetRequests[1]?.location],
        isFrozen: false,
      },
      {
        sortieId: 'SRT-STU-03',
        callsign: 'GARUDA-SEAD',
        packageId: 'PKG-GAMMA',
        targetRequestId: sc.targetRequests[2]?.id || 'TGT-003',
        role: 'SEAD_DEAD',
        aircraftTail: 'RB-101',
        pilotId: 'PILOT-03',
        originBaseId: 'BASE_AMBALA',
        recoveryBaseId: 'BASE_AMBALA',
        depTimeMinutes: 50,
        totMinutes: 80,
        recoveryTimeMinutes: 110,
        status: 'SCHEDULED',
        expectedRiskScore: 28,
        fuelPlannedKg: 3900,
        munitionLoadout: [],
        routeWaypoints: [sc.bases[1]?.location, sc.targetRequests[2]?.location],
        isFrozen: false,
      },
      {
        sortieId: 'SRT-STU-04',
        callsign: 'BAZ-TANKER',
        packageId: 'PKG-SUPPORT',
        targetRequestId: 'TGT-CAP-ORBIT',
        role: 'TANKER',
        aircraftTail: 'RK-101',
        pilotId: 'PILOT-04',
        originBaseId: 'BASE_ADAMPUR',
        recoveryBaseId: 'BASE_ADAMPUR',
        depTimeMinutes: 30,
        totMinutes: 90,
        recoveryTimeMinutes: 180,
        status: 'SCHEDULED',
        expectedRiskScore: 15,
        fuelPlannedKg: 12000,
        munitionLoadout: [],
        routeWaypoints: [sc.bases[2]?.location, { lat: 31.0, lon: 75.0, altM: 7000 }],
        isFrozen: false,
      },
    ];

    setStudentSorties(initialStudentDraft);
    evaluateStudentPlan(initialStudentDraft);
  };

  const evaluateStudentPlan = async (sorties: Sortie[]) => {
    setIsGrading(true);
    try {
      const res = await fetch('http://localhost:3001/api/trainer/grade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorties }),
      });
      if (res.ok) {
        setGradeReport(await res.json());
      } else {
        runOfflineGrade(sorties);
      }
    } catch {
      runOfflineGrade(sorties);
    } finally {
      setIsGrading(false);
    }
  };

  const runOfflineGrade = (sorties: Sortie[]) => {
    const sc = generateSyntheticScenario(42);
    const trainer = new StaffCollegeTrainerEngine();
    const report = trainer.gradePlan(sorties, {
      bases: sc.bases,
      aircraft: sc.aircraft,
      pilots: sc.pilots,
      munitionStocks: sc.munitionStocks,
      threats: sc.threats,
      targetRequests: sc.targetRequests,
    });
    setGradeReport(report);
  };

  const initAarData = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/aar/campaign-events');
      if (res.ok) {
        const data = await res.json();
        setCampaignEvents(data.events || []);
      } else {
        runOfflineAarInit();
      }
    } catch {
      runOfflineAarInit();
    }
  };

  const runOfflineAarInit = () => {
    const aar = new AfterActionReviewEngine();
    const evts = aar.getCampaignTimelineEvents();
    setCampaignEvents(evts);
    runBranchSimulation('EVT-02', 'EARLY_RETASK_15M');
  };

  const runBranchSimulation = async (eventId: string, branchKey: string) => {
    setIsBranching(true);
    try {
      const res = await fetch('http://localhost:3001/api/aar/branch-what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, branchKey }),
      });
      if (res.ok) {
        setBranchResult(await res.json());
      } else {
        runOfflineBranch(eventId, branchKey);
      }
    } catch {
      runOfflineBranch(eventId, branchKey);
    } finally {
      setIsBranching(false);
    }
  };

  const runOfflineBranch = (eventId: string, branchKey: string) => {
    const aar = new AfterActionReviewEngine();
    const res = aar.simulateBranchWhatIf(eventId, branchKey);
    setBranchResult(res);
  };

  const handleExportAarReport = () => {
    const aar = new AfterActionReviewEngine();
    const html = aar.generatePrintableAarHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'B':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'C':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* Top Banner & Mode Toggle */}
      <Panel
        title="STAFF-COLLEGE TRAINER & AFTER-ACTION REVIEW (AAR)"
        subtitle="Defence Services Staff College (DSSC) & College of Air Warfare (CAW) Air Staff Training Suite"
        badge={
          <span className="px-2 py-0.5 bg-primary text-on-primary text-[10px] font-bold font-mono uppercase">
            PEDAGOGICAL C2 SIMULATION
          </span>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('TRAINER')}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase transition ${
                activeTab === 'TRAINER'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              TRAINER MODE: GRADE MY PLAN
            </button>
            <button
              onClick={() => setActiveTab('AAR')}
              className={`px-3 py-1 text-xs font-bold font-mono uppercase transition ${
                activeTab === 'AAR'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              AFTER-ACTION REVIEW: BRANCHING WHAT-IF
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="CURRICULUM LEVEL"
            value="DSSC AIR STAFF"
            subtitle="Operational Planning & ATO Generation"
          />
          <StatCard
            label="DOCTRINE CRITIQUE KERNELS"
            value="6 KERNELS"
            subtitle="SEAD, SGR Turnaround, Crew Rest, MEZ Standoff"
          />
          <StatCard
            label="CAMPAIGN REPLAY HORIZON"
            value="12 HOURS"
            subtitle="Chronological Event Scrubber & Branching"
          />
          <StatCard
            label="COUNTERFACTUAL DELTA"
            value="+62.8% SURVIVAL"
            subtitle="Early Retasking Counterfactual Ingress"
          />
        </div>
      </Panel>

      {/* TAB 1: TRAINER MODE & PEDAGOGICAL PLAN CRITIQUER */}
      {activeTab === 'TRAINER' && (
        <div className="flex flex-col gap-4">
          <Panel
            title="TRAINEE OPERATIONAL AIR TASKING PLAN"
            subtitle="Edit Sortie Schedules or Roles & Request Instant AI Doctrine Evaluation"
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiSolution(!showAiSolution)}
                  className="px-2.5 py-1 bg-surface-container text-xs font-bold font-mono border border-outline-variant hover:bg-surface-container-high transition"
                >
                  {showAiSolution ? 'HIDE AI SOLUTION' : 'REVEAL AI BENCHMARK SOLUTION'}
                </button>
                <button
                  onClick={() => evaluateStudentPlan(studentSorties)}
                  disabled={isGrading}
                  className="px-3 py-1 bg-primary text-on-primary text-xs font-bold font-mono hover:bg-primary-container transition"
                >
                  {isGrading ? 'CRITIQUING...' : 'GRADE MY PLAN'}
                </button>
              </div>
            }
          >
            {/* Trainee Sortie Table */}
            <div className="border border-outline-variant bg-surface-container-lowest overflow-x-auto mb-4">
              <table className="w-full text-[11px] font-mono text-left">
                <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant uppercase">
                  <tr>
                    <th className="py-2 px-3">SORTIE / CALLSIGN</th>
                    <th className="py-2 px-3">ROLE</th>
                    <th className="py-2 px-3">TAIL NUMBER</th>
                    <th className="py-2 px-3">PILOT ID</th>
                    <th className="py-2 px-3">TAKEOFF (MET)</th>
                    <th className="py-2 px-3">TOT</th>
                    <th className="py-2 px-3">RECOVERY</th>
                    <th className="py-2 px-3">TARGET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {studentSorties.map((s) => (
                    <tr key={s.sortieId} className="hover:bg-surface-container-low transition">
                      <td className="py-2 px-3 font-bold text-primary">{s.callsign}</td>
                      <td className="py-2 px-3">{s.role}</td>
                      <td className="py-2 px-3 font-semibold">{s.aircraftTail}</td>
                      <td className="py-2 px-3">{s.pilotId}</td>
                      <td className="py-2 px-3">T+{s.depTimeMinutes}m</td>
                      <td className="py-2 px-3 font-bold text-amber-900">T+{s.totMinutes}m</td>
                      <td className="py-2 px-3">T+{s.recoveryTimeMinutes}m</td>
                      <td className="py-2 px-3 text-on-surface-variant">{s.targetRequestId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Plan Grade Card & Assessment */}
            {gradeReport && (
              <div className="p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-outline-variant">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-16 w-16 rounded border flex flex-col items-center justify-center font-bold font-mono ${getGradeColor(
                        gradeReport.letterGrade
                      )}`}
                    >
                      <span className="text-2xl leading-none">{gradeReport.letterGrade}</span>
                      <span className="text-[10px] mt-0.5">{gradeReport.studentScore}/100</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold font-mono text-primary uppercase">
                        STAFF COLLEGE PEDAGOGICAL EVALUATION REPORT
                      </div>
                      <div className="text-[12px] text-on-surface mt-0.5 font-medium">
                        {gradeReport.overallAssessment}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                      SEAD Coverage: <span className="font-bold">{gradeReport.metrics.seadCoveredStrikeRatio}%</span>
                    </div>
                    <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                      SGR Violations: <span className="font-bold text-rose-700">{gradeReport.metrics.turnaroundViolationsCount}</span>
                    </div>
                    <div className="p-2 bg-surface-container-lowest border border-outline-variant">
                      Reserve Depth: <span className="font-bold">{gradeReport.metrics.strategicReservePercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Doctrine Critiques */}
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold font-mono text-primary uppercase">
                    SPECIFIC DOCTRINE CRITIQUES & REMEDIAL GUIDANCE ({gradeReport.critiques.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {gradeReport.critiques.map((critique: any, idx: number) => (
                      <div
                        key={`${critique.id}-${idx}`}
                        className={`p-3 border text-[11px] font-mono ${
                          critique.severity === 'CRITICAL'
                            ? 'bg-rose-50/50 border-rose-300'
                            : critique.severity === 'WARNING'
                            ? 'bg-amber-50/50 border-amber-300'
                            : 'bg-emerald-50/50 border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-bold ${
                              critique.severity === 'CRITICAL'
                                ? 'text-rose-900'
                                : critique.severity === 'WARNING'
                                ? 'text-amber-900'
                                : 'text-emerald-900'
                            }`}
                          >
                            [{critique.severity}] {critique.title}
                          </span>
                          {critique.penaltyPoints > 0 && (
                            <span className="text-rose-700 font-bold">-{critique.penaltyPoints} PTS</span>
                          )}
                        </div>
                        <p className="text-on-surface mb-1.5">{critique.critique}</p>
                        <div className="text-[10px] text-on-surface-variant mb-1">
                          <strong>Doctrine Citation:</strong> {critique.doctrineRule}
                        </div>
                        <div className="text-[10px] text-primary font-bold">
                          <strong>Actionable Remedy:</strong> {critique.remedySuggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side-by-Side AI Benchmark Reveal */}
                {showAiSolution && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-[11px] font-mono">
                    <div className="font-bold text-emerald-900 uppercase mb-1">
                      AI OPTIMAL BENCHMARK COMPARISON (SCORE: {gradeReport.aiBenchmarkComparison.aiBenchmarkScore}/100)
                    </div>
                    <p className="text-on-surface mb-2">{gradeReport.aiBenchmarkComparison.aiAdvantageSummary}</p>
                    <div className="text-[10px] text-emerald-900 font-bold">
                      Recommendation: Advance strike package TOT by +10m to align with SEAD corridor, swap SB-101 on sortie 2 with standby airframe SB-104 at Jodhpur.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* TAB 2: AFTER-ACTION REVIEW & BRANCHING TIMELINE WHAT-IF */}
      {activeTab === 'AAR' && (
        <div className="flex flex-col gap-4">
          <Panel
            title="AFTER-ACTION REVIEW (AAR) CAMPAIGN REPLAY"
            subtitle="Scrub 12-Hour Chronological Event Log // Select Milestone to Test Branching Counterfactual Decisions"
            actions={
              <button
                onClick={handleExportAarReport}
                className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold font-mono hover:bg-primary-container transition flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">print</span>
                <span>EXPORT PRINTABLE AAR REPORT</span>
              </button>
            }
          >
            {/* Timeline Scrubber Markers */}
            <div className="mb-4">
              <h4 className="text-xs font-bold font-mono text-primary uppercase mb-2">
                CAMPAIGN CHRONOLOGY (CLICK MILESTONE TO BRANCH WHAT-IF)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {campaignEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      if (evt.availableBranchOptions.length > 0) {
                        setSelectedBranchKey(evt.availableBranchOptions[0].branchKey);
                        runBranchSimulation(evt.id, evt.availableBranchOptions[0].branchKey);
                      }
                    }}
                    className={`p-2.5 border cursor-pointer transition text-[11px] font-mono ${
                      selectedEventId === evt.id
                        ? 'border-primary bg-surface-container-high shadow-xs'
                        : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-primary">{evt.timeFormatted}</span>
                      <span
                        className={`px-1 py-0.2 text-[9px] font-bold ${
                          evt.criticality === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {evt.criticality}
                      </span>
                    </div>
                    <div className="font-bold truncate text-[11px] mb-1">{evt.title}</div>
                    <div className="text-[10px] text-on-surface-variant line-clamp-2">{evt.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branching Counterfactual Sandbox */}
            {branchResult && (
              <div className="p-4 bg-surface-container-low border border-outline-variant flex flex-col gap-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-2 border-b border-outline-variant">
                  <div>
                    <span className="text-xs font-bold font-mono text-primary uppercase">
                      BRANCHING COUNTERFACTUAL WHAT-IF EVALUATION
                    </span>
                    <div className="text-[11px] text-on-surface mt-0.5">
                      Hypothesis: <strong>{branchResult.selectedBranchAction}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaignEvents
                      .find((e) => e.id === selectedEventId)
                      ?.availableBranchOptions.map((opt: any) => (
                        <button
                          key={opt.branchKey}
                          onClick={() => {
                            setSelectedBranchKey(opt.branchKey);
                            runBranchSimulation(selectedEventId, opt.branchKey);
                          }}
                          className={`px-2 py-1 text-[10px] font-bold font-mono uppercase transition border ${
                            selectedBranchKey === opt.branchKey
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container'
                          }`}
                        >
                          {opt.branchLabel}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Outcome Comparison Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="AIRFRAME LOSSES DELTA"
                    value={`${branchResult.comparison.lossesDelta} LOSSES`}
                    subtitle={`Baseline: ${branchResult.comparison.baselineLosses} vs Branch: ${branchResult.comparison.counterfactualLosses}`}
                  />
                  <StatCard
                    label="TARGETS NEUTRALIZED DELTA"
                    value={`+${branchResult.comparison.targetsDelta} TARGETS`}
                    subtitle={`Baseline: ${branchResult.comparison.baselineTargetsDefeated} vs Branch: ${branchResult.comparison.counterfactualTargetsDefeated}`}
                  />
                  <StatCard
                    label="THREAT RISK REDUCTION"
                    value={`-${branchResult.comparison.riskReductionPercent}%`}
                    subtitle="Terrain-masked ingress avoidance"
                  />
                  <StatCard
                    label="FUEL PENALTY DELTA"
                    value={`${branchResult.comparison.fuelDeltaKg > 0 ? '+' : ''}${branchResult.comparison.fuelDeltaKg} KG`}
                    subtitle="Low-level terrain contouring"
                  />
                </div>

                {/* Counterfactual Findings & Timeline */}
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-[11px] font-mono">
                  <div className="font-bold text-emerald-900 mb-1">
                    {branchResult.pedagogicalTakeaway}
                  </div>
                </div>

                {/* Alternative World-Line Events */}
                <div>
                  <h5 className="text-[11px] font-bold font-mono text-primary uppercase mb-1.5">
                    COUNTERFACTUAL WORLD-LINE EXECUTION LOG
                  </h5>
                  <div className="space-y-1">
                    {branchResult.alternativeTimelineEvents.map((evtText: string, idx: number) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant text-[11px] font-mono flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[13px] text-emerald-700">check_circle</span>
                        <span>{evtText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
};
