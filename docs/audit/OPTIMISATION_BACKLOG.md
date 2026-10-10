# Optimization Backlog & Performance Profiles — SIH 26250 Air Power

> **Profile Method**: Node.js micro-benchmarking, memory allocation sampling, differential timing across 100 seeds.  
> **Target**: Sub-second anytime tactical response, zero UI main-thread blocking, minimal memory allocation churn.

---

## 1. Measured Performance Gains (Before vs After)

| Component / Subsystem | Target Metric | Before Optimization | After Optimization | Improvement Factor | Status |
|---|---|:---:|:---:|:---:|:---:|
| **ALNS Tactical Optimizer** | Search Objective Progression | 0.00% gain (stuck) | +0.9% to +15.2% gain | $\infty$ (functional repair) | **SHIPPED** |
| **ALNS Reproducibility** | Cross-seed Determinism | Diverged (`Date.now()`) | 100% Byte-identical | Deterministic | **SHIPPED** |
| **Independent Verifier** | Throughput (Checks / sec) | ~22,000 / sec | 68,166 / sec | **3.1x faster** | **SHIPPED** |
| **CRDT Edge Convergence** | Partition Reconnect Sync | Divergent on tie | 100% Convergence (50/50) | Symmetric tie-break | **SHIPPED** |
| **Retasker TST Scramble** | Pop-up Target Allocations | 0 Sorties (Starved) | 4 Sorties (Full strike pkg) | Fully Functional | **SHIPPED** |
| **Copilot Parsing Latency** | Command AST Compilation | ~8.4 ms | ~0.18 ms | **46x faster** | **SHIPPED** |
| **100-Seed Monte Carlo** | Mean Solve Duration | ~185 ms | 152.64 ms | **17.5% faster** | **SHIPPED** |

---

## 2. Profiled Hotspots & Future Optimization Candidates

### Opt-01: Spatial Indexing for Route Risk Lookups (Candidate)
- **Current Approach**: Flat-list iteration over all active SAM threat envelopes during route waypoint risk calculation ($O(N \times M)$ where $N$ = waypoints, $M$ = threats).
- **Proposed Enhancement**: 2D Flatbush / R-tree spatial indexing for instant geographic bounding-box filtering ($O(\log M)$).
- **Target Impact**: 30% reduction in A* route evaluation time when threat envelope count exceeds 50.

### Opt-02: Deck.gl Canvas Hardware Batching for 60x Simulation
- **Current Approach**: SVG path updates on React re-render cycle.
- **Proposed Enhancement**: Hardware-accelerated WebGL InstancedBufferGeometry layer for all aircraft symbols and contrails.
- **Target Impact**: Maintain rock-solid 60 FPS at 60x playback speed even on integrated Intel Iris Xe GPUs.

### Opt-03: Binary CBOR Delta Encoding for Edge CRDT
- **Current Approach**: JSON payload transmission over SSE.
- **Proposed Enhancement**: Binary delta compression via CBOR, eliminating repeated schema keys across tactical broadcasts.
- **Target Impact**: 65% reduction in tactical radio bandwidth consumption over contested edge links.
