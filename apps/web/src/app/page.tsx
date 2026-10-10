'use client';

import React, { useState, useEffect } from 'react';
import {
  FusedOperationalPicture,
  PlanCOA,
  t,
  SupportedLocale,
} from '@air-power/shared';
import { generateSyntheticScenario } from '@air-power/sim';
import { TacticalMap } from '../components/TacticalMap';
import { ResourceBoard } from '../components/ResourceBoard';
import { MissionPlanner } from '../components/MissionPlanner';
import { PlannerInTheLoopStudio } from '../components/PlannerInTheLoopStudio';
import { CoaComparison } from '../components/CoaComparison';
import { RetaskingConsole } from '../components/RetaskingConsole';
import { DeconflictionKillchainPanel } from '../components/DeconflictionKillchainPanel';
import { WargameDashboard } from '../components/WargameDashboard';
import { AtoExportView } from '../components/AtoExportView';
import { BenchmarkDashboard } from '../components/BenchmarkDashboard';
import { ManualPlanningChallenge } from '../components/ManualPlanningChallenge';
import { PredictiveCalibrationView } from '../components/PredictiveCalibrationView';
import { WhatIfSandbox } from '../components/WhatIfSandbox';
import { AuditTrailView } from '../components/AuditTrailView';
import { ContestedOpsStudio } from '../components/ContestedOpsStudio';
import { StaffCollegeTrainerStudio } from '../components/StaffCollegeTrainerStudio';
import { ExplainabilityStudio } from '../components/ExplainabilityStudio';
import { CopilotModal } from '../components/CopilotModal';
import { AssumptionsDoctrineModal } from '../components/AssumptionsDoctrineModal';

