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

const counts = { aog: 0, rating: 0, fatigue: 0, duty: 0, base: 0, radius: 0, tot: 0 };

for (let i = 0; i < 1000; i++) {
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

  const solverAOG = solverCheck.hardViolations.some((v) => v.includes('grounded') || v.includes('AOG'));
  const verifierAOG = independentAudit.violationDetails.some((v) => v.includes('[C1]'));
  if (solverAOG !== verifierAOG) counts.aog++;

  const solverRating = solverCheck.hardViolations.some((v) => v.includes('type rating'));
  const verifierRating = independentAudit.violationDetails.some((v) => v.includes('[C3]'));
  if (solverRating !== verifierRating) counts.rating++;

  const solverFatigue = solverCheck.hardViolations.some((v) => v.includes('fatigue limit'));
  const verifierFatigue = independentAudit.violationDetails.some((v) => v.includes('[C5]'));
  if (solverFatigue !== verifierFatigue) counts.fatigue++;

  const solverDuty = solverCheck.hardViolations.some((v) => v.includes('12-hour'));
  const verifierDuty = independentAudit.violationDetails.some((v) => v.includes('[C4]'));
  if (solverDuty !== verifierDuty) counts.duty++;

  const solverBase = solverCheck.hardViolations.some((v) => v.includes('CLOSED'));
  const verifierBase = independentAudit.violationDetails.some((v) => v.includes('[C7]'));
  if (solverBase !== verifierBase) counts.base++;

  const solverRadius = solverCheck.hardViolations.some((v) => v.includes('exceeds'));
  const verifierRadius = independentAudit.violationDetails.some((v) => v.includes('[C9]'));
  if (solverRadius !== verifierRadius) counts.radius++;

  const solverTot = solverCheck.hardViolations.some((v) => v.includes('TOT') && v.includes('outside'));
  const verifierTot = independentAudit.violationDetails.some((v) => v.includes('[C11]'));
  if (solverTot !== verifierTot) counts.tot++;
}

console.log('Disagreement breakdown across 1000 trials:', counts);
