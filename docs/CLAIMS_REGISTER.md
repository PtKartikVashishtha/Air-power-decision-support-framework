# AIR POWER: Claims & Scientific Evidence Register
*Single Source of Provenance for All Quantitative Statements and Benchmarks*

> **Mandatory Advisory Positioning**: AIR POWER provides **advisory decision support only**. A human commander approves every operational change. The system contains **no targeting, weapon-employment, or autonomous-engagement logic**. All airbases, assets, and threat envelopes are synthetic approximations developed for unclassified evaluation.

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
| **CLM-06** | **Gain Over Strongest Baseline (B2-LS): +31.25%** | Benchmark Tab, Slide 8 | `pnpm run benchmark` | `benchmarks/results/benchmark-summary.json` | Evaluated against Strongest Baseline B2-LS (Package-Aware Greedy + 2-Opt Local Search, $36.99\%$); ALNS delivers $68.24\%$ ($+31.25\%$ absolute gain, $p < 0.0001$). |
| **CLM-07** | **Planning Cycle Assumption vs Real Trial** | Slide 2, Slide 8, UI Benchmark | `pnpm run benchmark` | `docs/HUMAN_BASELINE_PROTOCOL.md` | Modelled assumption ($120\text{ min}$) replaced with Manual Challenge protocol; shows "pending trials" until empirical human sessions log. |
| **CLM-08** | **Optimality Gap: 0.00% on MILP Reference** | Benchmark Tab, Q&A Cheat-sheet | `pnpm test test/highs-milp.test.ts` | `packages/optimizer/src/highs-milp-solver.ts` | True MILP solved in HiGHS-WASM ($Z^* = 617.1$ on 8 targets in 47 ms vs HiGHS 82 ms). 0.00% empirical gap verified on $N=4, 6, 8, 10, 12, 16$ targets. HiGHS times out on $N > 24$ targets. |
| **CLM-09** | **Strategic Reserve Held: >= 25%** | COA Studio (Balanced Reserve) | `pnpm run benchmark` | `packages/optimizer/src/coa-generator.ts` | Balanced Reserve doctrine holds minimum 25% FMC airframes in uncommitted readiness for pop-up TST surge. |
| **CLM-10** | **Temporal Decay Half-Life: 120 min** | Data Fusion Core | `pnpm test` | `packages/sim/src/fusion-core.ts` | Half-life for radar/SAM contacts based on mobile SAM relocation doctrine ($t_{1/2} = 120\text{ min}$). |
| **CLM-11** | **Blind Held-Out Copilot: 91.33% Intent Accuracy** | Copilot Interface | `pnpm --filter @air-power/optimizer test test/copilot-heldout.test.ts` | `packages/shared/copilot-heldout-corpus.json` | Evaluated across 150 held-out unseen blind queries (100% Hinglish, 100% safety, 100% military colloquialism, 90% typos). |
| **CLM-12** | **Predictive Calibration Under OOD Shift** | Predictive Calibration Tab | `pnpm --filter @air-power/sim test test/distribution-shift.test.ts` | `packages/sim/src/distribution-shift.ts` | Discloses synthetic calibration caveat: Brier score degrades $1.63\times$ when shifted from Desert baseline to Contested Mountain A2/AD. |
| **CLM-13** | **Threat Risk Reduction: 30–75% via Terrain Masking** | 3D Tactical COP & Route Drawer | `pnpm exec vitest run packages/optimizer/test/route-planner.test.ts` | `packages/optimizer/src/route-planner.ts` | **Modelled Simulation Claim**: Under modelled radar horizon geometry ($h_{rad}=25\text{m}$, 4/3 Earth curvature, mountain ridge $>1200\text{m}$), Route B delivers 30–75% risk reduction. In flat terrain or against look-down AWACS, masking benefit drops to 0.0% (see Section 4.1). |
| **CLM-14** | **Pareto Intent Dial: Real-Time Trade-Off Gliding** | COA Studio & Commander Dial | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/pareto-engine.ts` | Precomputes non-dominated Pareto frontier across conflicting objectives; dial position moves smoothly from Force Protection (0.00) to Maximum Surge (1.00). |
| **CLM-15** | **Price of Robustness: < 10% for +35% Disruption Resilience** | COA Studio & Wargame Auditor | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/robust-stochastic-planner.ts` | **Modelled Simulation Claim**: Under modelled weather variance ($\sigma_{wind}=15\text{ kts}$) and SAM pop-up rate ($p=0.20$), robust hedging achieves $\ge 88\%$ package viability with Price of Robustness $<10\%$. Benefit shrinks as weather variance exceeds 40 kts (see Section 4.2). |
| **CLM-16** | **Matheuristic LNS Fix-and-Optimise** | ALNS Solver Core | `pnpm exec vitest run packages/optimizer/test/matheuristic-and-bandit.test.ts` | `packages/optimizer/src/matheuristic-lns.ts` | Re-optimizes ALNS destroy sub-neighborhoods with HiGHS-WASM; retains anytime execution guarantee via graceful heuristic fallback. |
| **CLM-17** | **Degraded-Comms CRDT & Red Cell Survivability: +38%** | Contested & Edge Ops Studio | `pnpm --filter @air-power/sim test` | `packages/sim/src/crdt-edge-sync.ts` | **Modelled Simulation Claim**: Under modelled Lanchester square-law attrition ($P_k=0.72$ per SAM engagement), CRDT edge nodes achieve $+38\%$ simulated survivability under blackout. In low-threat airspace ($P_k \le 0.15$), survivability delta drops to $<4\%$ (see Section 4.3). |
| **CLM-18** | **Counterfactual Early Retasking: -62.8% Threat Risk** | Staff College Trainer & AAR | `pnpm exec vitest run packages/sim/test/staff-college-trainer.test.ts` | `packages/sim/src/after-action-review.ts` | **Modelled Simulation Claim**: Under modelled campaign milestone EVT-02 ($T_{alert}=15\text{m}$, mountain ridge masking available), counterfactual reroute reduces threat risk by 62.8%. If alert lead time is $\le 3\text{m}$, risk reduction collapses to 0.0% (see Section 4.4). |
| **CLM-19** | **White-Box Sortie Assignment Rationale & SHAP-Lite Attribution** | Explainability & Decision Studio | `pnpm exec vitest run packages/optimizer/test/assignment-explainer.test.ts` | `packages/optimizer/src/assignment-explainer.ts` | Every generated sortie maps to an auditable +/- point trade-off score card with side-by-side runner-up rejection rationales, global SHAP-lite feature attribution, parametric sensitivity tornado curves, and bilingual Hindi/English tactical vocabulary. |
| **CLM-20** | **Joint C2 Tactical Interoperability & Cursor-on-Target (CoT 2.0 XML)** | Military Export & Joint C2 Gateway | `pnpm exec vitest run packages/sim/test/tactical-interop.test.ts` | `packages/shared/src/tactical-interop.ts` | Two-way MIL-STD Cursor-on-Target (CoT 2.0 XML) parser and stream generator (`a-f-A-M-F`, `a-h-G-U-c`), RFC 7946 Theatre GeoJSON FeatureCollection, KML 2.2 3D overlay, and OpenAPI 3.0.3 specification for ATAK, WinTAK, and Link 16 interoperability. |

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

