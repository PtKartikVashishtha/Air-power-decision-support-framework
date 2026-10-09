# CONTEXT.md — AIR POWER (SIH 26250)
*Single Source of Truth for Autonomous Agents, Defence Evaluators, and Engineers*

---

## 1. Project Summary & Problem Statement
- **Project**: AIR POWER — Dynamic Air Operations & Resource Optimisation
- **Problem Statement**: SIH 26250 (Ministry of Defence / Defence Services Staff College, Theme: Transportation & Logistics, Software)
- **Verbatim Intent**: Planning and dynamically retasking air operations in a contested, rapidly changing environment is complex. Data on aircraft availability, crew status, weapon loads, airspace, weather, threats, and mission priorities sits in multiple disconnected systems. This causes longer planning timelines and sub-optimal allocation of scarce airpower assets.
- **Mission**: Deliver an offline-capable, production-grade, human-in-the-loop decision-support platform that fuses 7 operational data families, produces optimized Air Tasking Orders (ATO) in milliseconds rather than hours, enables dynamic retasking under injects (SAM pop-up, AOG, weather closure, TST) with minimal disruption and explainable diffs, and demonstrates measurable, defensible superiority over manual/greedy baselines.

---

## 2. Phase 2 Checklist & Status (P1 – P10 "Harden, Prove, Out-Class")

| Milestone | Scope & Deliverables | Status | Defensible Evidence / Artifact |
| :--- | :--- | :--- | :--- |
| **P1** | **Credibility Audit & Claims Register** | **COMPLETE** | `docs/AUDIT_REPORT.md`, `docs/CLAIMS_REGISTER.md` (CLM-01 to CLM-10). Baseline strawman replaced by credible human heuristic (B1) and package greedy (B2). |
| **P2** | **Operational Realism Gaps** | **COMPLETE** | Multi-wave SGR separation, IL-78 tanker AAR offload (NATO DINO-SAAR), 4D spatiotemporal deconfliction, F2T2EA kill-chain compression, `AssumptionsDoctrineModal.tsx`. |
| **P3** | **Closed-Loop Wargame Evaluation** | **COMPLETE** | `packages/sim/src/wargame-simulator.ts`, `WargameDashboard.tsx`. 100-campaign Monte Carlo trial proving **94% attrition reduction** ($p < 0.001$, Wilcoxon test). |
| **P4** | **Planner-in-the-Loop & Explainability** | **COMPLETE** | `PlannerInTheLoopStudio.tsx`. Interactive sortie editor, live constraint violation feedback, auto-repair, counterfactuals ("Why this tail?"), 1,000-run Monte Carlo success curve. |
| **P5** | **Real Map & Tactical Grid** | **COMPLETE** | 60 FPS Tactical COP radar grid with range rings, MEZ threat domes, corridor arcs, and offline fallback. |
| **P6** | **Calibrated Predictive Analytics** | **COMPLETE** | `PredictiveCalibrationView.tsx`. Reliability diagram, Brier score (0.041-0.082), MAE, 90% interval coverage, wargame ablation analysis. |
| **P7** | **Scale & Performance Benchmarking** | **COMPLETE** | `benchmarks/run-scale-benchmark.ts`. 68 sorties (50ms) &rarr; 200 sorties (141ms) &rarr; 500 sorties (998ms) &rarr; 1,000 sorties (4.68s) with 0 hard violations. |
| **P8** | **Demo Reliability & Offline Hardening** | **COMPLETE** | Deterministic Seed 42, &lt;2s Reset Demo button, Preflight System Check, Web SpeechSynthesis narration toggle (default OFF per doctrine). |
| **P9** | **Integration, Security & Trust (STRIDE)** | **COMPLETE** | `packages/sim/src/file-adapter.ts` (CSV/JSON ingestion & error quarantine), `docs/SECURITY_NOTE_STRIDE.md` (STRIDE-lite threat model, RBAC matrix, SBOM). |
| **P10** | **Submission Kit & Final Presentation** | **COMPLETE** | `docs/AIR_POWER_12_SLIDE_DECK.html` (interactive 12-slide deck), updated `docs/SIH_PRESENTATION_KIT.md` (30 hostile Q&As, 5-min live script, 2-min video script). |

---

## 3. Architecture & Repository Map

```
/
├── apps/
│   ├── web/                     # Next.js 15 Dark Ops Shell (13 Tactical Tabs, Copilot, Demo Modal)
│   │   └── src/components/      # TacticalMap, WargameDashboard, PlannerInTheLoopStudio, Deconfliction...
│   └── api/                     # Fastify + TypeScript (Fusion Core, State Store, SSE Stream, REST BFF)
├── packages/
│   ├── shared/                  # Strict Zod Domain Schemas, USMTF Military Serializers, Geodesics
│   ├── optimizer/               # ALNS Metaheuristic, Independent Verifier, Baselines, Deconfliction
│   └── sim/                     # Closed-Loop Wargame Simulator, Data Adapters, Discrete-Event Clock
├── benchmarks/                  # 100-Seed Rigorous Benchmark & Scale Harness (68 -> 1,000 sorties)
│   ├── run-benchmark.ts         # 100-seed trials generating benchmark_100_seeds.csv
│   └── run-scale-benchmark.ts   # Multi-tier scale runner (68 -> 1,000 sorties)
├── docs/                        # Formal Architectural & Defence Submission Documentation
│   ├── CLAIMS_REGISTER.md       # Traceability index of all quantitative claims
│   ├── AUDIT_REPORT.md          # Credibility audit findings & remediation actions
│   ├── AIR_POWER_12_SLIDE_DECK.html # Standalone 12-slide interactive defence presentation deck
│   ├── SIH_PRESENTATION_KIT.md  # 30 hostile Q&As, 5-min live demo script, 2-min video script
│   ├── SECURITY_NOTE_STRIDE.md  # STRIDE-lite threat model, RBAC matrix, SBOM
│   └── MATHEMATICAL_MODEL.md    # Formal objective formulation & Multi-Wave SGR constraints
├── deploy/                      # Multi-stage Dockerfile and docker-compose.yml
└── scripts/                     # Quickstart demo runners and benchmark automation
```

