import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
  MUNITION_CATALOG,
} from '../../packages/shared/src';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const verifier = new IndependentPlanVerifier();
const opt = new AlnsTacticalOptimizer();
const sc = generateSyntheticScenario(42);
const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

const wPrio = 1.0;
const wRisk = 0.5;
const wFuel = 0.0001;

const calcObj = (sorties: Sortie[]): number => {
  let prioSum = 0;
  let riskSum = 0;
  let fuelSum = 0;
  const coveredTgtIds = new Set(sorties.map((s) => s.targetRequestId));
  for (const t of sc.targetRequests) {
    if (coveredTgtIds.has(t.id)) prioSum += t.priority;
  }
  for (const s of sorties) {
    riskSum += s.expectedRiskScore;
    fuelSum += s.fuelPlannedKg;
  }
  return prioSum * wPrio - (riskSum / Math.max(1, sorties.length)) * 10 * wRisk - (fuelSum / 1000) * wFuel;
};

const curObj = calcObj(plan.sorties);
console.log('Current plan objective:', curObj);

// Let's test the 6 swaps found earlier:
// PKG-010 from BASE_JODHPUR -> BASE_HALWARA for target TGT-026
const pkgId = 'PKG-010';
const pkgSorties = plan.sorties.filter((s) => s.packageId === pkgId);
const target = sc.targetRequests.find((t) => t.id === 'TGT-026')!;
const altBase = sc.bases.find((b) => b.id === 'BASE_HALWARA')!;
const dist = haversineDistanceKm(altBase.location, target.location);
const remainingSorties = plan.sorties.filter((s) => s.packageId !== pkgId);

const candidatePlanes = sc.aircraft.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
const candidatePilots = sc.pilots.filter((p) => p.baseId === altBase.id && p.status === 'READY');

const newPkg: Sortie[] = [];
const usedTails = new Set<string>();
const usedPilots = new Set<string>();

for (const s of pkgSorties) {
  const plane = candidatePlanes.find((a) => {
    if (!a.roles.includes(s.role) || usedTails.has(a.tailNumber)) return false;
    const flightMin = Math.round((dist / a.cruiseSpeedKmh) * 60);
    const dep = Math.max(0, s.totMinutes - flightMin);
    const rec = s.totMinutes + flightMin;
    const turnaround = a.turnaroundTimeMinutes || 35;
    for (const prev of remainingSorties.filter((st) => st.aircraftTail === a.tailNumber)) {
      if (dep < prev.recoveryTimeMinutes + turnaround && rec > prev.depTimeMinutes - turnaround) return false;
    }
    return true;
  })!;
  const flightMin = Math.round((dist / plane.cruiseSpeedKmh) * 60);
  const dep = Math.max(0, s.totMinutes - flightMin);
  const rec = s.totMinutes + flightMin;

  const pilot = candidatePilots.find((p) => {
    if (p.typeRating !== plane.model || usedPilots.has(p.id)) return false;
    for (const prev of remainingSorties.filter((st) => st.pilotId === p.id)) {
      if (dep < prev.recoveryTimeMinutes + 45 && rec > prev.depTimeMinutes - 45) return false;
    }
    return true;
  })!;

  const munItem = MUNITION_CATALOG.find((m) => m.category === 'PRECISION_GUIDED_BOMB' && m.compatibleModels.includes(plane.model))!;

  usedTails.add(plane.tailNumber);
  usedPilots.add(pilot.id);

  newPkg.push({
    ...s,
    originBaseId: altBase.id,
    recoveryBaseId: altBase.id,
    aircraftTail: plane.tailNumber,
    pilotId: pilot.id,
    depTimeMinutes: dep,
    recoveryTimeMinutes: rec,
    fuelPlannedKg: Math.round(dist * 2 * 1.9),
    expectedRiskScore: calculateRouteRisk([altBase.location, target.location, altBase.location], sc.threats),
    routeWaypoints: [altBase.location, target.location, altBase.location],
    munitionLoadout: [{ munitionId: munItem.id, count: 2 }],
  });
}

const testPlan = remainingSorties.concat(newPkg);
const newObj = calcObj(testPlan);
console.log('New plan objective:', newObj, 'Delta:', newObj - curObj);

// Print risk and fuel delta:
const oldRisk = pkgSorties.reduce((a,b) => a + b.expectedRiskScore, 0);
const newRisk = newPkg.reduce((a,b) => a + b.expectedRiskScore, 0);
const oldFuel = pkgSorties.reduce((a,b) => a + b.fuelPlannedKg, 0);
const newFuel = newPkg.reduce((a,b) => a + b.fuelPlannedKg, 0);
console.log('Old risk:', oldRisk, 'New risk:', newRisk);
console.log('Old fuel:', oldFuel, 'New fuel:', newFuel);
