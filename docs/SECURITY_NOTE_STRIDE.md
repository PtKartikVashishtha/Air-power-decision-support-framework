# SECURITY & TRUST ARCHITECTURE (STRIDE-LITE) — SIH PS 26250

> **System**: AIR POWER: Dynamic Air Operations & Resource Optimisation  
> **Classification**: NOTIONAL / TRAINING DATA ENVIRONMENT (Strictly Unclassified)  
> **Security Baseline**: Offline-first, Zero-cloud dependency, Tamper-evident Audit Ledger  

---

## 1. THREAT MODEL MATRIX (STRIDE-LITE)

| Threat Category | Potential Attack Vector | Platform Countermeasure & Architecture Mitigation | Status |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged tactical telemetry or unauthorized role masquerading as Air Commander. | Cryptographic HMAC / SHA-256 signatures on feed frames; strict Role-Based Access Control (RBAC) separating Planners from Command approval. | **ENFORCED** |
| **Tampering** | Man-in-the-middle alteration of generated Air Tasking Orders (ATO) or constraint rules. | Append-only cryptographically chained SHA-256 audit ledger (`AuditTrailView`). Any alteration breaks hash verification chain. | **ENFORCED** |
| **Repudiation** | Operator denying an emergency retasking or weapon authorization action. | Every solver run, commander commit, and inject acknowledgement records immutable actor ID, UTC timestamp, and plan hash. | **ENFORCED** |
| **Information Disclosure** | Leakage of tactical positions, squadron rosters, or readiness data. | 100% offline air-gapped runtime with zero outbound network calls. Zero third-party cloud analytics or external telemetry SDKs. | **ENFORCED** |
| **Denial of Service** | Volumetric spamming of target requests or adversarial inputs freezing the solver. | Sub-50ms Anytime ALNS solver timeout guarantee; Zod schema input validation with strict record quarantine for malformed payloads. | **ENFORCED** |
| **Elevation of Privilege** | Planner modifying locked frozen-zone missions or overriding commander veto. | Dual-control Two-Person Rule doctrine for live execution; backend enforces `role === 'COMMANDER'` for ATO promotion. | **ENFORCED** |

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC) SPECIFICATION

| Role | Permissions | Commander Commit Authority | Frozen-Zone Override |
| :--- | :--- | :--- | :--- |
| **AIR COMMANDER** | View COP, Compare Triple COAs, Approve Master ATO, Trigger Emergency Retasking | **EXCLUSIVE AUTHORITY** | **YES** |
| **CHIEF PLANNER** | Edit sorties in Planner-in-the-Loop, Run ALNS solves, Request Auto-repair, Export ATO/ACO | Advisory Drafts Only | No |
| **INTEL ANALYST** | Submit Threat Injects, Ingest BDA assessments, Update SAM corridors | No | No |
| **DEFENCE AUDITOR** | Verify SHA-256 hash chains, Export audit CSV, Review constraint compliance scores | Read-Only Audit | No |

---

## 3. SOFTWARE BILL OF MATERIALS (SBOM) & SUPPLY CHAIN SECURITY

1. **Runtime Platform**: Node.js v22 LTS (Strictly TypeScript / JavaScript; zero runtime Python / zero unvetted binary extensions).
2. **Core Dependencies**:
   - `fastify`: High-performance, low-footprint REST & SSE engine (zero vulnerable transitive dependencies).
   - `zod`: Type-safe schema validation engine enforcing structural boundaries at all boundaries.
   - `lucide-react`: Lightweight SVG symbology.
   - `fast-check`: Property-based randomized fuzzing harness for mathematical constraint boundaries.
3. **Secrets & Credentials Audit**:
   - Repository contains **zero hardcoded API keys, secrets, or private certificates**.
   - Offline synthetic scenario generation operates on procedural deterministic pseudo-random seeds.
   - No external DNS or CDN requests required for core system execution.
