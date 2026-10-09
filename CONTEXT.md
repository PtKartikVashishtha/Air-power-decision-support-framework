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
| **Value Coverage** | 14.51% (CI: [13.88, 15.14]) | 36.99% (CI: [36.19, 37.78]) | **68.24% (CI: [67.29, 69.2])** | **+53.73% higher value** |
| **Package Integrity** | 3.9% (Missing escorts) | 100.0% (Greedy lock) | **100.0% (Full Strike+SEAD+CAP)** | Guaranteed complete packages |
| **Hard Violations** | 0.05 / plan | 0 violations | **0 violations (Audited)** | Zero duty or range overruns |
| **Solve Duration** | Modelled: 120 mins cycle | ~2.8 ms | **22.61 ms (CI: [21.61, 23.62])** | Instant anytime response |
| **HiGHS-WASM Gap** | N/A (Heuristic) | ~38.5% gap | **&le; 3.8% empirical bound** | Near-exact global optimum |
| **Significance** | — | — | **p &lt; 0.001 (W = 5050)** | Statistically significant |

---

## 6. Planning Cycle Sensitivity Sweep

| Assumed Planning Horizon | Scenario Description | Speedup Ratio | Operational Notes |
| :--- | :--- | :--- | :--- |
| **30 Minutes** | Accelerated Emergency Staff Exercise | **79,600x** | Extreme human omissions under severe time pressure |
| **60 Minutes** | Rapid Air Tasking Working Group | **159,200x** | Moderate package coordination errors |
| **120 Minutes** | Standard ATO Planning Cycle (Doctrine Baseline) | **318,400x** | Nominal staff baseline from Air Staff Planning Manual |
| **240 Minutes** | Deliberate Joint Force Air Campaign Planning | **636,800x** | High cognitive fatigue, unmanaged fleet attrition |

---

## 7. How to Resume Work & Development Instructions

- **Run all automated tests**: `pnpm test` (Runs 39 suites across optimizer, sim, and api).
- **Run 100-seed benchmark**: `pnpm --filter @air-power/optimizer build && npx tsx benchmarks/run-benchmark.ts`.
- **Run scale benchmark**: `npx tsx benchmarks/run-scale-benchmark.ts`.
- **Start local system**:
  - API daemon: `pnpm --filter @air-power/api dev` (Runs on `http://localhost:3001`).
  - Web dashboard: `pnpm --filter @air-power/web start` (Runs on `http://localhost:3002`).
- **Demo Walkthrough**: Open `http://localhost:3002` and click **"5-MIN JURY DEMO"** in the top header.
