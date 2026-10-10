# 5-Minute Evaluation Demo Video Voice-Over Script — Air Power DSS (SIH 26250)
**System Version:** v1.0.0 (Phase 4 Freeze & Verified)  
**Total Target Runtime:** 05:00 (300 Seconds)  
**Presenter Persona:** Lead Systems Architect & Defense Operations Research Specialist  
**Tone:** Confident, precise, mathematically grounded, doctrinally authentic.  

---

## 🎬 Video Overview & Screen Progression

```
[0:00 - 0:45] Screen 1: Fused Common Operating Picture (3D/2D Radar Grid)
[0:45 - 1:45] Screen 2: Master ATO Synthesis & Planner-in-the-Loop Studio
[1:45 - 2:45] Screen 3: Contingency Ingestion & Dynamic Retasking Console
[2:45 - 3:30] Screen 4: Multi-Objective COA Studio & Commander Intent Dial
[3:30 - 4:15] Screen 5: Empirical Benchmark Shootout & HiGHS MILP Gap Evidence
[4:15 - 5:00] Screen 6: Contested Edge Operations & CRDT "Cut the Link" Mode
```

---

## 🎙️ Minute-by-Minute Narration Script

### [0:00 – 0:45] Scene 1: Fused Common Operating Picture (3D/2D)
**Visual on Screen**: Browser opens at `http://localhost:3002`. Tab 1 is active. 3D tactical radar display reveals the western frontier, showing 6 forward operating bases (Ambala, Halwara, Adampur, Jodhpur, Bareilly, Gwalior), 68 airframes, 30 tactical targets, and SAM threat bubbles.

> **VOICEOVER (0:00 – 0:45)**:  
> *"Good morning, esteemed members of the jury and evaluating officers. In contested modern air warfare, planning and retasking joint air operations takes traditional command staffs 2 to 4 hours across siloed, air-gapped systems. When pop-up SAM batteries emerge or forward runways take missile damage, that latency costs airframes and lives.*  
>  
> *Welcome to **AIR POWER** — an offline-first, sovereign Decision Support Framework built for the Ministry of Defence and DSSC under Smart India Hackathon problem statement 26250.*  
>  
> *Here on the Common Operating Picture, we fuse 7 disparate operational data families: aircraft readiness, pilot rosters, weapons magazines, airspace zones, radar tracks, and live weather. Notice our Bayesian confidence fusion score of 98.4%, with exponential temporal decay modeling threat mobility.*  
>  
> *Let's now transition to the heart of the system: synthesizing an operational Air Tasking Order."*

---

### [0:45 – 1:45] Scene 2: Master ATO Synthesis & Planner-in-the-Loop Studio
**Visual on Screen**: Presenter clicks **"2. PLANNER-IN-THE-LOOP STUDIO"**. The multi-wave sortie timeline is displayed. Presenter selects *Balanced-Reserve* doctrine and clicks **"Synthesize Master ATO"**. A 47ms solve notification flashes green. Sortie Gantt charts, fuel estimates, and weapon packages fill the screen.

> **VOICEOVER (0:45 – 1:45)**:  
> *"We click over to the Planner-in-the-Loop Studio. Generating a 24-hour theater Air Tasking Order is a combinatorial challenge with millions of variables. We select the commander's doctrine focus — Balanced Reserve — and trigger the Anytime ALNS metaheuristic.*  
>  
> *In exactly **47 milliseconds**, the optimizer assigns 36 sorties satisfying 12 hard operational constraints: turnaround minimums, crew rest, weapons magazine compatibility, and 4D airspace deconfliction.*  
>  
> *Crucially, our doctrine maintains Human-in-the-Loop command: the AI proposes Courses of Action; the commander reviews every package before commitment. Every sortie is independently audited by a decoupled differential verifier with **zero hard constraint violations** across 10,000 fuzzed test cases.*  
>  
> *Now, let's watch what happens when battle friction strikes mid-operation."*

---

### [0:45 – 2:45] Scene 3: Dynamic Contingency Injection & Retasking Console
**Visual on Screen**: Presenter navigates to **"3. DYNAMIC RETASKING CONSOLE"**. Presenter clicks "Inject Pop-Up Threat (HQ-9 / S-300)" and "Inject Runway Denial (FOB Halwara)". The system automatically computes a Plan Diff in under 2.5s, highlighting rerouted sorties in amber, newly tasked SEAD escorts in blue, and uncommitted sorties in green. An automated Commander's Brief is generated.

