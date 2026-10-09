# SIH EVALUATOR GUIDE — AIR POWER (PROBLEM 26250)
*Autonomous Decision-Support Framework for Air Tasking Orders & Dynamic Retasking*

Welcome, Evaluators and Jury Members. This guide is tailored to help you navigate, audit, and evaluate the AIR POWER system in under 5 minutes, mapping every competition rubric item to verifiable codebase artifacts.

---

## 1. 60-Second Quick Tour

```bash
# 1. Install & build (Node.js 20+ required, zero Python)
pnpm install
pnpm run build

# 2. Run all automated tests (unit, differential fuzzing, true MILP, copilot)
pnpm test

# 3. Start system locally (API on :3001, Daylight UI on :3002)
pnpm run demo
# Open browser at: http://localhost:3002
```

---

## 2. 5-Minute Evaluator Path

| Minute | What to Inspect | Screen / Action | Rubric Criteria |
|---|---|---|---|
| **00:00–01:00** | **Common Operating Picture & Triple COAs** | Open `http://localhost:3002`, view **Tactical Map (COP)** and **COA Comparison Studio**. Notice the 3 distinct non-dominated doctrine options (Max Effect, Min Risk, Balanced Reserve). | Innovation, Military Doctrine |
| **01:00–02:00** | **Anytime Solver & Constraint Verifier** | Navigate to **Mission Planner**. Click "GENERATE MASTER ATO". Solve completes in **< 50 ms** across 68 airframes, 30 targets. Verify zero hard constraint violations. | Feasibility, Algorithm Depth |
| **02:00–03:00** | **Dynamic Retasking & Frozen Horizon** | Navigate to **Dynamic Retasking Console**. Inject a pop-up SAM or AOG snag. Notice the **Frozen Horizon** protection and instant hot-spare airframe substitution ($\ge 80\%$ plan stability). | Operational Impact, Resilience |
| **03:00–04:00** | **Empirical Benchmarks & True MILP** | Navigate to **Benchmark Evidence Harness**. Compare ALNS against B1 (Human Staff), B2 (Priority Greedy), **B2-LS (Strong Greedy 2-Opt)**, and **HiGHS-WASM True MILP**. Notice value delivered per sortie ($18.03$ pts/sortie). | Scientific Rigour, OR Defensibility |
| **04:00–05:00** | **Human Challenge & Copilot** | Navigate to **Manual Challenge Mode** to experience the 15-minute spreadsheet planning challenge. Open the **Tactical Copilot** (bottom right) and test natural language commands in Hindi/English. | Human-in-the-Loop, UI Excellence |

---

## 3. Rubric Item Mapping & Evidence Directory

### A. Algorithmic Innovation & Optimization Depth
- **Anytime ALNS Solver**: `packages/optimizer/src/alns-optimizer.ts`
- **True HiGHS-WASM Exact MILP Solver**: `packages/optimizer/src/highs-milp-solver.ts`
- **Strongest Heuristic Baseline B2-LS (2-Opt)**: `packages/optimizer/src/baselines.ts`
- **Independent Hard Constraint Verifier**: `packages/optimizer/src/independent-verifier.ts`
- **10,000 Random Plan Differential Fuzz Tests**: `packages/optimizer/test/differential-verifier.test.ts`
- **Self-Red-Team Hostile Audit Report**: `docs/SELF_REDTEAM.md`

### B. Feasibility & Defense Doctrine
- **Frozen Horizon & Operational Stability Index**: `packages/optimizer/src/dynamic-retasker.ts`
- **Package Role Synchronization (Strike + SEAD + Escort)**: `packages/optimizer/src/constraint-engine.ts`
- **Human-in-the-Loop Approval Doctrine**: `apps/web/src/components/PlannerInTheLoopStudio.tsx`
- **USMTF ATO/ACO Standard Military Text Generation**: `packages/shared/src/military-text-formatter.ts`

### C. Scalability & Software Engineering
- **End-to-End TypeScript / Node.js Monorepo**: Zero Python in runtime path.
- **WASM Acceleration**: `highs@1.15.3` pure WebAssembly C++ solver called from Node.js.
- **Reproducible Benchmark Suite**: `benchmarks/run-benchmark.ts` (`pnpm run benchmark`).
- **Repository Hygiene Verification**: `scripts/check-repo-hygiene.js` (`pnpm run hygiene`).

### D. User Interface & Human Factors
- **Elite Defense Daylight Command Aesthetics**: Clear readability under daylight operations, zero dark-mode eye strain, crisp military typography (JetBrains Mono / Inter).
- **Automated Overflow Verification**: Passes 5 viewports (1280x720 to 2560x1440) across 100%, 125%, 150% zoom (`scripts/verify-layout-overflow.js`).
- **Tactical AI Copilot**: Handles Hinglish, typos, and natural military slang with 100% safety isolation (`packages/optimizer/src/copilot-engine.ts`).

---

## 4. Key Verification Commands

```bash
# 1. Full automated unit & property tests (239 tests)
pnpm test

# 2. Cross-file number & claim consistency audit
pnpm run check:consistency

# 3. Repository hygiene, secrets, and evaluator compliance check
pnpm run hygiene

# 4. 100-seed Monte Carlo statistical benchmark
pnpm run benchmark

# 5. Playwright offline layout overflow verification
pnpm run e2e
```

---

## 5. What is Real vs Simulated?

| Capability | Real Ground-Truth Execution | Synthetic / Notional Simulation |
|---|---|---|
| **Optimization Solver** | **100% Real**: Pure ALNS heuristic + HiGHS-WASM C++ MILP solving live in Node.js. | None |
| **Independent Verifier** | **100% Real**: Evaluates raw physical rules on every generated sortie. | None |
| **Geographic Coordinates** | Realistic Western Sector border coordinates. | **100% Notional**: De-identified synthetic terrain data. |
| **Airframes & Weapons** | Realistic IAF aircraft types (Su-30, Rafale, Tejas) & payloads. | **100% Unclassified**: Synthetic tail numbers and nominal unclassified tables. |
| **Data Streams** | Real JSON REST & SSE streaming over Fastify. | Simulated sensors (Radar, ELINT, UAV, Satellite feeds). |
