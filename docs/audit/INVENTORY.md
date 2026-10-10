# INVENTORY.md — Complete Codebase Source Inventory v2
*Generated during Full Codebase Audit v2 (2026-10-10T18:18:06.118Z)*

## 1. Summary Statistics
- **Total Tracked Files**: 159
- **Total Lines of Code (LOC)**: 71,850

### Breakdown by Module
| Owner Module | Total Files | Total LOC | Purpose & Responsibility |
|---|---|---|---|
| **@air-power/web** | 38 | 49,112 | Subsystem code, tests, configs |
| **@air-power/shared** | 14 | 4,087 | Subsystem code, tests, configs |
| **Tooling / QA** | 15 | 3,332 | Subsystem code, tests, configs |
| **@air-power/api** | 4 | 1,143 | Subsystem code, tests, configs |
| **@air-power/optimizer** | 33 | 6,616 | Subsystem code, tests, configs |
| **@air-power/sim** | 20 | 3,796 | Subsystem code, tests, configs |
| **Documentation / Architecture** | 25 | 2,669 | Subsystem code, tests, configs |
| **Benchmarks & Rigour** | 9 | 1,072 | Subsystem code, tests, configs |
| **Deployment / Docker** | 1 | 23 | Subsystem code, tests, configs |

---

## 2. Complete File Inventory

