import { TacticalConstraintEngine } from '../../packages/optimizer/src/constraint-engine';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';
import { generateSyntheticScenario } from '../../packages/sim/src';
import { Sortie, haversineDistanceKm } from '../../packages/shared/src';

const solverEngine = new TacticalConstraintEngine();
const independentVerifier = new IndependentPlanVerifier();
const scenario = generateSyntheticScenario(42);

const aircraftMap = new Map(scenario.aircraft.map((a) => [a.tailNumber, a]));
const pilotMap = new Map(scenario.pilots.map((p) => [p.id, p]));
const baseMap = new Map(scenario.bases.map((b) => [b.id, b]));
const stockMap = new Map(scenario.munitionStocks.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
const targetMap = new Map(scenario.targetRequests.map((t) => [t.id, t]));

for (let i = 0; i < 1000; i++) {
  const plane = scenario.aircraft[i % scenario.aircraft.length]!;
  const pilot = scenario.pilots[i % scenario.pilots.length]!;
  const target = scenario.targetRequests[i % scenario.targetRequests.length]!;
  const base = scenario.bases[i % scenario.bases.length]!;

  const testSortie: Sortie = {
    sortieId: `DIFF-SRT-${i}`,
    callsign: `DIFF-${plane.tailNumber}`,
    packageId: `DIFF-PKG-${target.id}`,
    targetRequestId: target.id,
    role: plane.roles[0] as any,
    aircraftTail: plane.tailNumber,
    pilotId: pilot.id,
    originBaseId: base.id,
    recoveryBaseId: base.id,
    depTimeMinutes: 100,
    totMinutes: 120,
    recoveryTimeMinutes: 140,
    status: 'SCHEDULED',
    munitionLoadout: [],
    fuelPlannedKg: 3500,
    expectedRiskScore: 10,
    routeWaypoints: [base.location, target.location, base.location],
    isFrozen: false,
  };

  const solverCheck = solverEngine.validateSortie(testSortie as any, aircraftMap, pilotMap, baseMap, stockMap, targetMap, scenario.threats);
  const independentAudit = independentVerifier.verifyPlan([testSortie], scenario.aircraft, scenario.pilots, scenario.bases, scenario.munitionStocks, scenario.targetRequests, scenario.threats);

  const solverRadius = solverCheck.hardViolations.some((v) => v.includes('combat radius'));
  const verifierRadius = independentAudit.violationDetails.some((v) => v.includes('[C9]'));

  if (solverRadius !== verifierRadius) {
    const oneWay = haversineDistanceKm(base.location, target.location);
    console.log(`Trial ${i} radius mismatch: plane=${plane.model}, combatRadius=${plane.combatRadiusKm}, roundtrip=${Math.round(oneWay * 2)}km`);
    console.log(`  solverRadius=${solverRadius}, violations=`, solverCheck.hardViolations);
    console.log(`  verifierRadius=${verifierRadius}, violations=`, independentAudit.violationDetails);
    break;
  }
}
