'use client';

import React, { useState } from 'react';
import { SupportedLocale, t } from '@air-power/shared';

export interface ServiceItem {
  idx: number;
  id: string;
  code: string;
  titleKey: string;
  defaultTitle: string;
  category: 'CORE' | 'TACTICAL' | 'ADVERSARY' | 'EVIDENCE' | 'DOCTRINE';
  role: 'COMMANDER' | 'PLANNER' | 'INTEL' | 'AUDITOR' | 'ALL';
  icon: string;
  badge: string;
  summary: string;
  bullets: string[];
}

export const ALL_SERVICES: ServiceItem[] = [
  // Core Evaluation Story (7 Screens)
  {
    idx: 99,
    id: 'home',
    code: 'CORE-00',
    titleKey: 'TAB_HOME',
    defaultTitle: '7-Step Guided Mission Flow',
    category: 'CORE',
    role: 'ALL',
    icon: 'flag',
    badge: 'START HERE',
    summary: 'Curated 5-minute evaluation walkthrough with explicit system actions vs human decision gates.',
    bullets: [
      'Seven step-by-step mission progression checkpoints',
      'Instant access to all core operational tools',
      'Advisory doctrine compliance and ethics disclosures',
    ],
  },
  {
    idx: 0,
    id: 'cop',
    code: 'CORE-01',
    titleKey: 'TAB_COP',
    defaultTitle: 'Common Operating Picture (COP)',
    category: 'CORE',
    role: 'COMMANDER',
    icon: 'map',
    badge: '3D/2D FUSED',
    summary: 'Multi-layer tactical display integrating 7 sensor streams with Bayesian temporal decay and 3D MEZ threat domes.',
    bullets: [
      'High-altitude and low-altitude terrain radar shadow masks',
      'Real-time enemy radar (S-400, HQ-9) coverage engagement envelopes',
      'Airbase status, runway readiness, and active patrol orbits',
    ],
  },
  {
    idx: 3,
    id: 'pil',
    code: 'CORE-02',
    titleKey: 'TAB_PIL',
    defaultTitle: 'Planner-in-the-Loop Studio (ATO)',
    category: 'CORE',
    role: 'PLANNER',
    icon: 'flight_takeoff',
    badge: 'ALNS SOLVER',
    summary: 'Anytime ALNS metaheuristic synthesizes the complete Air Tasking Order in under 50ms with 21 reason codes.',
    bullets: [
      'Sortie timeline with aircrew turnarounds and payload matching',
      'Interactive constraint relaxation and priority tuning',
      'Deterministic allocation verified on Seed 42',
    ],
  },
  {
    idx: 5,
    id: 'retask',
    code: 'CORE-03',
    titleKey: 'TAB_RETASK',
    defaultTitle: 'Dynamic Re-Tasking Console',
    category: 'CORE',
    role: 'COMMANDER',
    icon: 'bolt',
    badge: '< 30MS DELTA',
    summary: 'Rapid response to pop-up threats, bad weather, or base cratering with minimum-disruption delta ATO synthesis.',
    bullets: [
      'In-flight target pop-up injection with automated tanker divert',
      'Side-by-side Diff view showing affected vs preserved sorties',
      'Mandatory Human Commander approval before execution',
    ],
  },
  {
    idx: 4,
    id: 'coa',
    code: 'CORE-04',
    titleKey: 'TAB_COA',
    defaultTitle: 'COA Comparison Studio & Pareto Dial',
    category: 'CORE',
    role: 'COMMANDER',
    icon: 'tune',
    badge: 'PARETO OPTIMAL',
    summary: 'Multi-objective tradeoff analysis across fuel consumption, target coverage, and mission survivability.',
    bullets: [
      'Compare Aggressive Strike, Balanced Reserve, and High-Survivability COAs',
      'Interactive Pareto Dial to interpolate optimal weighting',
      'Cryptographic commander authentication sign-off token',
    ],
  },
  {
    idx: 9,
    id: 'bench',
    code: 'CORE-05',
    titleKey: 'TAB_BENCH',
    defaultTitle: 'Benchmark Evidence Harness',
    category: 'CORE',
    role: 'AUDITOR',
    icon: 'query_stats',
    badge: '100 SEEDS',
    summary: 'Empirical solver performance validation logged with 95% confidence intervals and hypothesis tests.',
    bullets: [
      'Empirical p < 0.001 proof vs human-heuristic and greedy baselines',
      'Sub-50ms solve time distribution across varied fleet sizes',
      'Deterministic reproducibility command verification',
    ],
  },
  {
    idx: 14,
    id: 'contested',
    code: 'CORE-06',
    titleKey: 'TAB_CONTESTED',
    defaultTitle: 'Contested & Edge Operations Studio',
    category: 'CORE',
    role: 'PLANNER',
    icon: 'wifi_off',
    badge: 'EDGE CRDT MESH',
    summary: 'Simulation of central command link severed by heavy electronic warfare; activates local autonomous edge mesh.',
    bullets: [
      'Cut the Central Link toggle to test edge fallback resilience',
      'CRDT state reconciliation with zero data corruption on link restore',
      'Degraded SATCOM / Silent EMCON flight plans',
    ],
  },

  // Deep-Dive Operational Services (11 Screens)
  {
    idx: 1,
    id: 'res',
    code: 'OPS-01',
    titleKey: 'TAB_RES',
    defaultTitle: 'Resource Board & Base Turnarounds',
    category: 'TACTICAL',
    role: 'PLANNER',
    icon: 'inventory_2',
    badge: '6 BASES // 68 JETS',
    summary: 'Real-time inventory of aircraft, precision munitions, aviation fuel, and turnaround bay cycles.',
    bullets: [
      'Base-by-base readiness: Ambala, Halwara, Adampur, Sirsa, Suratgarh, Jodhpur',
      'Surge turnaround countdowns and maintenance schedules',
      'Munition depletion forecasting and cross-base logistics transfers',
    ],
  },
  {
    idx: 2,
    id: 'mp',
    code: 'OPS-02',
    titleKey: 'TAB_MP',
    defaultTitle: 'Direct Sortie Constructor',
    category: 'TACTICAL',
    role: 'PLANNER',
    icon: 'edit_calendar',
    badge: 'MANUAL BUILDER',
    summary: 'Granular package builder for mission commanders crafting specialized or unorthodox tactical packages.',
    bullets: [
      'Direct drag-and-drop escort, strike, and SEAD aircraft assignment',
      'Weapon hardpoint configuration and fuel load estimation',
      'Target time-on-target (TOT) synchronization matrix',
    ],
  },
  {
    idx: 6,
    id: 'deconf',
    code: 'OPS-03',
    titleKey: 'TAB_DECONF',
    defaultTitle: '4D Spatial Deconfliction & Tanker Coordination',
    category: 'TACTICAL',
    role: 'PLANNER',
    icon: 'alt_route',
    badge: '4D AIRWAYS',
    summary: 'Four-dimensional spatial corridor verification ensuring safe altitude, route, and tanker rendezvous timing.',
    bullets: [
      'Automated conflict detection: minimum 5nm lateral / 2,000ft altitude separation',
      'Air-to-Air Refueling (AAR) tanker track scheduling and fuel transfer rates',
      'Airspace Control Order (ACO) corridor compliance checks',
    ],
  },
  {
    idx: 7,
    id: 'wargame',
    code: 'OPS-04',
    titleKey: 'TAB_WARGAME',
    defaultTitle: 'Closed-Loop Wargame Simulator',
    category: 'ADVERSARY',
    role: 'INTEL',
    icon: 'sports_esports',
    badge: 'LANCHESTER MODEL',
    summary: 'Multi-turn adversarial simulation modeling Red vs Blue operational engagements and weapon exchange ratios.',
    bullets: [
      'Monte Carlo and Lanchester square-law attrition modeling',
      'Airbase cratering and runway repair timeline consequences',
      'Cumulative kill-ratio forecasting across 24-hour campaign phases',
    ],
  },
  {
    idx: 8,
    id: 'export',
    code: 'OPS-05',
    titleKey: 'TAB_EXPORT',
    defaultTitle: 'ATO / ACO Interoperability & Export',
    category: 'TACTICAL',
    role: 'ALL',
    icon: 'file_download',
    badge: 'AIR-GAPPED EXPORT',
    summary: 'Production-ready defense format export for integration with legacy C2 systems and tactical ground terminals.',
    bullets: [
      'USMTF standard Air Tasking Order and Airspace Control Order format',
      'Cursor-on-Target (CoT) XML for ATAK/WinTAK situational awareness feeds',
      'Standard GeoJSON and KML mission route overlays',
    ],
  },
  {
    idx: 10,
    id: 'challenge',
    code: 'OPS-06',
    titleKey: 'TAB_CHALLENGE',
    defaultTitle: '3-Minute Human vs AI Planning Challenge',
    category: 'DOCTRINE',
    role: 'PLANNER',
    icon: 'timer',
    badge: 'HUMAN VS AI',
    summary: 'Interactive challenge where a human planner allocates sorties against time and compares scores to the AI solver.',
    bullets: [
      '3-minute countdown to allocate strike and CAP assets to mission targets',
      'Instant side-by-side scoring: coverage, fuel burn, survivability, and solve time',
      'Demonstrates why human-heuristic alone misses complex constraint optimizations',
    ],
  },
  {
    idx: 11,
    id: 'pred',
    code: 'OPS-07',
    titleKey: 'TAB_PRED',
    defaultTitle: 'Predictive Calibration & Brier Scores',
    category: 'EVIDENCE',
    role: 'AUDITOR',
    icon: 'analytics',
    badge: 'CONFORMAL BOUNDS',
    summary: 'Rigorous empirical calibration proving uncertainty predictions are neither overconfident nor timid.',
    bullets: [
      'Brier score tracking across weather fronts, mechanical aborts, and enemy pop-ups',
      'Conformal prediction intervals with verified 90% and 95% coverage guarantees',
      'Reliability calibration curves proving probability calibration',
    ],
  },
  {
    idx: 12,
    id: 'whatif',
    code: 'OPS-08',
    titleKey: 'TAB_WHATIF',
    defaultTitle: 'What-If Doctrine Sandbox',
    category: 'ADVERSARY',
    role: 'COMMANDER',
    icon: 'science',
    badge: 'DOCTRINE TWEAKER',
    summary: 'Live parametric experimentation allowing commanders to test altered rules of engagement and survivability floors.',
    bullets: [
      'Adjust survivability risk tolerance sliders in real time',
      'Simulate loss of forward operating bases or key air routes',
      'Fork an experimental plan and promote it to active master plan with 1 click',
    ],
  },
  {
    idx: 13,
    id: 'audit',
    code: 'OPS-09',
    titleKey: 'TAB_AUDIT',
    defaultTitle: 'Tamper-Evident Audit Ledger & Feeds',
    category: 'EVIDENCE',
    role: 'AUDITOR',
    icon: 'lock_clock',
    badge: 'SHA-256 LEDGER',
    summary: 'Cryptographically chained audit trail logging every solver invocation, commander override, and sensor ingestion.',
    bullets: [
      'Immutable SHA-256 hash chaining of all plan revisions and decisions',
      'Dual-key commander authorization token verification',
      'Exportable audit bundle for post-mission judicial and parliamentary inquiry',
    ],
  },
  {
    idx: 15,
    id: 'trainer',
    code: 'OPS-10',
    titleKey: 'TAB_TRAINER',
    defaultTitle: 'Staff College Trainer & After-Action Review (AAR)',
    category: 'DOCTRINE',
    role: 'ALL',
    icon: 'school',
    badge: 'DSSC WAR COLLEGE',
    summary: 'Pedagogical training suite built for Defence Services Staff College war gaming and counterfactual debriefs.',
    bullets: [
      'Counterfactual debriefs: "What if the reserve had been deployed at H+02?"',
      'Comprehensive student scorecard tracking doctrine compliance and efficiency',
      'Interactive timeline playback of tactical air decisions',
    ],
  },
  {
    idx: 16,
    id: 'xai',
    code: 'OPS-11',
    titleKey: 'TAB_XAI',
    defaultTitle: 'Decision Reason Codes & Explainability Studio',
    category: 'EVIDENCE',
    role: 'AUDITOR',
    icon: 'psychology',
    badge: '21 REASON CODES',
    summary: 'Complete catalogue and inspector for all 21 tactical reason codes explaining every airframe assignment.',
    bullets: [
      'Inspect exact reason codes: RC-101 (Weapon-Target Fit), RC-202 (Runway Limit), etc.',
      'Per-sortie constraint compliance breakdown and survivability justification',
      'Eliminates AI black-box mistrust with human-auditable rationale',
    ],
  },
];