| File Path | LOC | Owner Module | Purpose / Functionality |
|---|---|---|---|
| `apps/web/public/preview-data.json` | 18939 | @air-power/web | Configuration / Mock data / Manifest |
| `apps/web/src/data/seed42-preview.json` | 18939 | @air-power/web | Configuration / Mock data / Manifest |
| `packages/shared/copilot-corpus.json` | 1719 | @air-power/shared | Configuration / Mock data / Manifest |
| `scripts/generate-copilot-corpus.js` | 1500 | Tooling / QA | General implementation |
| `apps/api/src/server.ts` | 1023 | @air-power/api | Fastify backend endpoint / routes |
| `apps/web/src/components/ContestedOpsStudio.tsx` | 940 | @air-power/web | Automated test suite |
| `packages/optimizer/src/copilot-engine.ts` | 854 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/shared/src/tactical-interop.ts` | 776 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `apps/web/src/components/PlannerInTheLoopStudio.tsx` | 690 | @air-power/web | UI Component |
| `packages/optimizer/src/alns-optimizer.ts` | 688 | @air-power/optimizer | Optimization algorithm / heuristic |
| `apps/web/src/app/page.tsx` | 687 | @air-power/web | General implementation |
| `apps/web/src/components/DeconflictionKillchainPanel.tsx` | 629 | @air-power/web | UI Component |
| `packages/optimizer/src/baselines.ts` | 616 | @air-power/optimizer | Optimization algorithm / heuristic |
| `apps/web/src/components/StaffCollegeTrainerStudio.tsx` | 594 | @air-power/web | UI Component |
| `apps/web/src/components/ServicesDirectoryModal.tsx` | 587 | @air-power/web | UI Component |
| `apps/web/src/components/TacticalMap.tsx` | 564 | @air-power/web | UI Component |
| `packages/sim/src/synthetic-data.ts` | 500 | @air-power/sim | Simulation / Sensor / Wargame model |
| `apps/web/src/components/ManualPlanningChallenge.tsx` | 468 | @air-power/web | UI Component |
| `apps/web/src/components/RouteComparisonDrawer.tsx` | 467 | @air-power/web | UI Component |
| `apps/web/src/components/GuidedHomeExperience.tsx` | 455 | @air-power/web | UI Component |
| `apps/web/src/components/AtoExportView.tsx` | 424 | @air-power/web | UI Component |
| `packages/optimizer/src/route-planner.ts` | 400 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/shared/src/schemas.ts` | 396 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `apps/web/src/components/CopilotModal.tsx` | 392 | @air-power/web | UI Component |
| `apps/web/src/components/WargameDashboard.tsx` | 383 | @air-power/web | UI Component |
| `packages/sim/src/after-action-review.ts` | 374 | @air-power/sim | Simulation / Sensor / Wargame model |
| `apps/web/src/components/CoaComparison.tsx` | 370 | @air-power/web | UI Component |
| `apps/web/src/components/ExplainabilityStudio.tsx` | 357 | @air-power/web | UI Component |
| `apps/web/src/components/OfflineMapLibreCOP.tsx` | 347 | @air-power/web | UI Component |
| `docs/sbom.json` | 346 | Documentation / Architecture | Configuration / Mock data / Manifest |
| `packages/sim/test/phase3-depth-check.test.ts` | 339 | @air-power/sim | Automated test suite |
| `packages/sim/src/state-store.ts` | 311 | @air-power/sim | Simulation / Sensor / Wargame model |
| `packages/sim/src/staff-college-trainer.ts` | 309 | @air-power/sim | Simulation / Sensor / Wargame model |
| `benchmarks/run-benchmark.ts` | 295 | Benchmarks & Rigour | General implementation |
| `packages/optimizer/src/dynamic-retasker.ts` | 291 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/optimizer/src/independent-verifier.ts` | 290 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/shared/src/reason-codes.ts` | 288 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `apps/web/src/components/ResourceBoard.tsx` | 286 | @air-power/web | UI Component |
| `packages/optimizer/src/highs-milp-solver.ts` | 275 | @air-power/optimizer | Optimization algorithm / heuristic |
| `apps/web/src/app/globals.css` | 271 | @air-power/web | General implementation |
| `docs/ARCHITECTURE_DOCUMENT.tex` | 270 | Documentation / Architecture | General implementation |
| `apps/web/src/lib/preview-interceptor.ts` | 266 | @air-power/web | General implementation |
| `apps/web/src/components/primitives/LayoutPrimitives.tsx` | 255 | @air-power/web | UI Component |
| `packages/sim/src/red-cell-wargame.ts` | 252 | @air-power/sim | Simulation / Sensor / Wargame model |
| `apps/web/src/components/BenchmarkDashboard.tsx` | 244 | @air-power/web | UI Component |
| `packages/optimizer/src/robust-stochastic-planner.ts` | 240 | @air-power/optimizer | Optimization algorithm / heuristic |
| `scripts/verify-layout-overflow.js` | 240 | Tooling / QA | General implementation |
| `packages/shared/src/constants.ts` | 232 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `packages/optimizer/src/terrain-elevation.ts` | 231 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/optimizer/src/bandit-operator-selector.ts` | 228 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/sim/src/spoof-detection.ts` | 224 | @air-power/sim | Simulation / Sensor / Wargame model |
| `packages/optimizer/src/assignment-explainer.ts` | 219 | @air-power/optimizer | Optimization algorithm / heuristic |
| `scripts/verify-ablation-and-sensitivity.ts` | 214 | Tooling / QA | General implementation |
| `apps/web/src/components/RetaskingConsole.tsx` | 210 | @air-power/web | UI Component |
| `packages/optimizer/src/pareto-engine.ts` | 209 | @air-power/optimizer | Optimization algorithm / heuristic |
| `scripts/generate-preview-data.ts` | 201 | Tooling / QA | General implementation |
| `benchmarks/run-scale-benchmark.ts` | 201 | Benchmarks & Rigour | General implementation |
| `packages/sim/src/wargame-simulator.ts` | 200 | @air-power/sim | Simulation / Sensor / Wargame model |
| `docs/SIH_PRESENTATION_KIT.md` | 196 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/SELF_REDTEAM.md` | 195 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/optimizer/src/deconfliction-and-killchain.ts` | 188 | @air-power/optimizer | Optimization algorithm / heuristic |
| `apps/web/src/components/MissionPlanner.tsx` | 184 | @air-power/web | UI Component |
| `packages/optimizer/src/matheuristic-lns.ts` | 182 | @air-power/optimizer | Optimization algorithm / heuristic |
| `apps/web/src/components/PredictiveCalibrationView.tsx` | 179 | @air-power/web | UI Component |
| `packages/sim/src/crdt-edge-sync.ts` | 176 | @air-power/sim | Simulation / Sensor / Wargame model |
| `apps/web/src/components/WhatIfSandbox.tsx` | 173 | @air-power/web | UI Component |
| `apps/web/src/components/AuditTrailView.tsx` | 169 | @air-power/web | UI Component |
| `scripts/detect-overflow.js` | 169 | Tooling / QA | General implementation |
| `packages/sim/test/tactical-interop.test.ts` | 168 | @air-power/sim | Automated test suite |
| `docs/CODEBASE_AUDIT.md` | 168 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/optimizer/src/constraint-engine.ts` | 167 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/sim/test/contested-ops.test.ts` | 167 | @air-power/sim | Automated test suite |
| `packages/sim/test/staff-college-trainer.test.ts` | 165 | @air-power/sim | Automated test suite |
| `packages/shared/copilot-heldout-corpus.json` | 163 | @air-power/shared | Configuration / Mock data / Manifest |
| `packages/optimizer/test/matheuristic-and-bandit.test.ts` | 161 | @air-power/optimizer | Automated test suite |
| `packages/optimizer/test/route-planner.test.ts` | 159 | @air-power/optimizer | Automated test suite |
| `scripts/demo-rehearsal.js` | 158 | Tooling / QA | General implementation |
| `scripts/check-repo-hygiene.js` | 150 | Tooling / QA | General implementation |
| `packages/sim/src/fusion-core.ts` | 149 | @air-power/sim | Simulation / Sensor / Wargame model |
| `apps/web/src/components/PageHeaderBreadcrumb.tsx` | 147 | @air-power/web | UI Component |
| `packages/sim/src/file-adapter.ts` | 147 | @air-power/sim | Simulation / Sensor / Wargame model |
| `scripts/generate-sbom-and-license-audit.js` | 143 | Tooling / QA | General implementation |
| `benchmarks/solver-microbenchmark.ts` | 142 | Benchmarks & Rigour | General implementation |
| `scripts/audit-inventory.js` | 139 | Tooling / QA | General implementation |
| `apps/web/tailwind.config.ts` | 136 | @air-power/web | General implementation |
| `apps/web/src/components/AssumptionsDoctrineModal.tsx` | 135 | @air-power/web | UI Component |
| `packages/shared/src/serializers.ts` | 126 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `packages/optimizer/test/optimizer.test.ts` | 124 | @air-power/optimizer | Automated test suite |
| `docs/SOLVER_CHOICE.md` | 122 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/optimizer/test/copilot-corpus.test.ts` | 121 | @air-power/optimizer | Automated test suite |
| `packages/optimizer/test/metamorphic-solver.test.ts` | 121 | @air-power/optimizer | Automated test suite |
| `docs/CLAIMS_REGISTER.md` | 121 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/EVALUATOR_GUIDE.md` | 114 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/optimizer/test/fuzz-verifier.test.ts` | 110 | @air-power/optimizer | Automated test suite |
| `packages/optimizer/test/constraints-exhaustive.test.ts` | 109 | @air-power/optimizer | Automated test suite |
| `scripts/check-number-consistency.js` | 108 | Tooling / QA | General implementation |
| `packages/sim/src/adapters.ts` | 105 | @air-power/sim | Simulation / Sensor / Wargame model |
| `packages/shared/src/geo.ts` | 104 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `packages/optimizer/test/multi-wave-sgr.test.ts` | 101 | @air-power/optimizer | Automated test suite |
| `scripts/test-services-and-breadcrumbs.js` | 101 | Tooling / QA | Automated test suite |
| `benchmarks/results/benchmark_100_seeds.csv` | 101 | Benchmarks & Rigour | General implementation |
| `docs/DEMO_VIDEO_SCRIPT.md` | 101 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/GIT_HISTORY_AUDIT.md` | 99 | Documentation / Architecture | Documentation / Architecture specs |
| `benchmarks/human/human-baseline-loader.ts` | 97 | Benchmarks & Rigour | General implementation |
| `packages/optimizer/test/differential-verifier.test.ts` | 90 | @air-power/optimizer | Automated test suite |
| `packages/shared/src/copilot-types.ts` | 88 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `packages/shared/test/reason-codes.test.ts` | 88 | @air-power/shared | Automated test suite |
| `benchmarks/results/scale_benchmark_report.json` | 87 | Benchmarks & Rigour | Configuration / Mock data / Manifest |
| `packages/sim/test/fusion-core.test.ts` | 84 | @air-power/sim | Automated test suite |
| `docs/HONESTY.md` | 84 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/AUDIT_REPORT.md` | 83 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/REASON_CODES.md` | 82 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/api/test/api-contract.test.ts` | 80 | @air-power/api | Automated test suite |
| `packages/sim/src/world-clock.ts` | 80 | @air-power/sim | Simulation / Sensor / Wargame model |
| `docs/BENCHMARK_ABLATION.md` | 79 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/HUMAN_BASELINE_PROTOCOL.md` | 79 | Documentation / Architecture | Documentation / Architecture specs |
| `scripts/verify-submission-branch.js` | 78 | Tooling / QA | General implementation |
| `docs/COPILOT_DIAGNOSIS.md` | 73 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/optimizer/test/assignment-explainer.test.ts` | 72 | @air-power/optimizer | Automated test suite |
| `benchmarks/results/solver-microbenchmark-results.json` | 72 | Benchmarks & Rigour | Configuration / Mock data / Manifest |
| `docs/PERF_REPORT.md` | 72 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/web/src/components/ReasonCodeChip.tsx` | 71 | @air-power/web | UI Component |
| `packages/optimizer/test/highs-milp.test.ts` | 71 | @air-power/optimizer | Automated test suite |
| `packages/optimizer/test/golden-seed-regression.test.ts` | 70 | @air-power/optimizer | Automated test suite |
| `docs/MATHEMATICAL_MODEL.md` | 69 | Documentation / Architecture | Documentation / Architecture specs |
| `packages/shared/src/i18n.ts` | 66 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `packages/optimizer/test/copilot-heldout.test.ts` | 65 | @air-power/optimizer | Automated test suite |
| `docs/IMPLEMENTATION_STATUS.md` | 65 | Documentation / Architecture | Documentation / Architecture specs |
| `benchmarks/results/benchmark-summary.json` | 63 | Benchmarks & Rigour | Configuration / Mock data / Manifest |
| `packages/optimizer/test/stability-metrics.test.ts` | 62 | @air-power/optimizer | Automated test suite |
| `docs/RESPONSIBLE_USE.md` | 59 | Documentation / Architecture | Documentation / Architecture specs |
| `scripts/test-ui-diag.js` | 53 | Tooling / QA | Automated test suite |
| `packages/optimizer/src/coa-generator.ts` | 50 | @air-power/optimizer | Optimization algorithm / heuristic |
| `scripts/test-all-tabs.js` | 50 | Tooling / QA | Automated test suite |
| `docs/DEPENDENCY_LICENSES.md` | 50 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/web/src/app/layout.tsx` | 49 | @air-power/web | General implementation |
| `docs/SECURITY_NOTE_STRIDE.md` | 45 | Documentation / Architecture | Documentation / Architecture specs |
| `docs/RELEASE_NOTES_v1.0.0.md` | 40 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/web/package.json` | 33 | @air-power/web | Configuration / Mock data / Manifest |
| `apps/web/next.config.ts` | 30 | @air-power/web | General implementation |
| `docs/DECISIONS.md` | 30 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/web/tsconfig.json` | 28 | @air-power/web | Configuration / Mock data / Manifest |
| `scripts/inspect-initial-load.js` | 28 | Tooling / QA | General implementation |
| `docs/PROMPT_HISTORY.md` | 27 | Documentation / Architecture | Documentation / Architecture specs |
| `apps/api/package.json` | 25 | @air-power/api | Configuration / Mock data / Manifest |
| `deploy/Dockerfile` | 23 | Deployment / Docker | General implementation |
| `packages/optimizer/package.json` | 20 | @air-power/optimizer | Configuration / Mock data / Manifest |
| `packages/sim/package.json` | 18 | @air-power/sim | Configuration / Mock data / Manifest |
| `packages/optimizer/src/index.ts` | 17 | @air-power/optimizer | Optimization algorithm / heuristic |
| `packages/shared/package.json` | 17 | @air-power/shared | Configuration / Mock data / Manifest |
| `apps/api/tsconfig.json` | 15 | @air-power/api | Configuration / Mock data / Manifest |
| `packages/optimizer/tsconfig.json` | 15 | @air-power/optimizer | Configuration / Mock data / Manifest |
| `packages/shared/tsconfig.json` | 15 | @air-power/shared | Configuration / Mock data / Manifest |
| `packages/sim/tsconfig.json` | 15 | @air-power/sim | Configuration / Mock data / Manifest |
| `benchmarks/human/results.json` | 14 | Benchmarks & Rigour | Configuration / Mock data / Manifest |
| `packages/sim/src/index.ts` | 13 | @air-power/sim | Simulation / Sensor / Wargame model |
| `packages/shared/src/index.ts` | 9 | @air-power/shared | Shared types, schemas, utilities, i18n |
| `apps/web/next-env.d.ts` | 7 | @air-power/web | General implementation |
| `apps/web/postcss.config.mjs` | 7 | @air-power/web | General implementation |
