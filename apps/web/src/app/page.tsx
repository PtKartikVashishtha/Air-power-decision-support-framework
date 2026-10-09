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
import { DemoNarrationModal } from '../components/DemoNarrationModal';
import { AssumptionsDoctrineModal } from '../components/AssumptionsDoctrineModal';
import {
  Map,
  Layers,
  CalendarCheck,
  Edit3,
  Split,
  RefreshCw,
  Compass,
  Swords,
  FileText,
  BarChart2,
  LineChart,
  GitBranch,
  Shield,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Activity,
  UserCheck,
  BookOpen,
} from 'lucide-react';

export default function AirPowerDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [fusedPicture, setFusedPicture] = useState<FusedOperationalPicture | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCOA | null>(null);
  const [clockMinutes, setClockMinutes] = useState(0);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [clockSpeed, setClockSpeed] = useState(1);
  const [role, setRole] = useState<'COMMANDER' | 'PLANNER' | 'INTEL' | 'AUDITOR'>('COMMANDER');

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
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
        simTimeMinutes: 0,
        overallConfidenceScore: 95,
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
      setActiveTab(0);
    } catch (err) {
      console.error('Reset failed', err);
    } finally {
      setIsResettingDemo(false);
    }
  };

  const navTabs = [
    { label: 'COP RADAR GRID', icon: Map },
    { label: 'RESOURCE BOARD', icon: Layers },
    { label: 'MISSION PLANNER', icon: CalendarCheck },
    { label: 'PLANNER-IN-THE-LOOP', icon: Edit3 },
    { label: 'COA STUDIO', icon: Split },
    { label: 'RETASKING CONSOLE', icon: RefreshCw },
    { label: 'DECONFLICTION & TANKERS', icon: Compass },
    { label: 'WARGAME SIMULATOR', icon: Swords },
    { label: 'ATO / ACO EXPORT', icon: FileText },
    { label: 'BENCHMARK EVIDENCE', icon: BarChart2 },
    { label: 'PREDICTIVE ANALYTICS', icon: LineChart },
    { label: 'WHAT-IF SANDBOX', icon: GitBranch },
    { label: 'AUDIT & FEEDS', icon: Shield },
  ];

  const formatClockTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `H+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-ops-950 text-gray-200">
      {/* Top Tactical Command HUD Header */}
      <header className="bg-ops-900 border-b border-ops-700/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-ops-accent rounded-full animate-pulse glow-cyan" />
            <h1 className="text-base font-bold text-white tracking-wide font-mono">
              AIR POWER <span className="text-ops-accent">// C2 DECISION-SUPPORT FRAMEWORK</span>
            </h1>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-ops-800 border border-ops-700 text-gray-300 font-mono">
            SIH PS 26250
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono font-bold">
            NOTIONAL / TRAINING DATA
          </span>
        </div>

        {/* Tactical Clock Scrubbing Widget */}
        <div className="flex items-center space-x-3 bg-ops-950 border border-ops-700/80 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="text-gray-400">OPERATION TIME:</span>
          <span className="text-ops-accent font-bold text-sm tracking-widest">
            {formatClockTime(clockMinutes)}
          </span>

          <div className="flex items-center space-x-1 pl-2 border-l border-ops-800">
            <button
              onClick={() => handleClockControl(isClockRunning ? 'PAUSE' : 'PLAY')}
              className={`p-1 rounded transition ${
                isClockRunning ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
              }`}
              title={isClockRunning ? 'Pause Sim' : 'Play Sim'}
            >
              {isClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {[1, 5, 15, 60].map((spd) => (
              <button
                key={spd}
                onClick={() => handleClockControl('SPEED', { multiplier: spd })}
                className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                  clockSpeed === spd
                    ? 'bg-ops-accent text-ops-950 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* System Health, Role, and Action Controls */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <button
            onClick={() => setIsAssumptionsOpen(true)}
            className="flex items-center space-x-1 bg-ops-950 border border-ops-800 px-2.5 py-1.5 rounded text-gray-300 hover:text-white hover:border-ops-700 transition"
            title="Operational Assumptions & Doctrine Notes"
          >
            <BookOpen className="w-3.5 h-3.5 text-ops-accent" />
            <span>ASSUMPTIONS</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResettingDemo}
            className="flex items-center space-x-1 bg-ops-950 border border-ops-800 px-2.5 py-1.5 rounded text-gray-300 hover:text-white hover:border-ops-700 transition"
            title="Restore Deterministic Demo State (< 2s)"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResettingDemo ? 'animate-spin' : ''}`} />
            <span>RESET DEMO</span>
          </button>

          <div className="flex items-center space-x-1.5 bg-ops-950 px-2.5 py-1.5 rounded border border-ops-800">
            <UserCheck className="w-3.5 h-3.5 text-ops-accent" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-transparent text-gray-200 text-xs focus:outline-none"
            >
              <option value="COMMANDER" className="bg-ops-900">AIR COMMANDER (APPROVAL ONLY)</option>
              <option value="PLANNER" className="bg-ops-900">CHIEF PLANNER</option>
              <option value="INTEL" className="bg-ops-900">INTEL ANALYST</option>
              <option value="AUDITOR" className="bg-ops-900">DEFENCE AUDITOR</option>
            </select>
          </div>

          <button
            onClick={() => setIsDemoOpen(true)}
            className="flex items-center space-x-1.5 bg-ops-accent text-ops-950 font-bold px-3 py-1.5 rounded hover:bg-cyan-300 transition shadow-lg glow-cyan"
          >
            <Sparkles className="w-4 h-4" />
            <span>5-MIN JURY DEMO</span>
          </button>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <nav className="bg-ops-900/90 border-b border-ops-700/60 px-6 py-1.5 flex items-center space-x-1 overflow-x-auto">
        {navTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-mono transition whitespace-nowrap ${
                isActive
                  ? 'bg-ops-accent/15 text-ops-accent border border-ops-accent/40 font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-ops-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main View Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
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
          <div className="p-16 text-center text-gray-400 font-mono text-sm">
            <div className="w-8 h-8 border-2 border-ops-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            CONNECTING TO TACTICAL FUSION ENGINE...
          </div>
        )}
      </main>

      {/* Floating Tactical AI Copilot Button & Panel */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className="flex items-center space-x-2 bg-ops-900 border border-ops-accent/60 text-ops-accent px-4 py-2.5 rounded-full shadow-2xl hover:bg-ops-850 transition glow-cyan text-xs font-mono font-bold"
        >
          <Bot className="w-4 h-4 text-ops-accent" />
          <span>TACTICAL AI COPILOT</span>
        </button>

        {isCopilotOpen && (
          <div className="absolute bottom-12 left-0 w-[420px] shadow-2xl z-50">
            <CopilotModal onPlanUpdated={(plan) => setCurrentPlan(plan)} />
          </div>
        )}
      </div>

      {/* 5-Minute Guided Demo Narration Modal */}
      <DemoNarrationModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onNavigateTab={(idx) => setActiveTab(idx)}
      />

      {/* Assumptions & Doctrine Notes Modal */}
      <AssumptionsDoctrineModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />
    </div>
  );
}
