# REASON_CODES.md — Operational Reason Code Catalogue

> **Defence Standard:** In mission-critical decision support, opaque algorithmic allocations or rejections are unacceptable. Every assignment, rejection, dynamic retasking delta, and Course of Action trade-off in AIR POWER emits a **stable reason code paired with a plain-English explanation** and doctrinal rule citation.

---

## 1. Reason Code Architecture

All reason codes adhere to the formal schema defined in `packages/shared/src/reason-codes.ts`:

```typescript
export interface ReasonCodeEntry {
  code: string;               // Stable programmatic identifier (e.g. CREW_FATIGUE_LIMIT)
  category: ReasonCategory;   // ASSIGNMENT | REJECTION | RETASKING | COA_DELTA | SAFETY
  title: string;              // Human-readable title for tactical displays
  plainEnglish: string;       // One plain-English sentence explaining the cause
  doctrineRule: string;       // DSSC / MoD operational doctrine reference
  badgeColor: { bg: string; text: string; border: string };
}
```

---

## 2. Complete Code Catalogue

### Category 1: Infeasibility & Constraint Rejections (`REJECTION`)

| Programmatic Code | Plain-English Explanation | Operational Doctrine Reference |
|---|---|---|
| `CREW_FATIGUE_LIMIT` | Aircrew exceeded mandatory duty hours; minimum 8-hour consecutive crew rest enforced. | DSSC Doctrine Kernel 03: Max 8 combat flight hours in rolling 24h window. |
| `RANGE_EXCEEDS_RADIUS` | Target distance exceeds airframe unrefueled combat radius without designated tanker offload. | Fuel Safety Buffer: Mission distance > 2x Combat Radius + 15% reserve. |
| `MEZ_ROUTE_DENIED` | Flight corridor penetrates hostile SAM lethal envelope without dedicated DEAD/SEAD escort. | Air Defense Avoidance: Stand-off weapon release or hard 15km exclusion. |
| `MUNITION_INCOMPATIBLE` | Target requires heavy penetrator or standoff weapon not compatible with airframe hardpoints. | Weapon Loading Table: Airframe station weight & bus protocol limits. |
| `MAGAZINE_STOCK_EXHAUSTED` | Requested precision guided munition stock exhausted at departure airbase magazine. | Logistics Magazine Limits: Non-zero physical depot stock required before taxi. |
| `TURNAROUND_SLOT_UNAVAILABLE` | Airbase maintenance bays fully committed; minimum 45-60 min turnaround window unachievable. | Sortie Generation Rate (SGR): Sequential runway and refuel turnaround spacing. |
| `RUNWAY_WEATHER_MINIMA` | Cloud ceiling or surface crosswinds exceed aircraft safe departure/recovery flight limits. | Instrument Flight Rules (IFR): Airfield closed to non-all-weather recoveries. |
| `RUNWAY_INTERDICTED` | Airbase runway damaged or cratered; flight operations suspended pending civil repair. | Base Survivability: Zero departures permitted during red alert or UXO clearing. |
| `AIRFRAME_UNSERVICEABLE` | Aircraft grounded due to unscheduled avionics snag or scheduled phase inspection. | Airworthiness Directive: Aircraft On Ground (AOG) status locks airframe. |
| `DECONFLICTION_CORRIDOR_BLOCKED` | Flight corridor occupied; minimum 3-minute temporal buffer or 5,000ft altitude separation violated. | Airspace Control Order (ACO): 4D spatial-temporal corridor deconfliction. |

### Category 2: Positive Assignment Rationales (`ASSIGNMENT`)

