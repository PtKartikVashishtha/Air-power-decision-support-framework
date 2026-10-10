import { generateSyntheticScenario } from '../../packages/sim/src';
import {
  Sortie,
  haversineDistanceKm,
  calculateRouteRisk,
  AIRCRAFT_MODEL_SPECS,
} from '../../packages/shared/src';
import { IndependentPlanVerifier } from '../../packages/optimizer/src/independent-verifier';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const verifier = new IndependentPlanVerifier();
const opt = new AlnsTacticalOptimizer();
const sc = generateSyntheticScenario(42);
const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

const packages = Array.from(new Set(plan.sorties.map((s) => s.packageId)));
for (const pkgId of packages.slice(0, 5)) {
  const pkgSorties = plan.sorties.filter((s) => s.packageId === pkgId);
  const targetId = pkgSorties[0]?.targetRequestId;
  const target = sc.targetRequests.find((t) => t.id === targetId)!;
  const currentOrigin = pkgSorties[0]?.originBaseId;

  console.log(`Package ${pkgId} for target ${target.id} (origin: ${currentOrigin})`);

  for (const altBase of sc.bases) {
    if (altBase.id === currentOrigin) continue;
    const dist = haversineDistanceKm(altBase.location, target.location);
    const candidatePlanes = sc.aircraft.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
    const candidatePilots = sc.pilots.filter((p) => p.baseId === altBase.id && p.status === 'READY');

    let feasible = true;
    const newPkg: Sortie[] = [];
    const usedTails = new Set<string>();
    const usedPilots = new Set<string>();

    for (const s of pkgSorties) {
      const plane = candidatePlanes.find(
        (a) => a.roles.includes(s.role) && !usedTails.has(a.tailNumber) && a.combatRadiusKm * 1.8 >= dist * 2
      );
      if (!plane) { feasible = false; break; }
      const pilot = candidatePilots.find((p) => p.typeRating === plane.model && !usedPilots.has(p.id));
      if (!pilot) { feasible = false; break; }

      usedTails.add(plane.tailNumber);
      usedPilots.add(pilot.id);

      const flightMin = Math.round((dist / plane.cruiseSpeedKmh) * 60);
      newPkg.push({
        ...s,
        originBaseId: altBase.id,
        recoveryBaseId: altBase.id,
        aircraftTail: plane.tailNumber,
        pilotId: pilot.id,
        depTimeMinutes: Math.max(0, s.totMinutes - flightMin),
        recoveryTimeMinutes: s.totMinutes + flightMin,
        fuelPlannedKg: Math.round(dist * 2 * (AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5)),
        expectedRiskScore: calculateRouteRisk([altBase.location, target.location, altBase.location], sc.threats),
        routeWaypoints: [altBase.location, target.location, altBase.location],
      });
    }

    if (!feasible) {
      console.log(`  -> AltBase ${altBase.id}: no planes/pilots for roles`);
      continue;
    }

    const testPlan = plan.sorties.filter((s) => s.packageId !== pkgId).concat(newPkg);
    const audit = verifier.verifyPlan(testPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
    console.log(`  -> AltBase ${altBase.id}: violations=${audit.totalViolations}`);
    if (audit.totalViolations > 0) {
      console.log(`     Sample violation: ${audit.violationDetails[0]}`);
      console.log(`     Sample violation 2: ${audit.violationDetails[1]}`);
    }
  }
}
