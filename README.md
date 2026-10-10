# AIR POWER // Autonomous Air Tasking & Dynamic Resource Optimization
### Problem Statement 26250 — Smart India Hackathon 2026
**Nominator**: Ministry of Defence / Defence Services Staff College (DSSC)  
**Theme**: Transportation & Logistics (Software)  
**One-Line Pitch**: *An offline-first, mathematically proven Common Decision-Support System that synthesizes joint Air Tasking Orders in 47 ms, retasks dynamically in under 2.5s with $\ge 80\%$ plan stability, and provides verifiable human-in-the-loop explainability.*

---

[![Stack: TypeScript](https://img.shields.io/badge/Stack-TypeScript%205.7-blue.svg)](https://www.typescriptlang.org/)
[![Runtime: Node.js 22](https://img.shields.io/badge/Runtime-Node.js%2022%20LTS-green.svg)](https://nodejs.org/)
[![Frontend: Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black.svg)](https://nextjs.org/)
[![Optimization: ALNS + HiGHS--WASM](https://img.shields.io/badge/Solver-ALNS%20%2B%20HiGHS--WASM-orange.svg)](https://highs.dev/)
[![Tests: 282 Passing](https://img.shields.io/badge/Tests-282%20Passing-brightgreen.svg)](https://vitest.dev/)
[![Classification: UNCLASSIFIED](https://img.shields.io/badge/Classification-NOTIONAL%20%2F%20UNCLASSIFIED-darkgreen.svg)](NOTICE)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> **CRITICAL CLASSIFICATION BANNER**: **NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED SIMULATION**  
> All airframes, units, coordinates, and weapon tables are synthetic approximations for academic evaluation. Zero access to classified defense systems. See [NOTICE](NOTICE) for full statement.

---

## ⚡ Quick Links for Evaluators & Jury
- 🧭 **[Evaluator Guide (60s Tour & 5-Min Walkthrough)](docs/EVALUATOR_GUIDE.md)**
- 📋 **[Implementation Status Matrix (Real vs Simulated)](docs/IMPLEMENTATION_STATUS.md)**
- 📊 **[Claims & Scientific Evidence Register](docs/CLAIMS_REGISTER.md)**
- 🛡️ **[Self-Red-Team Hostile OR Audit Report](docs/SELF_REDTEAM.md)**
- 🧑‍✈️ **[Human Operator Baseline Protocol](docs/HUMAN_BASELINE_PROTOCOL.md)**
- 🏛️ **[Architecture Decision Records (ADRs)](docs/DECISIONS.md)**
- 🖥️ **[12-Slide Defense Command Deck (HTML)](docs/AIR_POWER_12_SLIDE_DECK.html)**

---

## 🚀 3-Command Quickstart

Requires **Node.js v20+ LTS** and **pnpm** (Windows, Linux, or macOS):

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Run automated test suite (unit, differential fuzzing, true MILP, copilot)
pnpm test

# 3. Launch live platform locally (API on :3001, Daylight Command UI on :3002)
pnpm run demo
# Open browser at: http://localhost:3002
```

To stop running processes cleanly in one command:
```bash
pnpm run stop
```

---

## 🔍 Feature Maturity & Verification Status

Full engineering audit available in **[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)**.

| Operational Module | Status | Execution Reality | Limitations & Deployment Delta |
|---|---|---|---|
| **ALNS + HiGHS-WASM Solver** | **Implemented** | 100% Real Node.js C++ branch-and-cut & metaheuristic solver. | 0.00% MILP gap on 8 targets; scaled LNS subproblem on larger instances. |
| **Independent Rule Verifier** | **Implemented** | 100% Decoupled differential auditor checking 12 hard constraints. | Zero violations proven across 10,000 fuzzed candidate sorties. |
| **CRDT Edge Node Sync** | **Implemented** | 100% Real LWW-Element-Set vector clocks & offline airbase merge. | In-memory network partition simulator; requires tactical radio SDR modems for field. |
| **3D Terrain Routing** | **Prototype** | Dijkstra / A* over synthetic elevation matrix with radar LOS math. | Synthetic 200x200 elevation matrix; requires real DTED-2 GeoTIFF rasters for field. |
| **Tactical Interop (USMTF/CoT)** | **Implemented** | Schema-compliant MIL-STD-6040 USMTF, CoT XML 2.0, GeoJSON, KML. | Synthetic unclassified messages; requires AFNET IP crypto gateway for field. |
| **Red Cell Adversarial Sim** | **Simulated-Only** | Monte Carlo Lanchester combat model benchmarking 3 controllers. | Scripted minimax decision trees; requires WARDEC mainframe link for field. |
| **Staff College Trainer & AAR** | **Implemented** | Real rule-based doctrine grading & counterfactual branch math. | 5 standard battle vignettes; requires live FDR/ACMI debrief pod telemetry for field. |
| **Tactical AI Copilot** | **Implemented** | Offline deterministic tokenizer + regex grammar (97.7% gold corpus). | Rule-based NLP; requires air-gapped local LLM (e.g. vLLM Llama-3) for unconstrained text. |

---

## 1. Executive Summary & Defensible Claims

Planning and dynamically retasking joint air operations in a contested environment (A2/AD bubbles, electronic warfare, fleeting targets) is plagued by siloed legacy systems. Data on **aircraft availability, crew duty rosters, weapon magazines, airspace corridors, live weather, electronic threats, and target priorities** sits in disconnected systems, forcing planning teams into **2-4 hour manual planning cycles**. Mid-operation contingencies (SAM pop-ups, runway closures, AOG snags) lead to mission aborts or severe airframe attrition.

**AIR POWER** is an end-to-end, offline-capable Common Decision-Support Framework that:
1. **Fuses 7 operational data families** onto an interactive 60 FPS Common Operating Picture (COP) with Bayesian confidence scoring and temporal decay.
2. **Synthesizes Master Air Tasking Orders (ATO) in 47 milliseconds** using an Anytime Adaptive Large Neighborhood Search (ALNS) metaheuristic satisfying 12 hard operational constraints with **zero violations verified by an independent auditor**.
3. **Executes Dynamic Retasking in under 2.5 seconds** under tactical injects using **Frozen-Zone logic** ($\Delta t = 15\text{m}$) and stability penalties ($\ge 80\%$ operational preservation ratio), generating an explainable Plan Diff and automated Commander's Brief.
4. **Empowers Commanders with Triple Courses of Action (COAs)**: Side-by-side trade-offs between *Max-Effect*, *Min-Risk*, and *Balanced-Reserve*.
5. **Provides Rigorous Scientific Proof**:
   - **Target Value Coverage**: **68.24%** vs 36.99% for Strongest Baseline B2-LS ($p < 0.0001$).
   - **Value Delivered Per Sortie**: **18.03 pts/sortie** (ALNS) vs 17.76 pts (B2-LS).
   - **HiGHS-WASM True MILP Optimality Gap**: **0.00% empirical gap** on solvable instances ($Z^* = 617.1$).
   - **Differential Fuzzing**: 10,000 randomized plans fuzzed with **0 disagreements** between solver and independent verifier.

---

## 2. Architecture Overview

```
+--------------------------------------------------------------------------------------------------+
|                                  AIR POWER WEB SHELL (Next.js 15)                                |
|  [COP Radar Grid] [Resource Board] [Mission Planner] [Planner-in-Loop] [COA Studio] [Retasking]  |
|  [4D Deconfliction & Tankers] [Wargame Simulator] [ATO/ACO Export] [Benchmark Evidence]          |
|  [Manual Challenge Mode] [Predictive Analytics] [What-If Sandbox] [Audit Trail] [Tactical Copilot] |
+--------------------------------------------------------------------------------------------------+
                                               ▲
                                    HTTP / SSE │ (3001)
                                               ▼
+--------------------------------------------------------------------------------------------------+
|                                    AIR POWER API (Fastify)                                       |
|  [Plan Synthesis] [COA Generation] [Dynamic Retasking Engine] [Clock Control] [Human Baseline]   |
+--------------------------------------------------------------------------------------------------+
               ▲                                       ▲                              ▲
               │                                       │                              │
+------------------------------+     +-------------------------------+     +-----------------------+
|    @air-power/optimizer      |     |        @air-power/sim         |     |   @air-power/shared   |
| - ALNS Engine (Anytime <50ms)|     | - Synthetic Generator (Seed 42|     | - Zod Schemas         |
| - HiGHS-WASM True MILP C++   |     | - Discrete-Event World Clock  |     | - USMTF ATO/ACO Text  |
| - Baseline B2-LS (2-Opt)     |     | - Threat Movement & Decay     |     | - Audit Trail Types   |
| - Independent Verifier (Spec)|     | - Wargame Monte Carlo Sim     |     | - Held-Out Corpus     |
| - Tactical Copilot Engine    |     | - Distribution Shift Auditor  |     | - Mathematical Specs  |
+------------------------------+     +-------------------------------+     +-----------------------+
```

---

## 3. Verification & Compliance Commands

```bash
# Run all unit, property, and differential tests
pnpm test

# Verify cross-file number and claim consistency
pnpm run check:consistency

# Verify repository hygiene and absence of internal secrets/blobs
pnpm run hygiene

# Run 100-seed Monte Carlo statistical benchmark
pnpm run benchmark

# Run Playwright offline layout overflow audit
pnpm run e2e
```

---

## 4. Contributing & License

Contributions are welcome via conventional commit pull requests. See [LICENSE](LICENSE) (Apache 2.0) and [NOTICE](NOTICE) for terms.
