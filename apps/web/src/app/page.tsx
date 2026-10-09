'use client';

import React, { useState, useEffect } from 'react';
import {
  FusedOperationalPicture,
  PlanCOA,
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
import { PredictiveCalibrationView } from '../components/PredictiveCalibrationView';
import { WhatIfSandbox } from '../components/WhatIfSandbox';
import { AuditTrailView } from '../components/AuditTrailView';
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

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

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

  const navTabs = [
    { label: 'COMMON OPERATING PICTURE', key: 'cop' },
    { label: 'RESOURCE BOARD', key: 'res' },
    { label: 'MISSION PLANNER & ATO', key: 'mp' },
    { label: 'PLANNER-IN-THE-LOOP STUDIO', key: 'pil' },
    { label: 'COA COMPARISON STUDIO', key: 'coa' },
    { label: 'DYNAMIC RETASKING CONSOLE', key: 'retask' },
    { label: '4D DECONFLICTION & TANKERS', key: 'deconf' },
    { label: 'CLOSED-LOOP WARGAME SIMULATOR', key: 'wargame' },
    { label: 'ATO / ACO EXPORT', key: 'export' },
    { label: 'BENCHMARK EVIDENCE HARNESS', key: 'bench' },
    { label: 'PREDICTIVE ANALYTICS', key: 'pred' },
    { label: 'WHAT-IF SANDBOX', key: 'whatif' },
    { label: 'AUDIT & FEEDS', key: 'audit' },
  ];

  const formatClockTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `H+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen select-none" style={{ background: '#f6fafe', color: '#171c1f' }}>
      {/* Top Daylight Military Header Bar */}
      <header className="sticky top-0 left-0 w-full z-40 bg-surface-container-lowest border-b border-outline-variant shadow-xs">
        <div className="h-12 w-full px-gutter-desktop flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest">
          {/* Logo & Operational Subtitle */}
          <div className="flex items-center gap-space-lg">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-sm tracking-wider shadow-xs">
              AP
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-md">
                <span className="font-label-caps text-label-caps text-primary tracking-wider uppercase font-bold">
                  AIR POWER // C2 DECISION-SUPPORT SYSTEM
                </span>
                <span className="px-space-sm py-0.5 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-label-data-sm text-[10px] uppercase font-bold leading-none">
                  NOTIONAL TRAINING DATA — UNCLASSIFIED
                </span>
              </div>
              <span className="font-label-data-sm text-label-data-sm text-on-surface-variant font-medium tracking-tight">
                WESTERN SECTOR // 6 BASES // 68 AIRFRAMES
              </span>
            </div>
          </div>

          {/* Tactical Mission Clock Scrubbing Control */}
          <div className="flex items-center gap-space-md bg-surface-container px-space-md py-space-xs border border-outline-variant">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">MET</span>
              <span className="font-label-data-lg text-label-data-lg text-primary bg-surface-container-lowest px-space-sm py-0.5 border border-outline-variant font-bold">
                {formatClockTime(clockMinutes)}
              </span>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => handleClockControl(isClockRunning ? 'PAUSE' : 'PLAY')}
                className="h-6 px-space-sm bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-data-sm text-[11px] flex items-center justify-center font-bold"
                type="button"
                title={isClockRunning ? 'Pause Sim' : 'Play Sim'}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isClockRunning ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-0.5">
              {[1, 5, 15, 60].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleClockControl('SPEED', { multiplier: spd })}
                  className={`h-6 px-space-sm font-label-data-sm text-[11px] font-bold border transition ${
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
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs border border-outline-variant">
              <span className="h-2 w-2 rounded-full bg-[#15803d] animate-pulse"></span>
              <span className="font-label-data-sm text-label-data-sm text-primary font-bold tracking-tight">
                COP FUSION: {fusedPicture?.overallConfidenceScore || 98.4}% (BAYESIAN SYNC)
              </span>
            </div>

            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="h-7 px-space-md bg-surface-container-lowest border border-outline-variant font-label-caps text-label-caps text-primary hover:bg-surface-container-high focus:outline-none cursor-pointer uppercase font-bold"
              >
                <option value="COMMANDER">AIR COMMANDER (APPROVAL ONLY)</option>
                <option value="PLANNER">CHIEF PLANNER</option>
                <option value="INTEL">INTEL ANALYST</option>
                <option value="AUDITOR">DEFENCE AUDITOR</option>
              </select>
            </div>

            <div className="flex items-center gap-space-sm">
              <button
                onClick={() => setIsAssumptionsOpen(true)}
                className="h-7 px-space-md bg-surface-container-lowest text-primary border border-outline-variant font-headline-md text-[11px] uppercase tracking-wider hover:bg-surface-container-high transition-colors font-bold"
                type="button"
              >
                Assumptions &amp; Doctrine
              </button>

              <button
                onClick={handleResetDemo}
                disabled={isResettingDemo}
                className="h-7 px-space-md bg-surface-container-lowest text-on-surface border border-outline-variant font-headline-md text-[11px] uppercase tracking-wider hover:bg-surface-container-high transition-colors font-bold flex items-center gap-1"
                type="button"
                title="Restore Deterministic Demo State (< 2s)"
              >
                <span className={`material-symbols-outlined text-[13px] ${isResettingDemo ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Tab Navigation Bar */}
        <nav className="h-9 w-full px-gutter-desktop flex items-stretch gap-0 bg-surface-container-lowest border-t border-outline-variant/30 overflow-x-auto">
          {navTabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(idx)}
                className={`h-full px-space-lg flex items-center font-label-caps text-[11px] uppercase tracking-wider border-r border-outline-variant/40 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-surface-container-high text-primary border-b-2 border-secondary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-semibold'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
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
            {activeTab === 9 && <BenchmarkDashboard />}
            {activeTab === 10 && <PredictiveCalibrationView />}
            {activeTab === 11 && (
              <WhatIfSandbox
                currentPlan={currentPlan}
                fusedPicture={fusedPicture}
                onCommitForkedPlan={(promoted) => setCurrentPlan(promoted)}
              />
            )}
            {activeTab === 12 && <AuditTrailView fusedPicture={fusedPicture} />}
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
          <div className="absolute bottom-12 left-0 w-[420px] shadow-2xl z-50">
            <CopilotModal onPlanUpdated={(plan) => setCurrentPlan(plan)} />
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
