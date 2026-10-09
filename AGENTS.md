# AGENTS.md — Rules & Operational Guidelines for Autonomous Agents

1. **Always Read `CONTEXT.md` First**: Before making any architectural choice, check `CONTEXT.md` for current progress, decisions, and constraints.
2. **Update `CONTEXT.md` After Every Milestone**: Keep the checklist, recent decisions, and file map updated.
3. **Never Break `pnpm run test` or `pnpm run demo`**: All code must compile cleanly and pass automated unit/property tests.
4. **Zero Python in the Runtime Path**: All runtime code, microservices, and solvers must execute in Node.js / TypeScript.
5. **Keep All Data Synthetic & Unclassified**: Never use real military callsigns, real defense deployments, or classified weapon tables. Maintain the "NOTIONAL / TRAINING DATA" banner on all views.
6. **Prioritize Explainability**: Every assignment made by the optimizer must have an explicit reason code and constraint compliance score.
7. **Maintain Human-in-the-Loop Doctrine**: The AI recommends Courses of Action; the human commander approves or modifies.
8. **Visual Excellence**: The UI must look like an elite defense command center (dark glassmorphism, precise military typography, crisp tactical symbology, responsive animations).
9. **Zero Unsubstantiated Claims**: Every number or claim in UI/docs must trace to `docs/CLAIMS_REGISTER.md` with an exact reproducible command. Never use "proven" for empirical results; state "verified by independent checker on N plans / M seeds".
10. **Commitment to Baseline Rigour**: Never use strawman baselines; present credible human-heuristic models, state assumptions with sensitivity analysis, and acknowledge limitations honestly.

