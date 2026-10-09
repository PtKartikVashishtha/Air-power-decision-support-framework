# Mathematical Optimization Formulation: Dynamic Air Operations (SIH 26250)

## 1. Sets and Indices
- $t \in \mathcal{T}$: Prioritized Target Objectives / Mission Requests.
- $a \in \mathcal{A}$: Combat and Support Airframes (Su-30MKI class, Rafale class, Tejas, Mirage, IL-78, AEW&C).
- $p \in \mathcal{P}$: Aircrew / Flight Officers.
- $b \in \mathcal{B}$: Airbases / Forward Operating Bases.
- $m \in \mathcal{M}$: Munitions (BVR AAM, Standoff Cruise, Precision Guided Bombs, Anti-Radiation).
- $r \in \mathcal{R}$: Tactical Package Roles $\{\text{STRIKE}, \text{SEAD}, \text{ESCORT}, \text{TANKER}\}$.
- $h \in \mathcal{H}$: Hourly Time-Slots $[0, 24]$.

---

## 2. Decision Variables
- $x_{a, p, t, r} \in \{0, 1\}$: Binary variable $= 1$ if aircraft $a$ with pilot $p$ is assigned to target $t$ under role $r$.
- $y_t \in \{0, 1\}$: Binary indicator whether target $t$ received its complete required tactical package.
- $u_{a, t} \in \mathbb{R}^+$: Departure time of aircraft $a$ for target $t$.
- $\tau_t \in \mathbb{R}^+$: Assigned Time-on-Target (TOT) for mission $t$.

---

## 3. Multi-Objective Function
$$\max Z = w_1 \sum_{t \in \mathcal{T}} \text{Priority}_t \cdot y_t - w_2 \sum_{s \in \mathcal{S}} \text{Risk}(s) - w_3 \sum_{s \in \mathcal{S}} \text{Fuel}(s) + w_4 \sum_{a \in \mathcal{A}_{\text{res}}} 1 - w_5 \sum_{s \in \mathcal{S}} \text{DisruptionCost}(s, s^0)$$

Where:
- $w_1$: Strategic Target Destruction Weight (tuned by doctrine: Max-Effect vs Balanced).
- $w_2$: Threat Risk Exposure Penalty over SAM envelopes.
- $w_3$: Fuel Consumption Penalty.
- $w_4$: Strategic Air Superiority Reserve Incentive.
- $w_5$: Stability Disruption Penalty during dynamic retasking.

---

## 4. Hard Operational Constraints

### 4.1 Multi-Wave Airframe Sortie Generation & Turnaround Separation
Rather than restricting combat airframes to a single mission per 24 hours, modern doctrine enforces Sortie Generation Rate (SGR) waves. An aircraft $a$ can be tasked to multiple sorties across the 24-hour ATO day provided successive missions satisfy mandatory ground turnaround (refueling, re-arming, pre-flight inspection):

$$x_{a, p_1, t_1, r_1} = 1 \land x_{a, p_2, t_2, r_2} = 1 \land (u_{a, t_2} > u_{a, t_1}) \implies u_{a, t_2} \ge \text{Recovery}_{a, t_1} + \text{TurnaroundTime}_a$$
$$x_{a, p, t, r} = 1 \implies \text{Status}(a) = \text{FMC}$$

### 4.2 Pilot Qualification, Type Rating & Fatigue Limits
Pilot must be rated on aircraft model and within safety fatigue bounds:
$$x_{a, p, t, r} = 1 \implies \text{TypeRating}(p) = \text{Model}(a)$$
$$x_{a, p, t, r} = 1 \implies \text{FatigueScore}(p) \le 65 \quad \text{and} \quad \text{DutyHours}_{24h}(p) \le 12$$

### 4.3 Combat Radius & Tanker Support
$$\text{Dist}(b, t) \cdot 2 \le \text{CombatRadius}(a) \cdot (1 + \text{AAR\_Refuel}), \quad \forall (a, t)$$

### 4.4 Munition Compatibility & Base Magazines
$$x_{a, p, t, r} = 1 \implies \text{Compatible}(m, \text{Model}(a)) = 1$$
$$\sum_{a, p, t} \text{Load}(m) \cdot x_{a, p, t, r} \le \text{Stock}_{b, m}, \quad \forall b \in \mathcal{B}, m \in \mathcal{M}$$

### 4.5 Runway Hourly Sortie Capacities
$$\sum_{a, p, t, r: u_{a, t} \in \text{Hour}(h)} x_{a, p, t, r} \le \text{MaxSortiePerHour}_b, \quad \forall b \in \mathcal{B}, h \in \mathcal{H}$$

### 4.6 Time-on-Target (TOT) Synchronization
$$\text{TOT\_Start}_t \le \tau_t \le \text{TOT\_End}_t, \quad \forall t \in \mathcal{T}$$

### 4.7 Full Package Integrity
A target is credited as destroyed ($y_t = 1$) if and only if all strike, SEAD, and escort requirements are satisfied:
$$y_t \le \frac{1}{\text{ReqStrike}_t} \sum_{a, p} x_{a, p, t, \text{STRIKE}}$$
$$y_t \le \frac{1}{\text{ReqSEAD}_t} \sum_{a, p} x_{a, p, t, \text{SEAD}} \quad (\text{if ReqSEAD}_t > 0)$$
$$y_t \le \frac{1}{\text{ReqEscort}_t} \sum_{a, p} x_{a, p, t, \text{ESCORT}} \quad (\text{if ReqEscort}_t > 0)$$

### 4.8 Frozen-Zone Dynamic Retasking Invariant
Sorties already airborne or departing within horizon $\Delta_{\text{frozen}}$ are locked:
$$u_{a, t}^0 \le t_{\text{sim}} + \Delta_{\text{frozen}} \implies x_{a, p, t, r} = x_{a, p, t, r}^0$$
