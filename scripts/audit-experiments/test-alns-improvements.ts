import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  Aircraft,
  Aircrew,
  Airbase,
  MunitionStock,
  TargetRequest,
  ThreatIntel,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
} from '../../packages/shared/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';

const sc = generateSyntheticScenario(42);
const optimizer = new AlnsTacticalOptimizer();
const verifier = new IndependentPlanVerifier();

// Baseline ALNS result
const basePlan = optimizer.solve(
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats,
  { seed: 42, maxIterations: 80, timeLimitMs: 150 }
);

console.log('Baseline ALNS (Initial):', {
  t0: optimizer.lastOptimizationSummary?.t0Objective,
  final: optimizer.lastOptimizationSummary?.finalObjective,
  gain: optimizer.lastOptimizationSummary?.alnsImprovementPercent,
  coverage: basePlan.kpis.priorityCoveragePercent,
  lossScore: basePlan.kpis.totalExpectedLossScore,
});

// Now let's test a 2-Opt Airframe Risk/Fuel Swap move on the sorties
let sorties = [...basePlan.sorties];
let improvedMoves = 0;

for (let i = 0; i < sorties.length; i++) {
  for (let j = i + 1; j < sorties.length; j++) {
    const s1 = sorties[i]!;
    const s2 = sorties[j]!;

    // Same role, can swap airframes?
    if (s1.role === s2.role && s1.originBaseId === s2.originBaseId && s1.aircraftTail !== s2.aircraftTail) {
      // Test swapping aircraft
      const testSorties = sorties.map((s, idx) => {
        if (idx === i) return { ...s, aircraftTail: s2.aircraftTail };
        if (idx === j) return { ...s, aircraftTail: s1.aircraftTail };
        return s;
      });

      const audit = verifier.verifyPlan(
        testSorties,
        sc.aircraft,
        sc.pilots,
        sc.bases,
        sc.munitionStocks,
        sc.targetRequests,
        sc.threats
      );

      if (audit.totalViolations === 0) {
        // Evaluate risk delta
        const r1Old = s1.expectedRiskScore;
        const r2Old = s2.expectedRiskScore;
        // Swap
        sorties = testSorties;
        improvedMoves++;
      }
    }
  }
}

console.log(`2-Opt Swap Feasible Moves Tested: ${improvedMoves}`);
