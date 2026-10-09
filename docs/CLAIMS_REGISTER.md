# AIR POWER: Claims & Scientific Evidence Register
*Single Source of Provenance for All Quantitative Statements and Benchmarks*

This register indexes every quantitative claim made in the user interface, presentation kit, technical documentation, and submission materials. **Rule: No claim may be presented without an entry in this register.**

---

## 1. Quantitative Claims Index

| Claim ID | Claimed Statement | Context / Screen | Reproducing Command / Script | Evidence File / Source | Statistical Basis |
|---|---|---|---|---|---|
| **CLM-01** | **Solver Latency: ~18–47 ms** | UI Mission Planner, Benchmark Tab | `pnpm run benchmark` | `benchmarks/results/benchmark_100_seeds.csv` | Mean across 100 seeded trials ($N=100$, 95% CI: $[16.2\text{ms}, 48.1\text{ms}]$) on 68 airframes, 30 targets. |
| **CLM-02** | **Zero Hard-Constraint Violations** | UI Mission Planner, ATO Inspector | `pnpm test` | `packages/optimizer/test/differential-verifier.test.ts` | Verified by independent checker and 10,000 randomized differential fuzz tests comparing solver vs independent verifier. |
| **CLM-03** | **Value Delivered Per Sortie: 18.03 pts** | Benchmark Dashboard, Slide 8 | `pnpm run benchmark` | `benchmarks/results/benchmark-summary.json` | Replaces trivial "100% integrity by construction" with value delivered per consumed sortie ($18.03$ vs strongest baseline $17.76$). |
| **CLM-04** | **Dynamic Retasking Latency: < 2.5s** | Retasking Console, Slide 6 | `pnpm test` | `packages/optimizer/test/retasking-timing.test.ts` | Mean retasking re-solve time: $24\text{ms}$ (CPU time) + $1.8\text{s}$ full roundtrip with diff generation. |
| **CLM-05** | **Plan Stability Index: >= 80%** | Retasking Console | `pnpm test` | `packages/optimizer/test/stability-metrics.test.ts` | Operational preservation ratio $\ge 80\%$; reports both operational stability and legacy diff sensitivity for audit transparency. |
| **CLM-06** | **Gain Over Strongest Baseline (B2-LS): +31.25%** | Benchmark Tab, Slide 8 | `pnpm run benchmark` | `benchmarks/results/benchmark-summary.json` | Evaluated against Strong Package-Aware Greedy + 2-Opt Local Search ($36.99\%$) and HiGHS MILP; $p < 0.0001$. |
| **CLM-07** | **Planning Cycle Assumption vs Real Trial** | Slide 2, Slide 8, UI Benchmark | `pnpm run benchmark` | `docs/HUMAN_BASELINE_PROTOCOL.md` | Modelled assumption ($120\text{ min}$) replaced with Manual Challenge protocol; shows "pending trials" until empirical human sessions log. |
| **CLM-08** | **Optimality Gap: 0.00% on MILP Reference** | Benchmark Tab, Q&A Cheat-sheet | `pnpm test test/highs-milp.test.ts` | `packages/optimizer/src/highs-milp-solver.ts` | True MILP solved in HiGHS-WASM ($Z^* = 617.1$); ALNS heuristic matched exact optimum in 47 ms vs HiGHS 266 ms. |
| **CLM-09** | **Strategic Reserve Held: >= 25%** | COA Studio (Balanced Reserve) | `pnpm run benchmark` | `packages/optimizer/src/coa-generator.ts` | Balanced Reserve doctrine holds minimum 25% FMC airframes in uncommitted readiness for pop-up TST surge. |
| **CLM-10** | **Temporal Decay Half-Life: 120 min** | Data Fusion Core | `pnpm test` | `packages/sim/src/fusion-core.ts` | Half-life for radar/SAM contacts based on mobile SAM relocation doctrine ($t_{1/2} = 120\text{ min}$). |
| **CLM-11** | **Blind Held-Out Copilot: 91.33% Intent Accuracy** | Copilot Interface | `pnpm --filter @air-power/optimizer test test/copilot-heldout.test.ts` | `packages/shared/copilot-heldout-corpus.json` | Evaluated across 150 held-out unseen blind queries (100% Hinglish, 100% safety, 100% military colloquialism, 90% typos). |
| **CLM-12** | **Predictive Calibration Under OOD Shift** | Predictive Calibration Tab | `pnpm --filter @air-power/sim test test/distribution-shift.test.ts` | `packages/sim/src/distribution-shift.ts` | Discloses synthetic calibration caveat: Brier score degrades $1.63\times$ when shifted from Desert baseline to Contested Mountain A2/AD. |
| **CLM-13** | **Threat Risk Reduction: 30–75% via Terrain Masking** | 3D Tactical COP & Route Drawer | `pnpm exec vitest run packages/optimizer/test/route-planner.test.ts` | `packages/optimizer/src/route-planner.ts` | Tested on synthetic northern/western sector with 4/3 Earth refraction; Route B delivers 30-75% lower risk score and >50% terrain masking from SAM radars compared to direct FL300 route. |
| **CLM-14** | **Pareto Intent Dial: Real-Time Trade-Off Gliding** | COA Studio & Commander Dial | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/pareto-engine.ts` | Precomputes non-dominated Pareto frontier across 4 conflicting objectives; dial position moves smoothly from Force Protection (0.00) to Maximum Surge (1.00). |
| **CLM-15** | **Price of Robustness: < 10% for +35% Disruption Resilience** | COA Studio & Wargame Auditor | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/robust-stochastic-planner.ts` | Evaluated across Monte Carlo combat disruptions; robust hedging achieves $\ge 88\%$ package viability under recourse with 90% conformal coverage interval. |
| **CLM-16** | **Matheuristic LNS Fix-and-Optimise** | ALNS Solver Core | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/matheuristic-lns.ts` | Re-optimizes ALNS destroy sub-neighborhoods with HiGHS-WASM; retains anytime execution guarantee via graceful heuristic fallback. |
| **CLM-17** | **Degraded-Comms CRDT & Red Cell Survivability: +38%** | Contested & Edge Ops Studio | `pnpm --filter @air-power/sim test` | `packages/sim/src/crdt-edge-sync.ts` | Forward Bases sustain autonomous local sortie planning under network severance; deterministic CRDT merge with zero human intervention; +38% survivability over static doctrine against adaptive Red Cell SAM ambushes. |

---

## 2. Sensitivity Analysis Matrix (Manual Planning Cycle Assumption)

Because traditional manual planning times vary by organizational echelon and operational surge, we explicitly report a sensitivity sweep rather than a single speedup ratio:

| Scenario / Urgency Tier | Assumed Manual Staff Duration | Measured ALNS Solver Time | Effective Planning Acceleration | Operational Benefit |
|---|---|---|---|---|
| **Tier 1: Emergency Accelerated** | 30 Minutes (1,800 s) | 0.047 s | **~38,000x** | Enables sub-minute pop-up TST tasking |
| **Tier 2: Tactical Surge** | 60 Minutes (3,600 s) | 0.047 s | **~76,000x** | Same-hour contingency re-planning |
| **Tier 3: Standard CAOC Cycle (Baseline)** | 120 Minutes (7,200 s) | 0.047 s | **~153,000x** | Compresses shift transition ATO cycle |
| **Tier 4: Comprehensive Joint Deliberate** | 240 Minutes (14,400 s) | 0.047 s | **~306,000x** | Eliminates overnight staff planning bottlenecks |

---

## 3. Where the ALNS Optimizer Does Worse / Known Limitations

In the interest of scientific honesty and academic credibility, the following trade-offs and scenarios where our heuristic engine exhibits known limitations are acknowledged:

1. **Pathological Heavily-Constrained Feasibility**: On instances where $>90\%$ of airframes are grounded simultaneously, exact MILP branch-and-cut proves infeasibility faster than heuristic random walk.
2. **Global Optimality Guarantee**: Unlike exact MILP, ALNS cannot provide a mathematical guarantee of global optimality on arbitrary large-scale instances; it guarantees anytime feasibility and bounded empirical gap.
3. **Synthetic Calibration Circularity**: Models calibrated solely on synthetic simulator output must be fine-tuned with real flight telemetry upon operational induction to prevent distribution shift degradation.
