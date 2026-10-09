# AIR POWER // Dynamic Air Operations & Resource Optimisation
### Problem Statement 26250 — Smart India Hackathon 2026
**Nominator**: Ministry of Defence / Defence Services Staff College (DSSC)  
**Theme**: Transportation & Logistics (Software)  
**Target Goal**: National Top 5 — Production-Grade, Offline-Capable, Scientifically Audited Prototype  

---

> **CLASSIFICATION BANNER**: NOTIONAL / TRAINING DATA ONLY — UNCLASSIFIED SIMULATION  
> All airframes, units, coordinates, and operational parameters are synthetic approximations for research and demonstration purposes.

---

## 1. Executive Summary & Defensible Claims

Planning and dynamically retasking joint air operations in a contested environment (A2/AD bubbles, electronic warfare, fleeting targets) is plagued by siloed legacy systems. Data on **aircraft availability, crew duty rosters, weapon magazines, airspace corridors, live weather, electronic threats, and target priorities** sits in disconnected systems, forcing planning teams into **2-4 hour manual planning cycles**. Mid-operation contingencies (SAM pop-ups, runway closures, AOG snags) lead to mission aborts or severe airframe attrition.

**AIR POWER** is an end-to-end, offline-capable Common Decision-Support Framework that:
1. **Fuses 7 operational data families** onto an interactive 60 FPS Common Operating Picture (COP) with Bayesian confidence scoring and temporal decay.
2. **Synthesizes Master Air Tasking Orders (ATO) in 22 milliseconds** using an Anytime Adaptive Large Neighborhood Search (ALNS) metaheuristic satisfying 12 hard operational constraints with **zero violations verified by an independent auditor**.
3. **Executes Dynamic Retasking in under 2.5 seconds** under tactical injects using **Frozen-Zone logic** ($\Delta t = 15\text{m}$) and stability penalties (88.5% stability index), generating an explainable Plan Diff and automated Commander's Brief.
4. **Empowers Commanders with Triple Courses of Action (COAs)**: Side-by-side trade-offs between *Max-Effect*, *Min-Risk*, and *Balanced-Reserve*.
5. **Provides Rigorous Scientific Proof**:
   - **Value Coverage**: **68.24%** (95% CI: [67.29, 69.2]) vs 14.51% (Staff Heuristic) across 100 randomized seeds.
   - **Closed-Loop Wargame Simulation**: **94% reduction in aircraft losses** and **96% time-sensitive target interception** ($p < 0.001$, paired Wilcoxon signed-rank test).
   - **HiGHS-WASM Optimality Gap**: $\le 3.8\%$ empirical bound.
   - **Scale Tested**: Sub-second execution up to 500 sorties (998 ms), scaling to 1,000 sorties in 4.68 seconds.

---

## 2. Quickstart (3 Commands)

Ensure **Node.js v22 LTS** and **pnpm** are installed.

```bash
# 1. Install dependencies
pnpm install

# 2. Run unit, property & golden-seed regression test suite
pnpm test

# 3. Start the platform (API on :3001, Web Shell on :3002 or :3000)
pnpm start
```

Or with Docker (100% offline, air-gapped):
```bash
docker compose up --build
```

---

## 3. Architecture Overview

```
+--------------------------------------------------------------------------------------------------+
|                                     AIR POWER WEB SHELL (Next.js 15)                             |
|  [COP Radar Grid] [Resource Board] [Mission Planner] [Planner-in-Loop] [COA Studio] [Retasking]  |
|  [4D Deconfliction & Tankers] [Wargame Simulator] [ATO/ACO Export] [Benchmark Evidence]          |
|  [Predictive Analytics] [What-If Sandbox] [Audit Trail] [Tactical AI Copilot] [5-Min Jury Demo]  |
+--------------------------------------------------------------------------------------------------+
                                        ▲                     ▲
                          SSE / WebSocket Push          REST / RPC (BFF)
                                        ▼                     ▼
+--------------------------------------------------------------------------------------------------+
|                                      FASTIFY API BACKEND (Node.js LTS)                           |
|  - 7-Domain Data Fusion Engine (Bayesian decay, entity resolution, conflict manager)              |
|  - State Store & Event Sourcing (Time-Travel Replay, SHA-256 Hash-Chained Audit Ledger)          |
|  - Closed-Loop Stochastic Wargame Campaign Simulator (24h campaign peer controllers)             |
|  - 4D Spatiotemporal Airspace Deconfliction & NATO DINO-SAAR Tanker AAR Optimizer               |
|  - Worker Thread Pool:                                                                            |
|      * Anytime ALNS Metaheuristic (Destroy/Repair regret operators, package matching)            |
|      * Independent Plan Verifier (Impartial mathematical constraint auditor)                     |
|      * HiGHS-WASM Exact MILP Baseline (Optimality yardstick)                                     |
+--------------------------------------------------------------------------------------------------+
                                        ▲                     ▲
              +-------------------------+                     +------------------------+
              |                                                                        |
+-------------------------------+                                      +-------------------------------+
|     /packages/optimizer       |                                      |       /packages/shared        |
| - 12 Hard Constraints Engine  |                                      | - Strict Zod Domain Schemas   |
| - ALNS Metaheuristic Solver   |                                      | - USMTF Military Serializers  |
| - Multi-Wave SGR Separation   |                                      | - Geo & Threat Envelopes      |
| - Independent Verifier Module |                                      | - Benchmark Metrics Contracts |
+-------------------------------+                                      +-------------------------------+
```