| Programmatic Code | Plain-English Explanation | Operational Doctrine Reference |
|---|---|---|
| `PRIMARY_STRIKE_MATCH` | Airframe speed, pylon loadout, and range provide superior objective score on target. | Objective Function: Maximum expected target destruction per combat sortie. |
| `FAST_QRA_SCRAMBLE` | Forward airbase hot-pad airframe committed to achieve earliest interception timeline. | Air Defense Doctrine: Priority intercept within 5-minute scramble readiness. |
| `SEAD_ESCORT_SYNCHRONIZED` | Package includes dedicated electronic warfare/anti-radiation aircraft neutralizing SAM envelope. | Package Integration: Joint strike-SEAD ingress timing deconfliction. |
| `RESERVE_PRESERVED` | Airframe preserved in standby reserve for fleeting pop-up targets and theater defense. | Balanced Reserve Doctrine: Retain 20-25% uncommitted fleet depth. |
| `MIN_RISK_TERRAIN_MASK` | Low-level ingress route chosen through valley defilade, reducing radar line-of-sight exposure. | Force Preservation: Minimize attrition probability under contested radar coverage. |

### Category 3: Retasking & Disruption Diffs (`RETASKING`)

| Programmatic Code | Plain-English Explanation | Operational Doctrine Reference |
|---|---|---|
| `POPUP_THREAT_DIVERT` | Transit waypoints shifted 35 km south to skirt newly detected mobile SAM threat envelope. | Dynamic Retasking: Real-time threat avoidance with minimal TOT disruption. |
| `AIRFRAME_AOG_SWAP` | Mechanically snagged airframe replaced with warm spare from the same squadron alert hangar. | Operational Stability: Zero-hamming substitution preserving original flight plan timing. |
| `TST_HIGH_PRIORITY_TASK` | Airborne package retasked to strike critical fleeting target identified by real-time intelligence. | Targeting Priority: Fleeting C4I targets override scheduled secondary strike sorties. |
| `WEATHER_DIVERT_RECOVERY` | Primary airbase fogged in; recovery routed to designated alternate aerodrome with safe minima. | Flight Safety Directive: Minimum 45-min diversion fuel reserved for weather alternate. |
| `FROZEN_ZONE_LOCKED` | Sortie within 15 minutes of Time-on-Target; locked against automatic disruption to preserve package. | Frozen-Zone Invariant: Delta-T <= 15 min sorties require explicit commander override token. |

### Category 4: Safety & Copilot Guardrails (`SAFETY`)

| Programmatic Code | Plain-English Explanation | Operational Doctrine Reference |
|---|---|---|
| `COMMANDER_AUTHORIZED` | Operational state mutation authorized with verified commander authentication token. | Human-in-the-Loop: Strict non-repudiation in cryptographic decision ledger. |
| `SAFETY_POLICY_REJECTED` | Command rejected: contains unauthorized kinetic engagement request or lacks commander credentials. | Ethical Defense Guardrails: Advisory-only architecture prohibits autonomous fire commands. |
| `AMBIGUOUS_FLIGHT_SPEC` | Command lacks specific flight callsign, base code, or target identifier; clarification requested. | Advisory Clarification: Ambiguous instructions must not execute without disambiguation. |

---

## 3. UI Display & Tooltip Integration

Every reason code appears in the daylight defense user interface as an interactive chip (`ReasonCodeChip.tsx`):
- **Visual Appearance**: Compact mono tag with category-specific defense border and badge color.
- **Hover / Focus Tooltip**: Instant accessible tooltip revealing the complete reason code ID, category, plain-English sentence, and doctrine rule citation.
- **Surface Coverage**:
  1. **Planner Studio (`PlannerInTheLoopStudio.tsx`)**: Dedicated column in the master sortie table and alternative evaluation cards.
  2. **Retasking Console (`RetaskingConsole.tsx`)**: Inline reason chip beside every sortie adjustment.
  3. **Copilot Modal (`CopilotModal.tsx`)**: Verification chip inside dry-run impact confirmation cards.
  4. **Cryptographic Audit Log (`AuditTrailView.tsx`)**: REASON CODE column in the immutable event log.
  5. **Tactical Export Gateway (`AtoExportView.tsx`)**: Included in USMTF remarks, pilot brief cards, and CoT XML event remarks.
