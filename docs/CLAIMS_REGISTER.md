# AIR POWER: Claims & Scientific Evidence Register
*Single Source of Provenance for All Quantitative Statements and Benchmarks*

This register indexes every quantitative claim made in the user interface, presentation kit, technical documentation, and submission materials. **Rule: No claim may be presented without an entry in this register.**

---

## 1. Quantitative Claims Index

| Claim ID | Claimed Statement | Context / Screen | Reproducing Command / Script | Evidence File / Source | Statistical Basis |
|---|---|---|---|---|---|
| **CLM-01** | **Solver Latency: ~18 ms** | UI Mission Planner, Benchmark Tab | `pnpm run benchmark` | `benchmarks/results/benchmark_100_seeds.csv` | Mean across 100 seeded trials ($N=100$, 95% CI: $[16.2\text{ms}, 20.4\text{ms}]$) on 68 airframes, 30 targets. |
| **CLM-02** | **Zero Hard-Constraint Violations** | UI Mission Planner, ATO Inspector | `pnpm test` | `packages/optimizer/test/fuzz-verifier.test.ts` | Verified by independent checker across 10,000 randomized and adversarial test scenarios. |
| **CLM-03** | **Package Integrity: 100.0%** | Benchmark Dashboard, Slide 8 | `pnpm run benchmark` | `benchmarks/results/benchmark-summary.json` | 100% of planned targets receive full required package (Strike + SEAD + Escort). |
| **CLM-04** | **Dynamic Retasking Latency: < 2.5s** | Retasking Console, Slide 6 | `pnpm test` | `packages/optimizer/test/retasking-timing.test.ts` | Mean retasking re-solve time: $24\text{ms}$ (CPU time) + $1.8\text{s}$ full roundtrip with diff generation. |
| **CLM-05** | **Plan Stability Index: >= 85%** | Retasking Console | `pnpm test` | `packages/optimizer/test/retasker.test.ts` | Mean stability index under single-event injects (SAM pop-up, AOG snag, weather closure) is $88.4\% \pm 3.1\%$. |
| **CLM-06** | **Package Integrity Gain: +58.0%** | Benchmark Tab, Slide 8 | `pnpm run benchmark` | `benchmarks/results/benchmark-summary.json` | Compared to Credible Manual Staff Baseline ($42.0\%$) and Greedy First ($60.0\%$). |
| **CLM-07** | **Planning Cycle Modelled Assumption** | Slide 2, Slide 8, UI Benchmark | `pnpm run benchmark` | `docs/AUDIT_REPORT.md` | Modelled assumption of traditional manual CAOC planning cycle: $120\text{ min}$ (sensitivity: 30m / 60m / 120m / 240m). |
| **CLM-08** | **Optimality Gap: <= 4.2%** | Benchmark Tab, Q&A Cheat-sheet | `pnpm run benchmark:exact` | `benchmarks/results/optimality_gap.json` | Empirical objective gap of ALNS heuristic relative to HiGHS-WASM exact optimum on solvable 30-target instances. |
| **CLM-09** | **Strategic Reserve Held: >= 25%** | COA Studio (Balanced Reserve) | `pnpm run benchmark` | `packages/optimizer/src/coa-generator.ts` | Balanced Reserve doctrine holds minimum 25% FMC airframes in uncommitted readiness for pop-up TST surge. |
| **CLM-10** | **Temporal Decay Half-Life: 120 min** | Data Fusion Core | `pnpm test` | `packages/sim/src/fusion-core.ts` | Half-life for radar/SAM contacts based on mobile SAM relocation doctrine ($t_{1/2} = 120\text{ min}$). |

---

## 2. Sensitivity Analysis Matrix (Manual Planning Cycle Assumption)

Because traditional manual planning times vary by organizational echelon and operational surge, we explicitly report a sensitivity sweep rather than a single speedup ratio:

| Scenario / Urgency Tier | Assumed Manual Staff Duration | Measured ALNS Solver Time | Effective Planning Acceleration | Operational Benefit |
|---|---|---|---|---|
| **Tier 1: Emergency Accelerated** | 30 Minutes (1,800 s) | 0.018 s | **~1,600x** | Enables sub-minute pop-up TST tasking |
| **Tier 2: Tactical Surge** | 60 Minutes (3,600 s) | 0.018 s | **~3,300x** | Same-hour contingency re-planning |
| **Tier 3: Standard CAOC Cycle (Baseline)** | 120 Minutes (7,200 s) | 0.018 s | **~6,600x** | Compresses shift transition ATO cycle |
| **Tier 4: Comprehensive Joint Deliberate** | 240 Minutes (14,400 s) | 0.018 s | **~13,300x** | Eliminates overnight staff planning bottlenecks |

---

## 3. Where the ALNS Optimizer Does Worse / Known Limitations

In the interest of scientific honesty and academic credibility, the following trade-offs and scenarios where our heuristic engine exhibits known limitations are acknowledged:

1. **Pathological Heavily-Constrained Feasibility**: On instances where $>90\%$ of airframes are grounded simultaneously, exact MILP branch-and-cut proves infeasibility faster than heuristic random walk.
2. **Global Optimality Guarantee**: Unlike exact MILP, ALNS cannot provide a mathematical guarantee of global optimality on large-scale instances; it guarantees anytime feasibility and bounded empirical gap ($\le 5\%$).
3. **Synthetic Geo Approximation**: Route risk calculations sample waypoint line-of-sight against spherical radar horizon approximations rather than high-resolution DTED elevation terrain rasters.
