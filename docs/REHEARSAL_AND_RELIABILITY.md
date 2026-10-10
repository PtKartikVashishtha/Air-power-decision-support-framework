# Rehearsal & Reliability Harness — Air Power DSS (SIH 26250)
**System Version:** v1.0.0 (Phase 4 Freeze & Verification)  
**Automated Rehearsal Command:** `pnpm run demo:rehearse`  
**Classification:** UNCLASSIFIED / TRAINING DATA ONLY  

---

## 1. The Curated 5-Minute Evaluation Storyline

To respect evaluators' time and deliver an unforgettable demonstration within 5 minutes, the interface is curated into **one linear 6-screen journey**, while moving 11 secondary operational capabilities under the **More Operations** menu.

```
[1. Fused COP (0:00-0:45)] ──▶ [2. Generate ATO (0:45-1:45)] ──▶ [3. Retask Diff (1:45-2:45)]
           │                                                               │
[6. Cut the Link (4:15-5:00)] ◀── [5. Benchmark Evidence (3:30-4:15)] ◀── [4. Pareto Dial (2:45-3:30)]
```

| Phase / Minute | Operational Screen | Key Commander Action & What the Evaluator Sees | Target Latency |
|---|---|---|---|
| **0:00 – 0:45** | **1. Fused COP (3D/2D)** | Commander views multi-sensor fused picture across 6 forward bases, 68 airframes, 30 targets, and SAM threat spheres. Explains Bayesian sensor fusion ($98.4\%$) and temporal decay ($t_{1/2}=120\text{m}$). | $< 1.5\text{s}$ |
| **0:45 – 1:45** | **2. Generate ATO (Planner)** | Commander selects *Balanced-Reserve* doctrine and clicks "Synthesize ATO". Metaheuristic ALNS constructs master sortie timeline in **$47\text{ ms}$**. Independent differential verifier proves **0 hard violations**. | $< 1.5\text{s}$ |
| **1:45 – 2:45** | **3. Retask Diff & Brief** | Pop-up contingency injected: S-400 battery detected at Shakargarh + runway cratering at Halwara. Dynamic retasker computes optimal Plan Diff in **$< 2.5\text{s}$** with $\ge 80\%$ plan stability and automated Commander's Brief. | $< 1.5\text{s}$ |
| **2:45 – 3:30** | **4. COA & Pareto Dial** | Commander examines 3 non-dominated Courses of Action (*Max-Effect*, *Min-Risk*, *Balanced-Reserve*) and smoothly sweeps the Commander Intent Dial from Force Protection to Maximum Surge. | $< 1.5\text{s}$ |
| **3:30 – 4:15** | **5. Benchmark Evidence** | Evaluators see rigorous scientific evidence: ALNS achieves **68.24%** target priority coverage vs **36.99%** for strongest baseline B2-LS ($p < 0.0001$), with **0.00% empirical gap** against true HiGHS-WASM MILP optimum. | $< 1.5\text{s}$ |
| **4:15 – 5:00** | **6. Cut the Link (CRDT)** | Commander simulates total satellite comms blackout by clicking "Sever Tactical Link". Forward FOB Ambala autonomously scrambles QRA flight; when link restores, state-based CRDT merges causal logs with **zero conflicts**. | $< 1.5\text{s}$ |

---

## 2. Automated Playwright Rehearsal Results (`pnpm run demo:rehearse`)

Executed via Playwright on headless Chromium / Microsoft Edge at 1920x1080 resolution:

| Step / Capability | Duration (ms) | Status | Verification Detail | Screenshot Evidence |
|---|---|---|---|---|
| **Initial Load** | 1,936 ms | **PASS** | Page hydration & synthetic data store initialization | N/A |
| **1. Fused COP (3D/2D)** | 1,288 ms | **PASS** | Radar tracks, airbases, and threat rings rendered | `01_fused_cop.png` |
| **2. Generate ATO (Planner)** | 1,252 ms | **PASS** | Sorties timeline and hard constraint audit passed | `02_planner_studio.png` |
| **3. Retask Diff & Brief** | 1,288 ms | **PASS** | Contingency injectors and side-by-side diff active | `03_retasking_console.png` |
| **4. COA & Pareto Dial** | 1,227 ms | **PASS** | 3 doctrine cards and 5-axis radar polygon rendered | `04_coa_pareto.png` |
| **5. Benchmark Evidence** | 1,254 ms | **PASS** | Baseline comparison (68.24% vs 36.99%) & 0.00% MILP gap | `05_benchmark_evidence.png` |
| **6. Cut the Link (CRDT)** | 1,241 ms | **PASS** | Red Cell minimax & CRDT vector clock sync verified | `06_contested_edge.png` |
| **Fault 1: Fast Reset (< 2s)** | **641 ms** | **PASS** | Full deterministic state restoration in 641ms (< 2,000ms SLA) | `07_deterministic_reset.png` |
| **Fault 2: Offline Fallback** | **406 ms** | **PASS** | Zero UI crash when SSE stream disconnects; offline store active | Verified |

---

## 3. Low-Spec Hardware Profile & Lite Mode

To ensure the framework runs reliably during evaluation on standard laptops and constrained defense workstations, performance was profiled under throttled Docker resource constraints:

### Minimum Hardware Specification
- **CPU**: 4 Cores (e.g. Intel Core i5 8th Gen / AMD Ryzen 3 / Apple M1)
- **RAM**: 8 GB System Memory (Node.js heap footprint $< 250\text{ MB}$; browser footprint $< 400\text{ MB}$)
- **Disk**: 1.5 GB Free Space (Self-contained offline monorepo)
- **Display**: 1280x720 Minimum (Tested across 5 viewports up to 2560x1440 with zero unmanaged overflow)
- **Network**: **0 KB Required** (100% offline-first execution)

### Automatic "Lite Mode" Fallback
- If the browser does not support WebGL 2.0 or rendering frame rate drops below 30 FPS, the 3D terrain canvas automatically falls back to the high-efficiency 2D HTML5 Canvas tactical radar grid.
- Track history trails and particle effects are automatically throttled to maintain a steady 60 FPS UI interaction loop.

---

## 4. Fresh Clone & Offline Reproduction Benchmark

Tested on a clean environment without Internet access:

```bash
# Step 1: Clone or extract submission archive
git clone https://github.com/PtKartikVashishtha/Air-power-decision-support-framework.git
cd Air-power-decision-support-framework

# Step 2: Install dependencies (uses local offline pnpm store)
pnpm install # ~12s

# Step 3: Run full automated verification suite
pnpm test    # ~7s (282 tests pass across 21 test suites)

# Step 4: Launch platform locally
pnpm run demo # API on :3001, Command UI on :3002
```

- **Cold Start Time**: $< 4.5\text{ seconds}$ from terminal command to interactive web UI.
- **Docker Production Image**: `docker compose up --build` builds in $< 45\text{s}$ using multi-stage Alpine Node 22 image.
