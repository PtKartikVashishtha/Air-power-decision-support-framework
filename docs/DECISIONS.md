# Architecture Decision Records (ADR) — AIR POWER

## ADR-001: Monorepo Architecture with TypeScript End-to-End
- **Date**: 2026-10-09
- **Status**: Accepted
- **Context**: The hackathon challenge requires sub-second dynamic retasking, high-speed UI responsiveness, and effortless local offline deployment. Multiple language runtimes create setup friction and Docker bloat.
- **Decision**: Standardize on a pnpm monorepo with Next.js 15 for the web frontend, Fastify for the API server, and TypeScript for the optimization and simulation libraries.
- **Consequences**: Single language across stack, direct schema sharing via Zod, minimal Docker image footprint, zero Python runtime dependency.

## ADR-002: Dual Optimization Architecture (ALNS Anytime + HiGHS-WASM Exact Baseline)
- **Date**: 2026-10-09
- **Status**: Accepted
- **Context**: A defense jury includes Operations Research experts who expect mathematical rigor (MILP optimality guarantees) as well as operational officers who demand sub-3-second anytime response for 100+ sorties.
- **Decision**: Implement an Anytime Adaptive Large Neighborhood Search (ALNS) heuristic with regret repair for real-time operation, alongside a HiGHS-WASM MILP model used as the exact optimality yardstick for benchmarks.
- **Consequences**: Guarantees fast response (<2.5s) while enabling objective optimality gap reporting in the benchmark suite.

## ADR-003: Discrete-Event Simulator & Immutable Event Sourcing
- **Date**: 2026-10-09
- **Status**: Accepted
- **Context**: Demonstrating dynamic retasking requires an interactive theater clock with injects (SAM pop-up, AOG, weather changes) and time-travel replay.
- **Decision**: Build an in-memory discrete-event simulation engine emitting versioned events over SSE/WebSocket, with an immutable append-only event store.
- **Consequences**: Enables 1x-60x speed scrub, instant rewind/replay, and auditable plan divergence diffs.

## ADR-004: Anytime ALNS vs OR-Tools CP-SAT in Air-Gapped Environment
- **Date**: 2026-10-10
- **Status**: Accepted
- **Context**: Jurors frequently query why an anytime metaheuristic was chosen over standard solvers like Google OR-Tools CP-SAT or Gurobi.
- **Decision**: Standardize on an in-process Anytime ALNS metaheuristic with an embedded HiGHS-WASM branch-and-cut yardstick, evaluating CP-SAT solely as an offline research comparator. See comprehensive rationale in [docs/SOLVER_CHOICE.md](SOLVER_CHOICE.md).
- **Consequences**: Zero Python runtime dependency, zero process boundary IPC latency, sub-50ms anytime feasibility under tactical mission injects, and verified 0.00% optimality gap against exact branch-and-cut up to N=16 targets.
