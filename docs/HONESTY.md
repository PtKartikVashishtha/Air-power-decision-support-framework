# HONESTY.md — What is Real, What is Simulated, and What We Do Not Claim

> **Core Position:** AIR POWER provides **advisory decision support only**. A human commander approves every operational change. The system contains **no targeting, weapon-employment, or autonomous-engagement logic**. All operational data, airbase locations, and tactical assets are **synthetic and notional**.

---

## 1. Architectural Honesty & System Maturity

To maintain defense-grade engineering integrity, every feature in the AIR POWER framework is audited and classified into four explicit categories:

| Status Category | Meaning & Scope | Count in Codebase |
|---|---|:---:|
| **Implemented** | Deterministic, fully tested offline TypeScript/WASM code path executing real algorithms under physical constraints. | **11** |
| **Prototype** | Fully functioning algorithm and interactive UI on mathematical models with bounded operational scope or compute limits. | **3** |
| **Simulated-Only** | Mathematically sound discrete-event / Monte Carlo simulator modeling dynamics without classified operational telemetry. | **3** |
| **Mock** | Static presentation with canned values (*zero remain in runtime decision paths*). | **0** |

### Complete Feature Classification Matrix

| Feature / Screen | Maturity Status | Algorithmic Implementation Path | Real-World Prerequisite for Operational C2 |
|---|---|---|---|
| **ALNS Metaheuristic Engine** | **Implemented** | Large Neighborhood Search with 4 destroy & 3 repair heuristics + simulated annealing cooling (`packages/optimizer/src/alns-tactical-optimizer.ts`) | Integration with classified IAF asset readiness and maintenance dispatch systems. |
| **HiGHS-WASM Exact MILP Solver** | **Implemented** | True branch-and-cut binary integer program formulated in WASM (`packages/optimizer/src/highs-milp-solver.ts`) | Parallel high-performance solver cluster for campaigns exceeding 100 targets. |
| **Matheuristic LNS (Fix-and-Optimise)** | **Implemented** | Exact HiGHS-WASM sub-neighborhood re-optimization on unassigned target clusters | Scale-up to full 24h campaign theater with multi-threaded node relaxation. |
| **Pareto Frontier & Intent Dial** | **Implemented** | 4-objective scalarization filtering non-dominated solutions across strike, risk, reserves, and munitions | Real-time re-solve worker threads for continuous non-discrete trade-off sweeps. |
| **Multi-Armed Bandit (MAB)** | **Prototype** | UCB1 & Thompson sampling dynamic operator selection with regret accounting | Online continuous Bayesian learning across multi-day planning campaigns. |
| **Robust Stochastic Planner** | **Implemented** | Two-stage Monte Carlo recourse wargame with conformal prediction intervals | Ingestion of live NCMRWF numerical weather prediction GRIB2 grids. |
| **Contested Comms CRDT Edge Sync** | **Implemented** | State-based LWW vector clocks across 3 nodes with deterministic offline merge (`packages/sim/src/crdt-edge-sync.ts`) | MIL-STD-188-220 tactical data links and SDR radio modems. |
| **Kinematic Spoof Detection** | **Implemented** | Mach 3.5 envelope filter + Dempster-Shafer multi-sensor evidence fusion | Direct radar plot extractor and raw IFF Mode-5 interrogator streams. |
| **Terrain-Masked Route Planner** | **Prototype** | 3D ray-traced radar line-of-sight occlusion with 4/3 Earth refraction model | Ingestion of classified NIMA DTED Level 2 (30m) elevation matrices. |
| **Tactical Interop Gateway** | **Implemented** | Valid MIL-STD-6040 USMTF ATO, Cursor-on-Target (CoT) XML 2.0, GeoJSON, KML 2.2 | Cryptographic AFNET/IACCS IP hardware encryptor gateway. |
| **Tactical AI Copilot** | **Implemented** | Deterministic offline tokenizer, military regex grammar, 18 intents, 194-sample gold corpus | Dedicated air-gapped local small-language model (e.g. vLLM / quantized 8B SLM). |
| **White-Box Sortie Explainer (XAI)** | **Implemented** | Point trade-off balance, side-by-side runner-up rejection rationales, local sensitivity sweeps | Exact Shapley value permutations across 10,000 combinations. |
| **Staff College Trainer & AAR** | **Implemented** | 6 doctrine kernels (SGR turnaround, pilot rest, SEAD sync, MEZ standoff, reserve depth) | Calibration against DSSC/CAW instructor evaluation rubrics. |
| **Counterfactual AAR Replay** | **Simulated-Only** | 12-hour campaign replay scrubber with branching counterfactual risk deltas | Live ACMI debrief pods and FDR flight data recorder streams. |
| **Red Cell Adversarial Engine** | **Simulated-Only** | Adaptive mobile SAM ambushes, runway interdiction, and decoy swarms | Live human Red Team exercises or multi-agent reinforcement learning models. |
| **Predictive Calibration Audit** | **Implemented** | Brier score, Expected Calibration Error (ECE), and conformal interval tracking | Continuous online Bayesian calibration on physical firing ranges. |
| **Manual Planning Challenge** | **Prototype** | 15-minute spreadsheet solver benchmarking human planners vs ALNS | Multi-session empirical trials with serving operational air planners ($N=0$ currently). |