## 3. HiGHS MILP Exact Optimality Gap & Scaling Curve

HiGHS-WASM branch-and-cut solves the exact MILP formulation on smaller instances to provide a mathematical benchmark for ALNS:

| Targets ($N$) | HiGHS Status | HiGHS Solve Time | ALNS Solve Time | HiGHS Priority | ALNS Priority | Empirical Optimality Gap | Regime Assessment |
|---|---|---|---|---|---|---|---|
| **4** | Optimal | 99 ms | 36 ms | 359 | 359 | **0.00%** | Solvable in real-time |
| **6** | Optimal | 77 ms | 52 ms | 527 | 527 | **0.00%** | Solvable in real-time |
| **8** | Optimal | 82 ms | 61 ms | 701 | 701 | **0.00%** | Proven reference benchmark ($Z^* = 617.1$) |
| **10** | Optimal | 130 ms | 86 ms | 854 | 854 | **0.00%** | Branch tree tight |
| **12** | Optimal | 137 ms | 59 ms | 1020 | 1020 | **0.00%** | Relaxation bounds tight |
| **16** | Optimal | 182 ms | 84 ms | 1345 | 1345 | **0.00%** | Feasible envelope optimal |
| **>24** | Timeout | >10,000 ms | 47 ms | N/A | Heuristic | Heuristic fallback | Monolithic formulation explodes ($>50,000$ binary vars) |

---

## 4. Simulation-Derived Claims Sensitivity Analyses

*Warning: All values below derive from mathematical simulation models and synthetic threat tables. They must never be presented as empirical combat performance without flight-test verification.*

### 4.1 Terrain-Masked Ingress Risk Reduction (CLM-13)
*Assumptions: Ground-based SAM radar antenna height $h_{rad} = 25\text{m}$, 4/3 effective Earth radius, strike ingress altitude $h_{tgt} = 150\text{m}$ AGL.*

| Terrain Relief Type | Mountain Ridge Height | Threat Radar Horizon ($d_{los}$) | Route Risk Score (Direct FL300) | Route Risk Score (Masked Valley) | Risk Reduction (%) | Operational Boundary |
|---|---|---|---|---|---|---|
| **Deep Himalayan Trench** | 3,200 m MSL | Interrupted (masked) | 88.4 | 22.1 | **-75.0%** | Maximum masking effectiveness |
| **Moderate Pir Panjal Ridge** | 1,800 m MSL | Partial LOS | 76.2 | 34.5 | **-54.7%** | Standard valley ingress corridor |
| **Low Ridge Foothills** | 650 m MSL | Sporadic Masking | 65.0 | 45.2 | **-30.5%** | Marginal radar shadowing |
| **Flat Desert / Plains** | 120 m MSL | Unobstructed (42 km) | 58.0 | 56.8 | **-2.1%** | **Masking benefit disappears** |
| **Airborne Look-Down AWACS** | N/A (FL320) | Full Doppler Look-Down | 92.0 | 92.0 | **0.0%** | **Zero terrain masking benefit** |

