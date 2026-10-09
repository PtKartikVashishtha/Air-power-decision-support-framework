# HUMAN OPERATOR BASELINE EXPERIMENTAL PROTOCOL
*Empirical Measurement of Manual Joint Air Tasking Performance (SIH 26250)*

> **Purpose**: This protocol replaces the unverified heuristic assumption of "~120 minutes manual planning" with empirical, statistically measured human tasking trials. All participant outcomes are evaluated by the **same decoupled Independent Plan Verifier** and KPI formulas used for ALNS, greedy, and MILP solvers.

---

## 1. Study Design & Scientific Governance

- **Study Type**: Controlled, within-subjects empirical tasking challenge.
- **Sample Target**: Recommended $N \ge 8$ participants (engineering undergraduates, faculty, or defense academy staff college students).
- **Scenario Normalization**: Fixed scenario seed (`Seed 42`) matching the benchmark harness:
  - 6 Forward Airbases (Bhuj, Naliya, Jodhpur, Uttarlai, Jamnagar, Bathinda).
  - 68 Available Airframes (Su-30MKI, Rafale, Tejas, Mirage 2000, IL-78 Tanker, Netra AEW&C).
  - 30 Target Requests with explicit package requirements (Strike + SEAD + Escort).
- **Time Cap**: Fixed 15-minute operational surge limit ($900\text{ seconds}$).
- **Human Interface**: **Manual Planning Challenge Mode** (`/challenge` in web app): A spreadsheet-style grid allowing airframe allocation without AI/ALNS optimization suggestions.

---

## 2. Participant Brief & Consent Statement

### Participant Briefing
> *"You are acting as an Air Tasking Officer in the Joint Air Operations Center (JAOC). You have been handed an operational target list and current airbase readiness rosters. Your objective is to manually construct valid tactical strike packages within 15 minutes. For each target you select to strike, you must assign an appropriate strike aircraft, escort fighter, and SEAD aircraft within combat radius of the target base. You must not exceed runway hourly limits or pilot rest restrictions. Work as fast and accurately as possible."*

### Ethical Consent & Anonymization
1. Participation is voluntary; participants may abort at any time without penalty.
2. No personal identifiable information (PII) is collected. Participants are assigned anonymized alphanumeric tokens: `HUMAN_P01` through `HUMAN_P08`.
3. Results are logged locally to `benchmarks/human/results.json` and committed only in aggregated form.

---

## 3. Evaluation & Scoring Framework

The participant's submitted manual plan is evaluated by the **Decoupled Independent Plan Verifier** (`packages/optimizer/src/independent-verifier.ts`):

1. **Hard Constraint Audit**:
   - $\text{Pen}_{\text{runway}}$: Exceeding base runway throughput cap ($+1000\text{ penalty}$).
   - $\text{Pen}_{\text{radius}}$: Dispatching an airframe beyond its combat radius ($+1000\text{ penalty}$).
   - $\text{Pen}_{\text{sync}}$: Partial strike packages missing required escort or SEAD ($+500\text{ penalty}$).
   - $\text{Pen}_{\text{weather}}$: Launching from a closed airbase ($+1000\text{ penalty}$).
2. **Objective Score**:
   $$Z = \sum_{t \in T_{\text{valid}}} \text{Priority}(t) - \sum_{s \in \text{Sorties}} \text{ThreatRisk}(s) - \text{HardViolations} \times 1000$$
3. **Core Comparative KPIs**:
   - **Time to Completion**: Elapsed seconds on the challenge timer.
   - **Valid Packages Constructed**: Targets achieving 100% role synchronization without violations.
   - **Value Delivered Per Consumed Sortie**: Points delivered divided by total committed airframes.

---

## 4. Execution Workflow

1. **Launch Challenge Interface**:
   ```bash
   pnpm run demo
   # Open browser at http://localhost:3002
   # Navigate to "Manual Challenge" tab in navigation bar
   ```
2. **Participant Onboarding**:
   - Assign Participant ID (e.g., `HUMAN_P01`).
   - Allow 2-minute familiarization with the spreadsheet grid interface.
3. **Execution**:
   - Click "START TIMED CHALLENGE".
   - Stop-watch timer counts up from 00:00 to 15:00.
   - Participant assigns airframes to target rows.
4. **Submission**:
   - Participant clicks "SUBMIT MANUAL PLAN".
   - System immediately invokes independent verifier and generates score card.
   - Trial result is automatically written to `benchmarks/human/results.json`.

---

## 5. Statistical Reporting & CI Integration

Until at least $N \ge 8$ live participant sessions are conducted, the Benchmark Dashboard displays:
- **Status**: *"NO EMPIRICAL HUMAN DATA YET (n=0 / trials pending formal protocol)"*.
- **Speedup Transparency**: The traditional 120-minute planning figure is explicitly labeled as a **Modelled Operational Assumption**, with speedup sensitivity reported across 30m / 60m / 120m / 240m tiers.
- **Sample-Size Warning**: If $1 \le N < 8$ trials exist, the UI presents a yellow caveat banner: *"PRELIMINARY PILOT SAMPLE ($n < 8$). High-confidence statistical power requires $n \ge 8$ participants."*
