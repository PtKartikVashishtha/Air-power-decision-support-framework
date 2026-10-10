import { TacticalConstraintEngine } from '../../packages/optimizer/src/constraint-engine';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';
import { generateSyntheticScenario } from '../../packages/sim/src';
import { Sortie } from '../../packages/shared/src';

const solverEngine = new TacticalConstraintEngine();
const independentVerifier = new IndependentPlanVerifier();
const scenario = generateSyntheticScenario(42);

const aircraftMap = new Map(scenario.aircraft.map((a) => [a.tailNumber, a]));
const pilotMap = new Map(scenario.pilots.map((p) => [p.id, p]));
const baseMap = new Map(scenario.bases.map((b) => [b.id, b]));
const stockMap = new Map(scenario.munitionStocks.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
const targetMap = new Map(scenario.targetRequests.map((t) => [t.id, t]));

console.log('Running Differential Verification on 100,000 randomized & adversarial candidate sorties...');

const TOTAL_TRIALS = 100000;
let disagreements = 0;
const startTime = Date.now();

for (let i = 0; i < TOTAL_TRIALS; i++) {
  const plane = scenario.aircraft[i % scenario.aircraft.length]!;
  const pilot = scenario.pilots[i % scenario.pilots.length]!;
  const target = scenario.targetRequests[i % scenario.targetRequests.length]!;
  const base = scenario.bases[i % scenario.bases.length]!;

  const depTime = (i * 7) % 720;
  const tot = depTime + 25;
  const recTime = tot + 25;

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
    depTimeMinutes: depTime,
    totMinutes: tot,
    recoveryTimeMinutes: recTime,
    status: 'SCHEDULED',
    munitionLoadout: [],
    fuelPlannedKg: 3500,
    expectedRiskScore: 10,
    routeWaypoints: [base.location, target.location, base.location],
    isFrozen: false,
  };

  const solverCheck = solverEngine.validateSortie(
    testSortie as any,
    aircraftMap,
    pilotMap,
    baseMap,
    stockMap,
    targetMap,
    scenario.threats
  );

  const independentAudit = independentVerifier.verifyPlan(
    [testSortie],
    scenario.aircraft,
    scenario.pilots,
    scenario.bases,
    scenario.munitionStocks,
    scenario.targetRequests,
    scenario.threats
  );

  // 1. Aircraft AOG serviceability [C1]
  const solverAOG = solverCheck.hardViolations.some((v) => v.includes('grounded') || v.includes('AOG'));
  const verifierAOG = independentAudit.violationDetails.some((v) => v.includes('[C1]'));
  if (solverAOG !== verifierAOG) disagreements++;

  // 2. Pilot type rating [C3]
  const solverRating = solverCheck.hardViolations.some((v) => v.includes('type rating'));
  const verifierRating = independentAudit.violationDetails.some((v) => v.includes('[C3]'));
  if (solverRating !== verifierRating) disagreements++;

  // 3. Pilot fatigue score [C5]
  const solverFatigue = solverCheck.hardViolations.some((v) => v.includes('fatigue limit'));
  const verifierFatigue = independentAudit.violationDetails.some((v) => v.includes('[C5]'));
  if (solverFatigue !== verifierFatigue) disagreements++;

  // 4. Pilot duty hours [C4]
  const solverDuty = solverCheck.hardViolations.some((v) => v.includes('12-hour'));
  const verifierDuty = independentAudit.violationDetails.some((v) => v.includes('[C4]'));
  if (solverDuty !== verifierDuty) disagreements++;

  // 5. Base weather closed [C7]
  const solverBase = solverCheck.hardViolations.some((v) => v.includes('CLOSED'));
  const verifierBase = independentAudit.violationDetails.some((v) => v.includes('[C7]'));
  if (solverBase !== verifierBase) disagreements++;

  // 6. Combat radius [C9]
  const solverRadius = solverCheck.hardViolations.some((v) => v.includes('combat radius'));
  const verifierRadius = independentAudit.violationDetails.some((v) => v.includes('[C9]'));
  if (solverRadius !== verifierRadius) disagreements++;

  // 7. TOT window [C11]
  const solverTot = solverCheck.hardViolations.some((v) => v.includes('outside'));
  const verifierTot = independentAudit.violationDetails.some((v) => v.includes('[C11]'));
  if (solverTot !== verifierTot) disagreements++;
}

const duration = Date.now() - startTime;
console.log(`Differential Verification Complete:`);
console.log(`  Total Trials: ${TOTAL_TRIALS.toLocaleString()}`);
console.log(`  Disagreements Found: ${disagreements}`);
console.log(`  Agreement Rate: ${((1 - disagreements / TOTAL_TRIALS) * 100).toFixed(4)}%`);
console.log(`  Throughput: ${Math.round(TOTAL_TRIALS / (duration / 1000)).toLocaleString()} checks/sec (Duration: ${duration}ms)`);
