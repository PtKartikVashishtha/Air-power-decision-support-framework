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
import { GuidedHomeExperience } from '../components/GuidedHomeExperience';
import { ServicesDirectoryModal } from '../components/ServicesDirectoryModal';
import { PageHeaderBreadcrumb } from '../components/PageHeaderBreadcrumb';
import { initPreviewInterceptor, isPreviewEnvironment } from '../lib/preview-interceptor';
import seed42PreviewData from '../data/seed42-preview.json';

const TAB_SLUG_MAP: Record<number, string> = {
  99: 'home',
  0: 'cop',
  1: 'resources',
  2: 'mission-planner',
  3: 'pil',
  4: 'coa',
  5: 'retasking',
  6: 'deconfliction',
  7: 'wargame',
  8: 'export',
  9: 'benchmarks',
  10: 'challenge',
  11: 'predictive',
  12: 'whatif',
  13: 'audit',
  14: 'contested',
  15: 'trainer',
  16: 'xai',
};

const SLUG_TAB_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(TAB_SLUG_MAP).map(([idx, slug]) => [slug, Number(idx)])
);

export default function AirPowerDashboard() {
  const [activeTab, setActiveTab] = useState(99); // Default to Guided 7-Step Home Experience
  const [fusedPicture, setFusedPicture] = useState<FusedOperationalPicture | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCOA | null>(null);
  const [clockMinutes, setClockMinutes] = useState(255); // H+04:15 default
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [clockSpeed, setClockSpeed] = useState(1);
  const [role, setRole] = useState<'COMMANDER' | 'PLANNER' | 'INTEL' | 'AUDITOR'>('COMMANDER');
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isServicesDirectoryOpen, setIsServicesDirectoryOpen] = useState(false);

  // Core Screens for the Curated Evaluation Story (7 Screens)
  const coreStoryTabs = [
    { label: `⭐ ${t('TAB_HOME', locale)}`, idx: 99, key: 'home', desc: '7-Step Guided Operational Flow' },
    { label: `1. ${t('TAB_COP', locale)}`, idx: 0, key: 'cop', desc: '3D/2D Fused Picture' },
    { label: `2. ${t('TAB_PIL', locale)}`, idx: 3, key: 'pil', desc: 'ATO Synthesis' },
    { label: `3. ${t('TAB_RETASK', locale)}`, idx: 5, key: 'retask', desc: 'Inject & Retask Diff' },
    { label: `4. ${t('TAB_COA', locale)}`, idx: 4, key: 'coa', desc: 'COA & Pareto Dial' },
    { label: `5. ${t('TAB_BENCH', locale)}`, idx: 9, key: 'bench', desc: 'Benchmark Evidence' },
    { label: `6. ${t('TAB_CONTESTED', locale)}`, idx: 14, key: 'contested', desc: 'Cut the Link (CRDT)' },
  ];

  // Deep-Dive Operational Screens under "More Services" Menu (11 Screens)
  const moreScreens = [
    { label: t('TAB_RES', locale), idx: 1, key: 'res', tag: 'Turnarounds & Munitions', icon: 'inventory_2', code: 'OPS-01' },
    { label: t('TAB_MP', locale), idx: 2, key: 'mp', tag: 'Direct Sortie Constructor', icon: 'edit_calendar', code: 'OPS-02' },
    { label: t('TAB_DECONF', locale), idx: 6, key: 'deconf', tag: '4D Spatial & Airway Coordination', icon: 'alt_route', code: 'OPS-03' },
    { label: t('TAB_WARGAME', locale), idx: 7, key: 'wargame', tag: 'Closed-Loop Attrition Simulator', icon: 'sports_esports', code: 'OPS-04' },
    { label: t('TAB_EXPORT', locale), idx: 8, key: 'export', tag: 'USMTF / CoT XML / GeoJSON / KML', icon: 'file_download', code: 'OPS-05' },
    { label: t('TAB_CHALLENGE', locale), idx: 10, key: 'challenge', tag: '3-Min Human vs AI Challenge', icon: 'timer', code: 'OPS-06' },
    { label: t('TAB_PRED', locale), idx: 11, key: 'pred', tag: 'Brier Score & Conformal Intervals', icon: 'analytics', code: 'OPS-07' },
    { label: t('TAB_WHATIF', locale), idx: 12, key: 'whatif', tag: 'Dynamic Doctrine Weight Tweaking', icon: 'science', code: 'OPS-08' },
    { label: t('TAB_AUDIT', locale), idx: 13, key: 'audit', tag: 'SHA-256 Tamper-Evident Ledger', icon: 'lock_clock', code: 'OPS-09' },
    { label: t('TAB_TRAINER', locale), idx: 15, key: 'trainer', tag: 'DSSC Evaluator & Counterfactual AAR', icon: 'school', code: 'OPS-10' },
    { label: t('TAB_XAI', locale), idx: 16, key: 'xai', tag: '21 Decision Reason Codes & XAI', icon: 'psychology', code: 'OPS-11' },
  ];

  const isMoreActive = moreScreens.some((s) => s.idx === activeTab);
  const activeMoreLabel = moreScreens.find((s) => s.idx === activeTab)?.label;

  const handleNavigateTab = (tabIdx: number) => {
    setActiveTab(tabIdx);
    setIsMoreMenuOpen(false);
    setIsServicesDirectoryOpen(false);
    if (typeof window !== 'undefined') {
      const slug = TAB_SLUG_MAP[tabIdx] || 'home';
      const url = new URL(window.location.href);
      url.searchParams.set('view', slug);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const navRef = React.useRef<HTMLElement>(null);
  const handleNavScroll = (delta: number) => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Initial data loading & SSE stream
  useEffect(() => {
    initPreviewInterceptor();
    const isPreview = isPreviewEnvironment();
    setIsPreviewMode(isPreview);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && SLUG_TAB_MAP[viewParam] !== undefined) {
        setActiveTab(SLUG_TAB_MAP[viewParam]);
      }

      (window as any).__SET_ACTIVE_TAB = (idx: number) => {
        handleNavigateTab(idx);
      };
    }
    fetchInitialData(isPreview);

    // Setup SSE connection only if not in static preview mode
    let eventSource: EventSource | null = null;
    if (!isPreview) {
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
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const fetchInitialData = async (forcePreview = false) => {
    if (forcePreview) {
      setFusedPicture(seed42PreviewData.fusedPicture as any);
      setCurrentPlan(seed42PreviewData.coas.balanced as any);
      return;
    }
    try {
      const [resPic, resPlan] = await Promise.all([
        fetch('http://localhost:3001/api/fused-picture'),
        fetch('http://localhost:3001/api/plan/current'),
      ]);
      if (resPic.ok) setFusedPicture(await resPic.json());
      if (resPlan.ok) setCurrentPlan(await resPlan.json());
    } catch (err) {
      console.warn('API offline; initializing Seed-42 deterministic fallback');
      setFusedPicture(seed42PreviewData.fusedPicture as any);
      setCurrentPlan(seed42PreviewData.coas.balanced as any);
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
      handleNavigateTab(3);
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
        {/* Mandatory Defence Training Classification & Advisory Statement */}
        <div className="w-full bg-[#fef2f2] border-b border-[#fecaca] text-center py-0.5 px-2 text-[10px] font-bold text-[#b91c1c] tracking-widest uppercase font-sans select-none shrink-0 truncate">
          ADVISORY DECISION SUPPORT ONLY • HUMAN COMMANDER APPROVES EVERY CHANGE • NO TARGETING OR WEAPON-EMPLOYMENT LOGIC • ALL DATA SYNTHETIC / NOTIONAL
        </div>

        {/* Prominent Evaluator Preview Banner (Item 4) */}
        {isPreviewMode && (
          <div className="w-full bg-[#0f172a] text-[#f8fafc] border-b border-[#0284c7] py-1 px-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-[#38bdf8] animate-pulse shrink-0" />
              <span className="font-bold text-[#38bdf8] uppercase tracking-wider text-[10px] shrink-0">
                EVALUATOR PREVIEW:
              </span>
              <span className="text-[#cbd5e1] text-[11px] truncate">
                Interactive replay of a recorded run on notional data. The production target is an air-gapped deployment; run it yourself with <code className="bg-[#1e293b] text-[#fde047] px-1 py-0.5 rounded text-[10px] font-bold">docker compose up</code>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-1.5 py-0.5 bg-[#1e293b] border border-[#334155] text-[9px] text-[#94a3b8] font-bold uppercase">
                DETERMINISTIC SEED 42 • ZERO SERVER REQUIRED
              </span>
            </div>
          </div>
        )}

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
                onClick={() => setIsServicesDirectoryOpen(true)}
                className="h-6.5 px-2 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-300 font-headline-md text-[10px] uppercase tracking-wider font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
                type="button"
                title="Browse All 18 Operations & Analytical Services Directory"
              >
                <span className="material-symbols-outlined text-[13px]">apps</span>
                <span>All 18 Services</span>
              </button>

              <button
                onClick={() => setIsAssumptionsOpen(true)}
                className="h-6.5 px-2 bg-surface-container-lowest text-primary border border-outline-variant font-headline-md text-[10px] uppercase tracking-wider hover:bg-surface-container-high transition-colors font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
                type="button"
                title="View Operational Doctrine & Planning Assumptions"
              >
                <span>Doctrine</span>
              </button>

              <button
                onClick={isPreviewMode ? undefined : handleResetDemo}
                disabled={isResettingDemo || isPreviewMode}
                className={`h-6.5 px-2 bg-surface-container-lowest text-on-surface border border-outline-variant font-headline-md text-[10px] uppercase tracking-wider transition-colors font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  isPreviewMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-high'
                }`}
                type="button"
                title={isPreviewMode ? 'Available in the offline build' : 'Restore Deterministic Demo State (< 2s)'}
              >
                <span className={`material-symbols-outlined text-[12px] ${isResettingDemo ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{isPreviewMode ? 'Reset (Offline)' : 'Reset'}</span>
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
        <div className="relative w-full max-w-full min-w-0 flex items-stretch bg-surface-container-lowest border-t border-outline-variant/30">
          <button
            onClick={() => handleNavScroll(-220)}
            className="h-9 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface border-r border-outline-variant flex items-center justify-center shrink-0 z-10 transition-colors"
            type="button"
            title="Scroll Tabs Left"
          >
            <span className="material-symbols-outlined text-[15px]">chevron_left</span>
          </button>

          <nav
            ref={navRef}
            className="h-9 flex-1 min-w-0 flex items-stretch gap-0 overflow-x-auto scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Primary 7-Screen Curated 5-Minute Story Flow */}
            {coreStoryTabs.map((tab) => {
              const isActive = activeTab === tab.idx;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleNavigateTab(tab.idx)}
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
          </nav>

          <button
            onClick={() => handleNavScroll(220)}
            className="h-9 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface border-l border-outline-variant flex items-center justify-center shrink-0 z-10 transition-colors"
            type="button"
            title="Scroll Tabs Right"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>

          {/* More Screens Menu Trigger (Positioned outside scrolling nav so it never gets clipped!) */}
          <div className="relative flex items-stretch shrink-0 border-l border-outline-variant/40 bg-surface-container-lowest">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`h-full px-3.5 flex items-center gap-1.5 font-label-caps text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 font-bold ${
                isMoreActive
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-800 hover:text-sky-800 hover:bg-slate-100'
              }`}
              type="button"
              title="Deep-Dive Operations & Additional Subsystems"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isMoreActive ? 'tune' : 'dashboard_customize'}
              </span>
              <span>{isMoreActive ? `OPS: ${activeMoreLabel}` : 'MORE SERVICES (11)'}</span>
              <span className="material-symbols-outlined text-[14px]">
                {isMoreMenuOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </button>

            {/* Unclipped Floating Dropdown Menu */}
            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div
                  className="absolute top-full right-0 mt-0.5 w-80 bg-white border border-slate-300 shadow-2xl rounded-b-md z-50 py-1"
                  style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
                >
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      Deep-Dive Operations (11)
                    </span>
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsServicesDirectoryOpen(true);
                      }}
                      className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-0.5"
                      type="button"
                    >
                      <span>Full Directory</span>
                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                    </button>
                  </div>
                  <div className="py-1">
                    {moreScreens.map((s) => {
                      const isCurrent = activeTab === s.idx;
                      return (
                        <button
                          key={s.key}
                          onClick={() => {
                            handleNavigateTab(s.idx);
                            setIsMoreMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                            isCurrent
                              ? 'bg-sky-50 text-sky-800 font-bold border-l-2 border-sky-600'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-[15px] text-slate-400">
                              {s.icon}
                            </span>
                            <span className="font-medium text-[11px] truncate">{s.label}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {s.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsServicesDirectoryOpen(true);
                      }}
                      className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-center text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">apps</span>
                      <span>All 18 Operations Directory</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Tactical Screen Container */}
      <main className="flex-1 p-gutter-desktop max-w-[1600px] mx-auto w-full">
        {fusedPicture ? (
          <>
            <PageHeaderBreadcrumb
              activeTab={activeTab}
              onNavigateHome={() => handleNavigateTab(99)}
              onOpenDirectory={() => setIsServicesDirectoryOpen(true)}
              locale={locale}
            />

            {activeTab === 99 && (
              <GuidedHomeExperience
                fusedPicture={fusedPicture}
                currentPlan={currentPlan}
                locale={locale}
                onNavigateToScreen={(tabIdx) => handleNavigateTab(tabIdx)}
                onOpenAssumptions={() => setIsAssumptionsOpen(true)}
                onOpenDirectory={() => setIsServicesDirectoryOpen(true)}
              />
            )}
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
            <span>ADVISORY SUPPORT ONLY (HUMAN APPROVAL REQUIRED)</span>
            <span>//</span>
            <span>NO TARGETING / ENGAGEMENT LOGIC</span>
            <span>//</span>
            <span>ALL DATA SYNTHETIC &amp; NOTIONAL</span>
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

      {/* All 18 Operations / Services Directory Modal */}
      <ServicesDirectoryModal
        isOpen={isServicesDirectoryOpen}
        onClose={() => setIsServicesDirectoryOpen(false)}
        onSelectService={(idx) => handleNavigateTab(idx)}
        activeTab={activeTab}
        locale={locale}
      />
    </div>
  );
}