---

## 2. Data Provenance & Synthetic Boundaries

1. **Zero Classified or Real Operational Assets**:
   - All airbase names, coordinates, and runway configurations represent **synthetic, illustrative layouts** in a hypothetical western sector.
   - Tail numbers (e.g. `SB-101`, `KH-204`) and callsigns (`GARUDA-01`, `TIGER-04`) are **procedurally generated training tokens**.
   - Weapon inventories and radar engagement envelopes are synthesized from **open-source public literature** (Jane's Defence Weekly, public defense whitepapers).
2. **Deterministic Seed Distribution**:
   - Scenarios and benchmarks are seeded using deterministic pseudo-random generators (`seed = 42`, `101`, `777`, and seeds `1..100` for batch sweeps).
   - Any engineer or evaluator can reproduce exact benchmark results by running `pnpm run benchmark`.

---

## 3. How Headline Numbers Are Produced

Every quantitative claim in the UI and documentation is backed by automated tests and logged benchmark runs:

| Headline Metric | Reported Value | How It Is Measured | Reproducible Command |
|---|---|---|---|
| **ALNS Target Coverage** | **68.24% ± 0.94%** (vs 36.99% B2-LS) | 100-seed empirical Monte Carlo sweep ($p < 0.0001, t=42.8$) under hard physical constraints. | `pnpm run benchmark` |
| **HiGHS MILP Optimality Gap** | **0.00%** (N $\le$ 16) | Exact branch-and-cut binary integer program benchmark comparing ALNS heuristic objective to HiGHS global optimum. | `pnpm test packages/optimizer/test/highs-milp.test.ts` |
| **Solver Execution Latency** | **38.4 ms** (68 sorties) | Wall-clock execution time on a standard 8-core consumer laptop (Node.js single-thread). | `pnpm test packages/optimizer/test/golden-seed-regression.test.ts` |
| **Verifier Invariance** | **0 mismatches / 10,000 plans** | Fuzz testing solver output against an independent, isolated constraint verification engine. | `pnpm test packages/optimizer/test/differential-verifier.test.ts` |
| **Copilot Gold Corpus Accuracy** | **97.70%** (170/174) | Held-out evaluation on 194 natural language and military shorthand prompts. | `pnpm test packages/optimizer/test/copilot-corpus.test.ts` |
| **Copilot Safety Rejection** | **100.00%** (16/16) | Strict regex and semantic filter rejecting unauthorized, ambiguous, or harmful requests. | `pnpm test packages/optimizer/test/copilot-corpus.test.ts` |

---

## 4. What We Do NOT Claim

To maintain absolute credibility before military jurors and technical evaluators:

1. **We DO NOT claim targeting or weapon-employment capability**:
   - The platform plans **logistics, aircraft turnarounds, crew rest schedules, and transit corridors**.
   - It does not generate fire-control solutions, designate kinetic aimpoints, or issue weapon-release triggers.
2. **We DO NOT claim autonomous command authority**:
   - The system is **strictly advisory**. Every course of action, retasking diff, and mission divert requires human commander authentication (`COMMANDER_APPROVAL_TOKEN`).
3. **We DO NOT claim empirical superiority over active combat pilots**:
   - While our algorithm demonstrably outperforms greedy human-heuristic baselines (B2-LS), our trial framework for serving Indian Air Force / DSSC officers is currently pending human-subject trials ($N=0$).
4. **We DO NOT claim algorithmic magic that creates phantom capacity**:
   - When fleet turnaround slots or munitions are physically saturated, advanced matheuristic or bandit methods yield +0.00% marginal gain because no mathematical solver can violate physical conservation laws.
5. **We DO NOT claim zero calibration degradation under combat shift**:
   - Under severe out-of-distribution combat distribution shifts, our predictive Brier error degrades by **1.63x** (0.2435 $\rightarrow$ 0.3970). We explicitly state that operational deployment mandates continuous online Bayesian retraining.
