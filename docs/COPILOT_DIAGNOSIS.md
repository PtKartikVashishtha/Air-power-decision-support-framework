# TACTICAL AI COPILOT // ROOT CAUSE DIAGNOSIS & REBUILD BLUEPRINT
*SIH-26250 Air-Gapped Tactical C2 Decision-Support System*

---

## 1. Executive Summary & Trace Analysis

An end-to-end execution trace was conducted on the Tactical AI Copilot across the full lifecycle:
`UI (CopilotModal)` ➔ `API (/api/copilot/command)` ➔ `Parser / AST Compiler` ➔ `Zod Validator` ➔ `Optimizer / State Store` ➔ `SSE Stream (/api/stream)` ➔ `UI Render`.

The diagnostic confirmed all eight hypotheses outlined in the audit plan. The legacy copilot was a fragile mock relying on three `.includes()` checks with no entity resolution, no Zod command AST, no dry-run impact evaluation, no human-in-the-loop confirmation, and zero grounding in live solver state.

---

## 2. End-to-End Trace & Failure Mode Decomposition

| Trace Stage | Component | Legacy Implementation | Diagnostic Finding & Failure Mode |
| :--- | :--- | :--- | :--- |
| **1. UI Input** | `CopilotModal.tsx` | Fixed-height container, dark hardcoded theme, raw string POST | Vulnerable to overflow; lost focus on transmit; no streaming or typing indicator; no dry-run modal; no undo button. |
| **2. API Route** | `apps/api/src/server.ts` | Single monolithic POST `/api/copilot/command` | Bypasses RBAC validation; does not support multi-turn session tracking; does not emit SSE diff events to other clients. |
| **3. Parser** | Ad-hoc `.includes()` | `query.toLowerCase().includes('retask')` | **Brittle Failure**: Fails on natural language ("divert flight", "stand down alert-5", "scramble CAP over Sector 2"), typos ("retaskk", "sam-popup"), numbers ("two Su-30s"), and negation. |
| **4. Entity Resolution** | None | Hardcoded `pending[0]` | **Critical Gap**: Fails to resolve bases ("Bhuj", "Base B"), airframe types ("Su-30MKI Class", "Rafale"), tail numbers ("SB021"), SAM batteries ("SAM-02"), or targets ("T03"). |
| **5. Zod Command AST** | Missing | Raw unchecked JS object | No formal grammar or type-safe Command AST; invalid commands silently fall through to generic string without validation error codes. |
| **6. Execution & State** | Unchecked Mutation | Immediate plan mutation | **Violates Human-in-the-Loop Doctrine**: Mutates live operational plan without a Dry-Run Impact Preview (affected sorties, KPI deltas, constraint impact). |
| **7. Grounding** | Static text strings | Static hardcoded response strings | Explanations ("why was tail X assigned to T3?") were ungrounded hallucinations rather than queries into the ALNS penalty score breakdown. |
| **8. Memory & Undo** | Stateless | No session state | Cannot handle context follow-ups ("do that again", "same from Base C") and provides zero Undo capability. |

---

## 3. Specific Screenshot & Natural Language Failure Cases

### Case 1: Natural Retasking Phrasing
- **User Input**: *"Divert 2 Su-30s from Base Bhuj to cover pop-up SAM threat near Sector 4"*
- **Legacy Behavior**: Matched `lower.includes('retask')` (false positive on 'sam' and 'threat'), but picked arbitrary `pending[0]` inject instead of resolving Bhuj or Su-30s. Ignored user's sector specifications.
- **Root Cause**: Lack of slot filling and entity resolver.

### Case 2: Status Query with Synonyms
- **User Input**: *"Give me squadron readiness for Western Sector fighters"*
- **Legacy Behavior**: Failed to match `readiness` if phrased as *"combat availability report"*; returned fallback: *"Command parsed... System evaluated 6 airbases and active airspace corridors"*.
- **Root Cause**: Zero synonym dictionary or intent classification.

### Case 3: Why-Assignment Grounded Explanation
- **User Input**: *"Why was tail SB014 assigned to Target T02 instead of T05?"*
- **Legacy Behavior**: Returned generic canned sentence. Did not query `ConstraintEvaluator` or ALNS score delta.
- **Root Cause**: No explanation engine hooked into optimizer cost functions.

### Case 4: Risky Destructive Action (Base Closure)
- **User Input**: *"Close Base Naliya due to runway cratering"*
- **Legacy Behavior**: Fell through to generic fallback. No inject created, no dry-run preview, no commander approval step.
- **Root Cause**: Unsupported command type and absence of interactive confirmation flow.

---

## 5. Rebuild Architecture Specification

The rebuilt pipeline operates 100% offline and deterministically without external API dependencies:

1. **`TacticalCopilotEngine` (`packages/optimizer/src/copilot-engine.ts`)**:
   - Tokenizer & fuzzy Levenshtein / n-gram intent classification.
   - Entity resolver mapping alias dictionaries (e.g. "Base B" ➔ "BASE_NALIYA", "Su-30" ➔ "Su-30MKI Class").
   - 15 Canonical Intent Types: `RETASK_THREAT`, `CANCEL_SORTIE`, `SWAP_AIRFRAME`, `GROUND_AIRCRAFT`, `CLOSE_AIRBASE`, `ADD_TST_TARGET`, `SET_PRIORITY`, `QUERY_STATUS`, `EXPLAIN_ASSIGNMENT`, `WHAT_IF_FORK`, `SWITCH_COA`, `CONTROL_TIME`, `HELP`, `UNDO_LAST_ACTION`, `INVALID_COMMAND`.
   - Zod AST Schema: `CopilotCommandASTSchema`.
2. **`DryRunEngine`**:
   - Computes candidate plan using ALNS/dynamic retasker without committing.
   - Calculates exact KPI deltas: Covered Targets Δ, Flight Risk Δ, Fuel Used Δ, Sorties Shifted Δ.
3. **Gold Corpus (`packages/shared/copilot-corpus.json`)**:
   - >=150 annotated tactical prompts covering all categories with expected AST and slot extractions.
   - Automated benchmark test suite verifying >=95% accuracy and 100% safe rejection.
4. **Daylight UI Integration (`CopilotModal.tsx`)**:
   - Daylight JAOC styling with responsive `LayoutPrimitives`.
   - Dry-Run Confirmation Card with visual delta chips.
   - One-click Undo button, command history, and structured suggested prompts.
