# RESPONSIBLE_USE.md — Ethics, Governance & Operational Safeguards

> **System Scope Statement:** AIR POWER is an **advisory decision-support platform** for Air Tasking Orders (ATO) and dynamic logistics scheduling. A human commander approves every operational change. The system contains **no targeting, weapon-employment, or autonomous-engagement logic**. All operational data is synthetic and unclassified.

---

## 1. The Human-in-the-Loop Principle (HITL)

In military command and control (C2), algorithmic automation must never supersede human moral and legal accountability. AIR POWER enforces the Human-in-the-Loop principle through three architectural guarantees:

1. **Advisory Recommendation Paradigm**:
   - The optimization engines (ALNS, HiGHS-WASM, Pareto Dial) generate candidate **Courses of Action (COAs)**.
   - Algorithms propose; human commanders dispose. No plan transition from draft to active execution can occur without an explicit, cryptographically verifiable `COMMANDER_APPROVAL_TOKEN`.
2. **Explicit Rejection & Reason Transparency**:
   - Every sortie assignment, flight cancellation, or asset retasking provides an auditable reason code and constraint compliance score.
   - Commanders can inspect runner-up alternatives, trade-off point balances, and sensitivity sweeps before approving changes.
3. **Emergency Manual Override**:
   - Operators can freeze individual sorties, lock entire squadron allocations, ground airframes, or manually drag-and-drop mission timelines. Algorithmic re-solvers respect frozen slots as immutable boundary constraints.

---

## 2. Cryptographic Audit Trail & Non-Repudiation

To guarantee complete accountability after every mission cycle, AIR POWER maintains an append-only, SHA-256 hash-chained decision ledger:

- **Immutable Event Chaining**: Each operational event (scenario load, plan generation, retasking inject, commander approval, plan export) references the SHA-256 hash of its predecessor.
- **Operator Attribution**: Every state mutation records the user role (`COMMANDER`, `PLANNER`, `INTEL`, `AUDITOR`), workstation identifier, mission elapsed time (MET), and digital approval signature.
- **Post-Mission Verification**: Defense auditors can verify the cryptographic chain integrity at any time. Any retroactive tampering or log alteration immediately breaks the hash validation check.

---

## 3. Strict Boundary Against Kinetic & Fire-Control Logic

AIR POWER enforces an absolute architectural wall between **resource planning/logistics** and **kinetic tactical execution**:

| In Scope (Planning & Logistics Support) | Strictly Out of Scope (Prohibited) |
|---|---|
| Airbase runway turnaround scheduling (SGR) | Fire-control radar lock or weapon guidance |
| Pilot crew duty cycles and mandatory rest windows | Target aimpoint selection or blast radius lethality calculations |
| Munition inventory matching and pylon loading | Autonomous weapon release or trigger activation |
| Fuel burn, tanker rendezvous, and bingo margins | Kinetic combat engagement orders |
| 4D transit corridor deconfliction and SAM zone avoidance | Autonomous uninhabited drone strike execution |

Any query or script attempting to order unauthorized kinetic strikes or autonomous launches is intercepted by safety filters and classified as `INVALID_UNSAFE` with 100% rejection rate.

---

## 4. Misuse Considerations & Operational Safeguards

1. **Air-Gapped Operation**:
   - The production target is completely air-gapped, running offline in secure enclaves without external internet access or cloud telemetry.
   - All map layers, raster tiles, terrain elevation grids, and libraries are bundled locally within the container.
2. **Defensive Data Provenance**:
   - The software ships exclusively with synthetic and unclassified test assets.
   - If deployed to operational defense networks, ingestion adapters must pass through accredited defense cryptographic hardware gateways (e.g. AFNET / IACCS enclaves).
3. **Anti-Hallucination & Determinism**:
   - The platform relies on exact mathematical programming and verified metaheuristics, not ungrounded generative AI models.
   - Decisions are mathematically explainable, repeatable, and cross-checked by an independent differential verifier before presentation to the commander.