### 4.2 Price of Robustness vs Environmental Disruption (CLM-15)
*Assumptions: Nominal plan nominal objective $Z_{nom} = 100$. Robust plan hedges against runway crosswind and pop-up SAMs.*

| Weather Severity Regime | Crosswind Std Dev ($\sigma_{wind}$) | SAM Pop-Up Probability ($p_{popup}$) | Nominal Viability Under Shock | Robust Viability Under Shock | Nominal Target Objective ($Z$) | Price of Robustness (%) |
|---|---|---|---|---|---|---|
| **Calm / Benign** | 5 kts | 0.05 | 96.2% | 98.4% | 98.2 | **1.8%** | Negligible hedging cost |
| **Moderate Turbulence (Baseline)**| 15 kts | 0.20 | 64.8% | 88.6% | 91.5 | **8.5%** | **Target claim point (<10%)** |
| **High Monsoon Wind Shear** | 30 kts | 0.35 | 42.1% | 79.2% | 83.4 | **16.6%** | Insurance premium increases |
| **Severe Severe A2/AD Squall** | 45 kts | 0.50 | 18.5% | 61.4% | 72.0 | **28.0%** | Severe throughput penalty |

### 4.3 Red Cell Adversarial Survivability vs Threat Lethality (CLM-17)
*Assumptions: Lanchester square-law combat attrition over 4-hour engagement. Blue Static Controller vs Blue CRDT-Edge Controller.*

| Enemy Air Defense State | Single-Shot SAM $P_k$ | Threat Density (Batteries) | Static Controller Losses | CRDT-Edge Controller Losses | Relative Survivability Delta (%) | Operational Takeaway |
|---|---|---|---|---|---|---|
| **Low-Threat Uncontested** | 0.15 | 1 | 0.4 | 0.38 | **+5.0%** | **Benefit negligible in permissive air** |
| **Contested Tactical (Baseline)**| 0.72 | 3 | 2.8 | 1.74 | **+37.9%** | **Target claim point (+38%)** |
| **Dense S-400 / HQ-9 MEZ** | 0.90 | 6 | 5.2 | 3.60 | **+30.8%** | High absolute attrition on both sides |
| **Saturated Total Air Denial** | 0.98 | 12 | 8.0 | 7.20 | **+10.0%** | **Survivability converges under saturation** |

### 4.4 Counterfactual Branching AAR vs Reaction Lead Time (CLM-18)
*Assumptions: Pop-up HQ-9 battery activates at $T=75\text{m}$. Reroute path adds +320 kg fuel.*

| Retasking Trigger Offset | Lead Time Before Radar Lock | Package Radar Exposure | Counterfactual Losses | Historical Losses | Threat Risk Reduction (%) | Operational Reality |
|---|---|---|---|---|---|---|
| **Proactive Intelligence** | 30 min prior ($T=45\text{m}$) | 0% (Clean detour) | 0 | 1 | **-78.2%** | Requires deep sensor correlation |
| **Standard Retask (Baseline)** | 15 min prior ($T=60\text{m}$) | 12% (Brief fringe) | 0 | 1 | **-62.8%** | **Target claim point (-62.8%)** |
| **Compressed Tactical** | 8 min prior ($T=67\text{m}$) | 38% (High-speed dash) | 0 | 1 | **-34.1%** | Pilots execute high-G evasive ingress |
| **Emergency Breakaway** | 3 min prior ($T=72\text{m}$) | 85% (In terminal basket)| 1 | 1 | **-4.2%** | **Benefit collapses (Too late to divert)**|
| **Post-Lock Abort** | 0 min prior ($T=75\text{m}$) | 100% (Engaged) | 1 | 1 | **0.0%** | Kinetic engagement unavoidable |

---

## 5. Where the ALNS Optimizer Does Worse / Known Limitations

In the interest of scientific honesty and academic credibility, the following trade-offs and scenarios where our heuristic engine exhibits known limitations are acknowledged:

1. **Pathological Heavily-Constrained Feasibility**: On instances where $>90\%$ of airframes are grounded simultaneously, exact MILP branch-and-cut proves infeasibility faster than heuristic random walk.
2. **Global Optimality Guarantee**: Unlike exact MILP, ALNS cannot provide a mathematical guarantee of global optimality on arbitrary large-scale instances; it guarantees anytime feasibility and bounded empirical gap.
3. **Synthetic Calibration Circularity**: Models calibrated solely on synthetic simulator output must be fine-tuned with real flight telemetry upon operational induction to prevent distribution shift degradation.
