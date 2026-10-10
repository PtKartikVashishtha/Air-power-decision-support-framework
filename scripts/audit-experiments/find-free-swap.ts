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

const packages = Array.from(new Set(plan.sorties.map((s) => s.packageId)));
console.log('Testing free aircraft assignment:');

for (const pkgId of packages) {
  const pkgSorties = plan.sorties.filter((s) => s.packageId === pkgId);
  const targetId = pkgSorties[0]?.targetRequestId;
  const target = sc.targetRequests.find((t) => t.id === targetId)!;
  const currentOrigin = pkgSorties[0]?.originBaseId;
  const remainingSorties = plan.sorties.filter((s) => s.packageId !== pkgId);

  for (const altBase of sc.bases) {
    if (altBase.id === currentOrigin || altBase.currentWeatherStatus === 'CLOSED') continue;
    const dist = haversineDistanceKm(altBase.location, target.location);

    const candidatePlanes = sc.aircraft.filter((a) => a.baseId === altBase.id && a.status === 'FMC');
    const candidatePilots = sc.pilots.filter((p) => p.baseId === altBase.id && p.status === 'READY');

    let feasible = true;
    const newPkg: Sortie[] = [];
    const usedTailsInPkg = new Set<string>();
    const usedPilotsInPkg = new Set<string>();

    for (const s of pkgSorties) {
      const plane = candidatePlanes.find((a) => {
        if (!a.roles.includes(s.role) || usedTailsInPkg.has(a.tailNumber)) return false;
        if (a.combatRadiusKm * 1.8 < dist * 2) return false;

        const flightMin = Math.round((dist / a.cruiseSpeedKmh) * 60);
        const dep = Math.max(0, s.totMinutes - flightMin);
        const rec = s.totMinutes + flightMin;
        const turnaround = a.turnaroundTimeMinutes || 35;

        // Check against all remaining sorties
        const acSorties = remainingSorties.filter((st) => st.aircraftTail === a.tailNumber);
        for (const prev of acSorties) {
          if (dep < prev.recoveryTimeMinutes + turnaround && rec > prev.depTimeMinutes - turnaround) {
            return false;
          }
        }
        return true;
      });

      if (!plane) { feasible = false; break; }

      const flightMin = Math.round((dist / plane.cruiseSpeedKmh) * 60);
      const dep = Math.max(0, s.totMinutes - flightMin);
      const rec = s.totMinutes + flightMin;

      const pilot = candidatePilots.find((p) => {
        if (p.typeRating !== plane.model || usedPilotsInPkg.has(p.id)) return false;
        const pilotSorties = remainingSorties.filter((st) => st.pilotId === p.id);
        for (const prev of pilotSorties) {
          if (dep < prev.recoveryTimeMinutes + 45 && rec > prev.depTimeMinutes - 45) {
            return false;
          }
        }
        return true;
      });

      if (!pilot) { feasible = false; break; }

      // Check munitions compatibility
      const desiredMunCat = target.desiredMunitions[0] || 'PRECISION_GUIDED_BOMB';
      const munItem = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(plane.model));
      if (!munItem) { feasible = false; break; }

      usedTailsInPkg.add(plane.tailNumber);
      usedPilotsInPkg.add(pilot.id);

      const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
      newPkg.push({
        ...s,
        originBaseId: altBase.id,
        recoveryBaseId: altBase.id,
        aircraftTail: plane.tailNumber,
        pilotId: pilot.id,
        depTimeMinutes: dep,
        recoveryTimeMinutes: rec,
        fuelPlannedKg: Math.round(dist * 2 * burnRate),
        expectedRiskScore: calculateRouteRisk([altBase.location, target.location, altBase.location], sc.threats),
        routeWaypoints: [altBase.location, target.location, altBase.location],
        munitionLoadout: [{ munitionId: munItem.id, count: 2 }],
      });
    }

    if (feasible && newPkg.length === pkgSorties.length) {
      const testPlan = remainingSorties.concat(newPkg);
      const audit = verifier.verifyPlan(testPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
      if (audit.totalViolations === 0) {
        console.log(`FOUND VALID BASE REASSIGNMENT! Pkg: ${pkgId} from ${currentOrigin} -> ${altBase.id} for target ${target.id}`);
      }
    }
  }
}
console.log('Search complete.');