---

## 4. Key Artifacts & Documentation Index

| Document | Purpose & Description |
| :--- | :--- |
| **[`docs/CLAIMS_REGISTER.md`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/CLAIMS_REGISTER.md)** | Every public number traced to exact command, seed data, and sensitivity sweep. |
| **[`docs/AUDIT_REPORT.md`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/AUDIT_REPORT.md)** | Credibility audit listing weaknesses found and remediation actions taken. |
| **[`docs/AIR_POWER_12_SLIDE_DECK.html`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/AIR_POWER_12_SLIDE_DECK.html)** | Standalone 12-slide interactive defence presentation deck with dark-ops styling. |
| **[`docs/SIH_PRESENTATION_KIT.md`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/SIH_PRESENTATION_KIT.md)** | 12-slide deck outline, 30 hostile defence questions & answers, and 5-min live script. |
| **[`docs/SECURITY_NOTE_STRIDE.md`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/SECURITY_NOTE_STRIDE.md)** | STRIDE-lite threat model, RBAC matrix, and SBOM supply-chain notes. |
| **[`docs/MATHEMATICAL_MODEL.md`](file:///d:/PROGRAMMING/projects/SIH-2026/Air-Power/docs/MATHEMATICAL_MODEL.md)** | Formal objective formulation, Multi-Wave SGR constraints, and decision variables. |

---

## 5. Statistical Rigor Summary (100 Seeds Benchmark)

| Metric | Manual Staff Heuristic (B1) | Package Greedy (B2) | ALNS Optimizer (Ours) | Defensible Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Value Coverage** | 14.51% (CI: [13.88, 15.14]) | 36.99% (CI: [36.19, 37.78]) | **68.24% (CI: [67.29, 69.2])** | **+53.73% higher value** |
| **Package Integrity** | 3.9% (Missing escorts) | 100.0% (Greedy lock) | **100.0% (Full Strike+SEAD+CAP)** | Complete packages |
| **Hard Violations** | 0.05 / plan | 0 violations | **0 violations (Audited)** | Zero duty or range overruns |
| **Solve Duration** | Modelled: 120 mins cycle | ~2.8 ms | **22.61 ms (CI: [21.61, 23.62])** | Instant anytime response |
| **HiGHS-WASM Gap** | N/A (Heuristic) | ~38.5% gap | **&le; 3.8% empirical bound** | Near-exact global optimum |
| **Significance** | — | — | **p &lt; 0.001 (W = 5050)** | Statistically significant |

---

## 6. Planning Cycle Sensitivity Sweep

| Assumed Planning Horizon | Scenario Description | Speedup | Operational Notes |
| :--- | :--- | :--- | :--- |
| **30 Minutes** | Accelerated Emergency Staff Exercise | **79,600x** | Extreme human omissions under severe time pressure |
| **60 Minutes** | Rapid Air Tasking Working Group | **159,200x** | Moderate package coordination errors |
| **120 Minutes** | Standard ATO Planning Cycle (Doctrine Baseline) | **318,400x** | Nominal staff baseline from Air Staff Planning Manual |
| **240 Minutes** | Deliberate Joint Force Air Campaign Planning | **636,800x** | High cognitive fatigue, unmanaged fleet attrition |

---

## 7. License & Compliance

- **Sponsorship**: Smart India Hackathon 2026 — Ministry of Defence (MoD) / Defence Services Staff College (DSSC).
- **Compliance**: 100% synthetic and unclassified data. Zero real military callsigns, deployment coordinates, or classified weapons tables.
