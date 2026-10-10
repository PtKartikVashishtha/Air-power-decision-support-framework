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

for (const seed of [42, 101, 777, 1337, 9999]) {
  const sc = generateSyntheticScenario(seed);
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

  const initialObj = calcObj(plan.sorties);
  let currentSorties = [...plan.sorties];
  let successfulReassignments = 0;

  // Group sorties by package
  const packages = Array.from(new Set(currentSorties.map((s) => s.packageId)));

  for (const pkgId of packages) {
    const pkgSorties = currentSorties.filter((s) => s.packageId === pkgId);
    const targetId = pkgSorties[0]?.targetRequestId;
    const target = sc.targetRequests.find((t) => t.id === targetId);
    if (!target) continue;

    const currentOrigin = pkgSorties[0]?.originBaseId;
    const curBase = sc.bases.find((b) => b.id === currentOrigin);
    if (!curBase) continue;

    const curDist = haversineDistanceKm(curBase.location, target.location);

    // Try other bases that are closer or have lower threat route
    for (const altBase of sc.bases) {
      if (altBase.id === currentOrigin || altBase.currentWeatherStatus === 'CLOSED') continue;
      const altDist = haversineDistanceKm(altBase.location, target.location);
      if (altDist > curDist * 1.2) continue; // Only try competitive bases

      // Check if altBase has enough FMC aircraft and pilots for all roles in package
      const candidatePlanes = sc.aircraft.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
      const candidatePilots = sc.pilots.filter((p) => p.baseId === altBase.id && p.status === 'READY' && p.fatigueScore <= 65);

      // Check roles
      let feasible = true;
      const newPkg: Sortie[] = [];
      const usedTails = new Set<string>();
      const usedPilots = new Set<string>();

      for (const s of pkgSorties) {
        const plane = candidatePlanes.find(
          (a) => a.roles.includes(s.role) && !usedTails.has(a.tailNumber) && a.combatRadiusKm * 1.8 >= altDist * 2
        );
        if (!plane) { feasible = false; break; }

        const pilot = candidatePilots.find(
          (p) => p.typeRating === plane.model && !usedPilots.has(p.id)
        );
        if (!pilot) { feasible = false; break; }

        usedTails.add(plane.tailNumber);
        usedPilots.add(pilot.id);

        const flightMin = Math.round((altDist / plane.cruiseSpeedKmh) * 60);
        const dep = Math.max(0, s.totMinutes - flightMin);
        const rec = s.totMinutes + flightMin;
        const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
        const newFuel = Math.round(altDist * 2 * burnRate);
        const waypoints = [altBase.location, target.location, altBase.location];
        const newRisk = calculateRouteRisk(waypoints, sc.threats);

        newPkg.push({
          ...s,
          originBaseId: altBase.id,
          recoveryBaseId: altBase.id,
          aircraftTail: plane.tailNumber,
          pilotId: pilot.id,
          depTimeMinutes: dep,
          recoveryTimeMinutes: rec,
          fuelPlannedKg: newFuel,
          expectedRiskScore: newRisk,
          routeWaypoints: waypoints,
        });
      }

      if (feasible && newPkg.length === pkgSorties.length) {
        const candidatePlan = currentSorties.filter((s) => s.packageId !== pkgId).concat(newPkg);
        const audit = verifier.verifyPlan(
          candidatePlan,
          sc.aircraft,
          sc.pilots,
          sc.bases,
          sc.munitionStocks,
          sc.targetRequests,
          sc.threats
        );

        if (audit.totalViolations === 0) {
          const candObj = calcObj(candidatePlan);
          if (candObj > calcObj(currentSorties)) {
            currentSorties = candidatePlan;
            successfulReassignments++;
            break;
          }
        }
      }
    }
  }

  const finalObj = calcObj(currentSorties);
  const gain = Math.round(((finalObj - initialObj) / initialObj) * 1000) / 10;
  console.log(`Seed ${seed}: initialObj=${Math.round(initialObj*10)/10} -> finalObj=${Math.round(finalObj*10)/10} (Gain: +${gain}%), baseReassignments=${successfulReassignments}`);
}