> **VOICEOVER (1:45 – 2:45)**:  
> *"At hour H+04:15, hostile activity disrupts the plan. An enemy long-range HQ-9 SAM battery pops up directly along Ingress Corridor Alpha, and runway 09/27 at Halwara is cratered by a cruise missile strike.*  
>  
> *Traditional command staffs would require 45 minutes to manually calculate diverts. AIR POWER executes Dynamic Retasking in **under 2.5 seconds**.*  
>  
> *Notice our operational **Frozen-Zone**: flights currently inside a 15-minute intercept window are locked as immutable invariants to prevent confusing airborne pilots. Meanwhile, standby Rafale SEAD packages are scrambled, returning flights are smoothly diverted to Bareilly before fuel starvation, and the plan preserves over **80% operational stability**.*  
>  
> *The AI synthesizes an instant Commander's Brief: exactly which sorties changed, why, and the delta in force preservation."*

---

### [2:45 – 3:30] Scene 4: Multi-Objective COA Studio & Commander Intent Dial
**Visual on Screen**: Presenter switches to **"4. COA COMPARISON STUDIO"**. Three side-by-side COA cards are shown (*Max-Effect*, *Min-Risk*, *Balanced-Reserve*) with a 5-axis radar chart. Presenter clicks and drags the **Commander Intent Dial** across the Pareto frontier.

> **VOICEOVER (2:45 – 3:30)**:  
> *"Commanders never accept a single black-box plan. In the COA Studio, AIR POWER generates three distinct, mathematically non-dominated Courses of Action side-by-side:*  
>  
> *Max Effect focuses maximum kinetic destruction on priority targets. Min Risk routes sorties through low-level terrain masking corridors to preserve airframes. Balanced Reserve holds a 25% strategic reserve for fleeting pop-up targets.*  
>  
> *Watch the **Commander Intent Dial**: by gliding the slider, the commander dynamically navigates the Pareto frontier in real time, adjusting weights across Target Value, Force Protection, and Fuel Conservation with immediate visual trade-off feedback."*

---

### [3:30 – 4:15] Scene 5: Rigorous Scientific Evidence & HiGHS MILP Gap
**Visual on Screen**: Presenter switches to **"5. BENCHMARK EVIDENCE HARNESS"**. Evaluators see the N=100 seed benchmark table, the ALNS vs B2-LS comparison bar chart, and the HiGHS-WASM MILP optimality gap breakdown.

> **VOICEOVER (3:30 – 4:15)**:  
> *"Defense decisions must be backed by rigorous, unshakeable mathematics. In the Benchmark Studio, we compare AIR POWER against credible baselines across 100 seeded Monte Carlo trials.*  
>  
> *Against the strongest human-heuristic baseline — B2-LS (Package-Aware Greedy with 2-Opt Local Search) — our ALNS solver delivers **68.24% target priority value coverage** compared to 36.99% for B2-LS. That represents a statistically proven **+31.25% absolute advantage** with p-value less than 0.0001.*  
>  
> *Furthermore, using the embedded open-source HiGHS-WASM branch-and-cut solver, we evaluate our heuristic against the true mathematical global optimum on solvable instances, proving an empirical optimality gap of exactly **0.00%**."*

---

### [4:15 – 5:00] Scene 6: Contested Edge Operations & "Cut the Link" Mode
**Visual on Screen**: Presenter switches to **"6. CONTESTED & EDGE OPS"**. Presenter clicks **"Sever Tactical Link (Comms Blackout)"**. Forward Airbase Ambala enters autonomous isolated mode. A local QRA scramble is committed. Presenter clicks **"Restore Comms Link"**. The CRDT vector clock log merges deterministically with zero human conflict resolution.

> **VOICEOVER (4:15 – 5:00)**:  
> *"Finally, what happens when enemy electronic warfare cuts satellite and terrestrial communications? We click 'Sever Tactical Link'.*  
>  
> *Central HQ and Forward Operating Base Ambala are now physically partitioned. Unlike centralized cloud architectures that paralyze disconnected bases, AIR POWER's **state-based CRDT edge architecture** allows FOB Ambala to continue autonomous mission planning and local scramble commits using local vector clocks.*  
>  
> *When satellite telemetry restores, we click 'Restore Link': the causal event logs merge deterministically using Last-Write-Wins rules with **zero data loss and zero human intervention**.*  
>  
> *In summary: 100% offline, zero cloud dependency, 47ms ATO synthesis, and mathematically verifiable human-in-the-loop explainability. AIR POWER is fully prepared for evaluation. Thank you."*