export default function AirPowerDashboard() {
  const [activeTab, setActiveTab] = useState(3); // Default to Planner-in-the-Loop Studio for flagship daylight view
  const [fusedPicture, setFusedPicture] = useState<FusedOperationalPicture | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCOA | null>(null);
  const [clockMinutes, setClockMinutes] = useState(255); // H+04:15 default
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [clockSpeed, setClockSpeed] = useState(1);
  const [role, setRole] = useState<'COMMANDER' | 'PLANNER' | 'INTEL' | 'AUDITOR'>('COMMANDER');
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // 6 Core Screens for the Curated 5-Minute Evaluation Story
  const coreStoryTabs = [
    { label: `1. ${t('TAB_COP', locale)}`, idx: 0, key: 'cop', desc: '3D/2D Fused Picture' },
    { label: `2. ${t('TAB_PIL', locale)}`, idx: 3, key: 'pil', desc: 'ATO Synthesis' },
    { label: `3. ${t('TAB_RETASK', locale)}`, idx: 5, key: 'retask', desc: 'Inject & Retask Diff' },
    { label: `4. ${t('TAB_COA', locale)}`, idx: 4, key: 'coa', desc: 'COA & Pareto Dial' },
    { label: `5. ${t('TAB_BENCH', locale)}`, idx: 9, key: 'bench', desc: 'Benchmark Evidence' },
    { label: `6. ${t('TAB_CONTESTED', locale)}`, idx: 14, key: 'contested', desc: 'Cut the Link (CRDT)' },
  ];

  // Deep-Dive Operational Screens under "More Operations" Menu
  const moreScreens = [
    { label: t('TAB_RES', locale), idx: 1, key: 'res', tag: 'Turnarounds & Munitions' },
    { label: t('TAB_MP', locale), idx: 2, key: 'mp', tag: 'Direct Sortie Constructor' },
    { label: t('TAB_DECONF', locale), idx: 6, key: 'deconf', tag: '4D Spatial & Airway Coordination' },
    { label: t('TAB_WARGAME', locale), idx: 7, key: 'wargame', tag: 'Closed-Loop Attrition Simulator' },
    { label: t('TAB_EXPORT', locale), idx: 8, key: 'export', tag: 'USMTF / CoT XML / GeoJSON / KML' },
    { label: t('TAB_CHALLENGE', locale), idx: 10, key: 'challenge', tag: '3-Min Human vs AI Challenge' },
    { label: t('TAB_PRED', locale), idx: 11, key: 'pred', tag: 'Brier Score & Conformal Intervals' },
    { label: t('TAB_WHATIF', locale), idx: 12, key: 'whatif', tag: 'Dynamic Doctrine Weight Tweaking' },
    { label: t('TAB_AUDIT', locale), idx: 13, key: 'audit', tag: 'SHA-256 Tamper-Evident Ledger' },
    { label: t('TAB_TRAINER', locale), idx: 15, key: 'trainer', tag: 'DSSC Evaluator & Counterfactual AAR' },
  ];

  const isMoreActive = moreScreens.some((s) => s.idx === activeTab);
  const activeMoreLabel = moreScreens.find((s) => s.idx === activeTab)?.label;

  const navRef = React.useRef<HTMLElement>(null);
  const handleNavScroll = (delta: number) => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Initial data loading & SSE stream
  useEffect(() => {
    fetchInitialData();

    // Setup SSE connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('http://localhost:3001/api/stream');
      eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.picture) setFusedPicture(data.picture);
          if (data.plan) setCurrentPlan(data.plan);
          if (data.clock) {
            setClockMinutes(data.clock.simTimeMinutes);
            setIsClockRunning(data.clock.isRunning);
            setClockSpeed(data.clock.speed);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('tick', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setClockMinutes(data.simTimeMinutes);
          if (data.picture) setFusedPicture(data.picture);
        } catch (err) {}
      });
    } catch (err) {
      console.warn('SSE not connected, relying on REST polling');
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resPic, resPlan] = await Promise.all([
        fetch('http://localhost:3001/api/fused-picture'),
        fetch('http://localhost:3001/api/plan/current'),
      ]);
      if (resPic.ok) setFusedPicture(await resPic.json());
      if (resPlan.ok) setCurrentPlan(await resPlan.json());
    } catch (err) {
      // Offline fallback: generate client-side synthetic scenario if API offline
      console.warn('API offline; initializing client fallback scenario');
      const sc = generateSyntheticScenario(42);
      setFusedPicture({
        timestampIso: new Date().toISOString(),
        simTimeMinutes: 255,
        overallConfidenceScore: 98.4,
        activeConflictsCount: 0,
        bases: sc.bases,
        aircraft: sc.aircraft,
        pilots: sc.pilots,
        munitionStocks: sc.munitionStocks,
        threats: sc.threats,
        airspaceZones: sc.airspaceZones,
        targetRequests: sc.targetRequests,
        weatherReports: [],
        feedHealth: [],
      });
    }
  };

  const handleClockControl = async (action: string, payload?: any) => {
    try {
      const res = await fetch('http://localhost:3001/api/clock/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setClockMinutes(data.simTimeMinutes);
        setIsClockRunning(data.isRunning);
        setClockSpeed(data.speed);
      }
    } catch (err) {
      console.error('Failed to control clock', err);
    }
  };

  // Deterministic Demo Reset in < 2 seconds (P8 Requirement)
  const handleResetDemo = async () => {
    setIsResettingDemo(true);
    try {
      await handleClockControl('RESET', { targetMinutes: 0 });
      const res = await fetch('http://localhost:3001/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctrine: 'BALANCED_RESERVE' }),
      });
      if (res.ok) {
        setCurrentPlan(await res.json());
      }
      setActiveTab(3);
    } catch (err) {
      console.error('Reset failed', err);
    } finally {
      setIsResettingDemo(false);
    }
  };

  const formatClockTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `H+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden select-none" style={{ background: '#f6fafe', color: '#171c1f' }}>
      {/* Top Daylight Military Header Bar */}
      <header className="sticky top-0 left-0 w-full max-w-full overflow-x-hidden z-40 bg-surface-container-lowest border-b border-outline-variant shadow-xs">
        {/* Mandatory Defence Training Classification Banner */}
        <div className="w-full bg-[#fef2f2] border-b border-[#fecaca] text-center py-0.5 px-2 text-[10px] font-bold text-[#b91c1c] tracking-widest uppercase font-sans select-none shrink-0 truncate">
          {t('UNCLASSIFIED_BANNER', locale)}
        </div>

        {/* Primary Controls Row */}
        <div className="w-full px-2.5 lg:px-4 py-1.5 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between gap-2 min-w-0">
          {/* Logo & Operational Subtitle */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-xs tracking-wider shadow-xs shrink-0">
              AP
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-label-caps text-xs text-primary tracking-wider uppercase font-bold truncate">
                  {t('APP_TITLE', locale)}
                </span>
                <span className="hidden 2xl:inline-block px-1.5 py-0.5 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-label-data-sm text-[9px] uppercase font-bold leading-none shrink-0">
                  UNCLASSIFIED
                </span>
              </div>
              <span className="hidden sm:block font-label-data-sm text-[9px] text-on-surface-variant font-medium tracking-tight truncate">
                {t('SECTOR_SUBTITLE', locale)}
              </span>
            </div>
          </div>

          {/* Tactical Mission Clock Scrubbing Control */}
          <div className="flex items-center gap-1.5 bg-surface-container px-2 py-0.5 border border-outline-variant shrink-0">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-label-caps text-[9px] text-on-surface-variant uppercase font-bold">MET</span>
              <span className="font-label-data-sm text-[11px] text-primary bg-surface-container-lowest px-1 py-0.5 border border-outline-variant font-bold">
                {formatClockTime(clockMinutes)}
              </span>
            </div>
            <div className="h-3.5 w-px bg-outline-variant shrink-0"></div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => handleClockControl(isClockRunning ? 'PAUSE' : 'PLAY')}
                className="h-5.5 w-5.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center font-bold shrink-0"
                type="button"
                title={isClockRunning ? 'Pause Sim' : 'Play Sim'}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isClockRunning ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </div>
            <div className="h-3.5 w-px bg-outline-variant shrink-0"></div>
            <div className="flex items-center gap-0.5 shrink-0">
              {[1, 5, 15, 60].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleClockControl('SPEED', { multiplier: spd })}
                  className={`h-5.5 px-1 font-label-data-sm text-[9px] font-bold border transition shrink-0 ${
                    clockSpeed === spd
                      ? 'bg-primary-container text-on-primary border-primary-container'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border-outline-variant'
                  }`}
                  type="button"
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* System Health, Role, and Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden xl:flex items-center gap-1 bg-surface-container-low px-1.5 py-0.5 border border-outline-variant shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803d] animate-pulse shrink-0"></span>
              <span className="font-label-data-sm text-[9px] text-primary font-bold tracking-tight whitespace-nowrap">
                FUSION: {fusedPicture?.overallConfidenceScore || 98.4}% (BAYESIAN)
              </span>
            </div>

            <div className="relative shrink-0">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="h-6.5 px-1.5 bg-surface-container-lowest border border-outline-variant font-label-caps text-[10px] text-primary hover:bg-surface-container-high focus:outline-none cursor-pointer uppercase font-bold shrink-0"
              >
                <option value="COMMANDER">AIR COMMANDER</option>
                <option value="PLANNER">CHIEF PLANNER</option>
                <option value="INTEL">INTEL ANALYST</option>
                <option value="AUDITOR">DEFENCE AUDITOR</option>
              </select>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsAssumptionsOpen(true)}
                className="h-6.5 px-2 bg-surface-container-lowest text-primary border border-outline-variant font-headline-md text-[10px] uppercase tracking-wider hover:bg-surface-container-high transition-colors font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
                type="button"
                title="View Operational Doctrine & Planning Assumptions"
              >
                <span>Doctrine</span>
              </button>

              <button
                onClick={handleResetDemo}
                disabled={isResettingDemo}
                className="h-6.5 px-2 bg-surface-container-lowest text-on-surface border border-outline-variant font-headline-md text-[10px] uppercase tracking-wider hover:bg-surface-container-high transition-colors font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                type="button"
                title="Restore Deterministic Demo State (< 2s)"
              >
                <span className={`material-symbols-outlined text-[12px] ${isResettingDemo ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>Reset</span>
              </button>

              <button
                onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
                className="h-6.5 px-2 bg-surface-container-lowest text-primary border border-outline-variant font-mono text-[10px] uppercase font-bold hover:bg-surface-container-high transition flex items-center gap-1 shrink-0"
                type="button"
                title="Bilingual Mode: Toggle English / Hindi Military Terms"
              >
                <span className="material-symbols-outlined text-[13px]">translate</span>
                <span>{locale === 'en' ? 'हिन्दी' : 'ENG'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Tab Navigation Bar with Responsive Scroll Chevrons */}
        <div className="relative w-full max-w-full min-w-0 flex items-center bg-surface-container-lowest border-t border-outline-variant/30 overflow-hidden">
          <button
            onClick={() => handleNavScroll(-220)}
            className="h-8.5 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface border-r border-outline-variant flex items-center justify-center shrink-0 z-10 transition-colors"
            type="button"
            title="Scroll Tabs Left"
          >
            <span className="material-symbols-outlined text-[15px]">chevron_left</span>
          </button>

          <nav
            ref={navRef}
            className="h-8.5 flex-1 min-w-0 flex items-stretch gap-0 overflow-x-auto scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Primary 6-Screen Curated 5-Minute Story Flow */}
            {coreStoryTabs.map((tab) => {
              const isActive = activeTab === tab.idx;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.idx)}
                  className={`h-full px-3.5 flex items-center font-label-caps text-[11px] uppercase tracking-wider border-r border-outline-variant/40 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-surface-container-high text-primary border-b-2 border-secondary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-semibold'
                  }`}
                  title={tab.desc}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* More Screens Dropdown Menu */}
            <div className="relative flex items-center shrink-0">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`h-full px-3 flex items-center gap-1 font-label-caps text-[11px] uppercase tracking-wider border-r border-outline-variant/40 transition-colors whitespace-nowrap shrink-0 ${
                  isMoreActive
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-semibold'
                }`}
                type="button"
                title="Deep-Dive Operations & Additional Subsystems"
              >
                <span>{isMoreActive ? `MORE: ${activeMoreLabel}` : 'MORE OPERATIONS (11)'}</span>
                <span className="material-symbols-outlined text-[14px]">
                  {isMoreMenuOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                </span>
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-0.5 w-72 bg-surface-container-lowest border border-outline-variant shadow-xl z-50 py-1"
                  style={{ backdropFilter: 'blur(16px)' }}
                >
                  <div className="px-3 py-1 text-[9px] font-label-caps text-on-surface-variant uppercase font-bold border-b border-outline-variant/30">
                    Additional Command Views
                  </div>
                  {moreScreens.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setActiveTab(s.idx);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                        activeTab === s.idx
                          ? 'bg-surface-container-high text-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="font-medium text-[11px]">{s.label}</span>
                      <span className="text-[9px] text-on-surface-variant font-mono">{s.tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <button
            onClick={() => handleNavScroll(220)}
            className="h-9 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface border-l border-outline-variant flex items-center justify-center shrink-0 z-10 transition-colors"
            type="button"
            title="Scroll Tabs Right"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </header>

      {/* Main Tactical Screen Container */}
      <main className="flex-1 p-gutter-desktop max-w-[1600px] mx-auto w-full">
        {fusedPicture ? (
          <>
            {activeTab === 0 && (
              <TacticalMap fusedPicture={fusedPicture} currentPlan={currentPlan} />
            )}
            {activeTab === 1 && <ResourceBoard fusedPicture={fusedPicture} />}
            {activeTab === 2 && (
              <MissionPlanner
                fusedPicture={fusedPicture}
                currentPlan={currentPlan}
                onPlanGenerated={(newPlan) => setCurrentPlan(newPlan)}
              />
            )}
            {activeTab === 3 && (
              <PlannerInTheLoopStudio
                fusedPicture={fusedPicture}
                currentPlan={currentPlan}
                onPlanUpdated={(newPlan) => setCurrentPlan(newPlan)}
              />
            )}
            {activeTab === 4 && (
              <CoaComparison onSelectCoa={(selected) => setCurrentPlan(selected)} />
            )}
            {activeTab === 5 && (
              <RetaskingConsole
                currentPlan={currentPlan}
                onPlanUpdated={(newPlan) => setCurrentPlan(newPlan)}
              />
            )}
            {activeTab === 6 && <DeconflictionKillchainPanel />}
            {activeTab === 7 && <WargameDashboard />}
            {activeTab === 8 && (
              <AtoExportView currentPlan={currentPlan} fusedPicture={fusedPicture} />
            )}
            {activeTab === 9 && (
              <BenchmarkDashboard onNavigateToChallenge={() => setActiveTab(10)} />
            )}
            {activeTab === 10 && (
              <ManualPlanningChallenge fusedPicture={fusedPicture} />
            )}
            {activeTab === 11 && <PredictiveCalibrationView />}
            {activeTab === 12 && (
              <WhatIfSandbox
                currentPlan={currentPlan}
                fusedPicture={fusedPicture}
                onCommitForkedPlan={(promoted) => setCurrentPlan(promoted)}
              />
            )}
            {activeTab === 13 && <AuditTrailView fusedPicture={fusedPicture} />}
            {activeTab === 14 && <ContestedOpsStudio />}
            {activeTab === 15 && <StaffCollegeTrainerStudio fusedPicture={fusedPicture} />}
            {activeTab === 16 && (
              <ExplainabilityStudio currentPlan={currentPlan} fusedPicture={fusedPicture} />
            )}
          </>
        ) : (
          <div className="p-16 text-center text-on-surface-variant font-label-data-sm text-sm bg-surface-container-lowest border border-outline-variant">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            CONNECTING TO TACTICAL FUSION ENGINE...
          </div>
        )}
      </main>

      {/* Global Defense System Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-space-sm mt-auto">
        <div className="w-full px-gutter-desktop flex items-center justify-between font-label-data-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
          <div className="flex items-center gap-space-lg">
            <span>DEFENSE DECISION-SUPPORT SUITE</span>
            <span>//</span>
            <span>NODE: TOC-ALPHA-WEST</span>
            <span>//</span>
            <span>SECURITY: LEVEL-4 CLEARANCE REQUIRED</span>
          </div>
          <div className="flex items-center gap-space-lg">
            <span>LATENCY: 12ms</span>
            <span>SECURE ENCLAVE 09</span>
            <span>&copy; JAOC AIR POWER SYSTEM</span>
          </div>
        </div>
      </footer>

      {/* Floating Tactical AI Copilot Button & Panel */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className="flex items-center space-x-2 bg-primary text-on-primary border border-outline-variant px-4 py-2.5 rounded-full shadow-lg hover:bg-primary-container transition text-xs font-label-data-sm font-bold"
        >
          <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          <span>TACTICAL AI COPILOT</span>
        </button>

        {isCopilotOpen && (
          <div className="absolute bottom-12 left-0 w-[460px] max-w-[calc(100vw-3rem)] shadow-2xl z-50">
            <CopilotModal
              onPlanUpdated={(plan) => setCurrentPlan(plan)}
              onClose={() => setIsCopilotOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Assumptions & Doctrine Notes Modal */}
      <AssumptionsDoctrineModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />
    </div>
  );
}