---

## 4. Key Architectural Decision Records (ADRs)

- **ADR-01: Zero-Python Runtime Path**: All microservices, solvers, and simulators execute in Node.js / TypeScript. Eliminates Python IPC serialization latency, avoids native environment drift, and guarantees instant cold starts.
- **ADR-02: Decoupled Independent Verifier**: Hard constraint compliance is never audited by the solver's internal code. An independent module written directly from the DSSC operational specification verifies every generated plan.
- **ADR-03: Multi-Wave SGR & Turnaround Buffers**: Multi-wave sortie generation enforces mandatory 45-60 min turnaround buffers between consecutive sorties on the same airframe and 8-hour pilot rest windows.
- **ADR-04: Frozen-Zone Retasking (15-min horizon)**: Committed airborne sorties are protected against automatic disruption, preserving tactical stability while retasking flexible assets in under 2.5 seconds.
- **ADR-05: NATO DINO-SAAR Tanker Paradigm**: Models tanker fuel offload capacity (65t per IL-78) as a constrained pool to minimize dedicated tanker sorties.

---

## 5. Statistical Rigor Summary (100 Seeds Benchmark)

| Evaluation Metric | Manual Staff Heuristic (B1) | Package Greedy (B2) | ALNS Optimizer (Ours) | Defensible Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Value Coverage** | 14.51% (CI: [13.88, 15.14]) | 36.99% (CI: [36.49, 37.49]) | **68.24% (CI: [67.29, 69.2])** | **+53.73% higher value** |
| **Package Integrity** | 3.9% (Missing escorts) | 100.0% (Greedy lock) | **100.0% (Full Strike+SEAD+CAP)** | Guaranteed complete packages |
| **Hard Violations** | ~0.8 / plan | ~0.4 / plan | **0 violations (Audited)** | Zero duty or range overruns |
| **Solve Duration** | Modelled: 120 mins cycle | ~14 ms | **25.07 ms (CI: [24.1, 26.0])** | Instant anytime response |
| **HiGHS-WASM Gap** | N/A (Heuristic) | ~38.5% gap | **&le; 3.8% empirical bound** | Near-exact global optimum |
| **Significance** | — | — | **p &lt; 0.0001 (Wilcoxon)** | Statistically significant |

---

## 6. Audit & Hardening Milestones (Sections A–D Completed)

- **Section A: UI Overflow Elimination**:
  - Created reusable `LayoutPrimitives` (`Panel`, `ScrollArea`, `DataTable`, `TruncatedText`, `StatCard`).
  - Automated offline Playwright sweep across 5 viewports (1280x720, 1366x768, 1536x864, 1920x1080, 2560x1440) and 3 zoom factors (100%, 125%, 150%) across all 13 JAOC views.
  - Verified: **0 layout defects across 195 combinations** (`scripts/verify-layout-overflow.js`).
- **Section B: Tactical AI Copilot Rebuilt**:
  - Diagnosed 8 failure modes end-to-end (`docs/COPILOT_DIAGNOSIS.md`).
  - Rebuilt offline deterministic pipeline with fuzzy matching, slot filling, entity resolution against live COP state, Zod AST, dry-run previews, clarification dialogue, grounded explanations, and 15-level undo stack.
  - Gold Corpus Benchmark (`packages/shared/copilot-corpus.json`): **98.28% valid accuracy** (171/174), **100.00% safety rate** (16/16).
- **Section C: Algorithmic & Codebase Audit**:
  - `docs/CODEBASE_AUDIT.md`: C1 (ALNS destroy/repair operator invocations, simulated annealing, LP knapsack dual bound, 3 COA Pareto separation, retasking frozen zone and stability index formula, 10 constraints in independent verifier, Bayesian decay), C2 (architectural realism gaps), C3 (`docs/PERF_REPORT.md`: 25 ms anytime latency, scale tested to 500 airframes), C4 (code quality), C5 (security, RBAC, cryptographic audit chain).
  - Fixed every Critical and High finding with regression tests.
- **Section D: Deliverables & Test Certification**:
  - Automated test count: **233 tests passing (0 failures)** in `pnpm test`.
  - Benchmarks: 100-seed Monte Carlo statistical trial passing (`pnpm run benchmark`).
  - Offline E2E: Automated layout sweep passing (`pnpm run e2e`).

---

## 7. How to Resume Work & Development Instructions

- **Run all automated tests**: `pnpm test` (Runs 233 tests across 8 test suites).
- **Run automated layout overflow detector**: `pnpm run e2e` (Evaluates 195 screen configurations offline).
- **Run 100-seed benchmark**: `pnpm run benchmark` (Runs 100 Monte-Carlo seeds with confidence intervals).
- **Start local system**:
  - Single command start: `pnpm run dev` (API on `http://localhost:3001`, Web on `http://localhost:3002`).
  - Single command stop: `pnpm run stop` (Kills ports 3001 & 3002 cleanly).
- **Rules to observe**:
  - Never ship a UI panel without passing the overflow detector.
  - Never claim an algorithm result without a logged experiment.
  - Zero Python in runtime; keep all data synthetic and unclassified.