interface ServicesDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (tabIdx: number) => void;
  activeTab: number;
  locale: SupportedLocale;
}

export const ServicesDirectoryModal: React.FC<ServicesDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectService,
  activeTab,
  locale,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    { key: 'ALL', label: 'All Services (18)', count: 18 },
    { key: 'CORE', label: 'Core Story (7)', count: 7 },
    { key: 'TACTICAL', label: 'Tactical Planning (3)', count: 3 },
    { key: 'ADVERSARY', label: 'Adversary & Wargaming (3)', count: 3 },
    { key: 'EVIDENCE', label: 'Audit & Evidence (4)', count: 4 },
    { key: 'DOCTRINE', label: 'Doctrine & Training (2)', count: 2 },
  ];

  const filteredServices = ALL_SERVICES.filter((svc) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'CORE' && svc.category === 'CORE') ||
      svc.category === selectedCategory;

    const title = t(svc.titleKey, locale) || svc.defaultTitle;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      title.toLowerCase().includes(query) ||
      svc.summary.toLowerCase().includes(query) ||
      svc.code.toLowerCase().includes(query) ||
      svc.badge.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-surface-container-lowest border border-outline-variant shadow-2xl flex flex-col rounded-lg overflow-hidden"
        style={{ background: '#f8fafc', color: '#0f172a' }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#0284c7] text-white flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-[24px]">apps</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                  Command Services & Operations Directory
                </h2>
                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold rounded">
                  18 MODULES AVAILABLE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct access to all 7 primary mission flow checkpoints and 11 deep-dive analytical subsystems.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            type="button"
            title="Close Directory"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services (e.g. Tanker, Wargame, ATO)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Services Grid (Spacious, Multi-Column, Readable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((svc) => {
              const isActive = activeTab === svc.idx;
              const title = t(svc.titleKey, locale) || svc.defaultTitle;

              return (
                <div
                  key={svc.id}
                  onClick={() => {
                    onSelectService(svc.idx);
                    onClose();
                  }}
                  className={`group relative p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-sky-50/70 border-sky-400 shadow-sm ring-1 ring-sky-400'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-md'
                  }`}
                >
                  {/* Top metadata */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {svc.code}
                        </span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold rounded">
                          {svc.role}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 text-[9px] font-mono font-bold rounded">
                        {svc.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#0284c7] text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700 transition-colors'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{svc.icon}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors leading-snug">
                        {title}
                      </h3>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {svc.summary}
                    </p>

                    {/* Highlights */}
                    <ul className="space-y-1 mb-4 text-[11px] text-slate-500">
                      {svc.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-sky-400 shrink-0" />
                          <span className="truncate">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span
                      className={`flex items-center gap-1 ${
                        isActive ? 'text-sky-700 font-bold' : 'text-slate-500 group-hover:text-sky-600'
                      }`}
                    >
                      {isActive ? 'CURRENT SCREEN' : 'Launch Module'}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-[36px] mb-2 text-slate-300">
                search_off
              </span>
              <p className="text-sm font-semibold">No operations matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-sky-600 hover:underline"
                type="button"
              >
                Clear search query
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Evaluation Tip:</span>
            <span>All modules function air-gapped without external network calls.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onSelectService(99);
                onClose();
              }}
              className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1"
              type="button"
            >
              <span>Return to 7-Step Mission Plan</span>
              <span className="material-symbols-outlined text-[14px]">flag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
