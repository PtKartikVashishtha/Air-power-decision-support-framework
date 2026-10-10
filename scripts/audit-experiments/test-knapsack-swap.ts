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
const sc = generateSyntheticScenario(101);
const plan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats);

console.log('Seed 101 initial plan sorties:', plan.sorties.length);
console.log('Covered targets:', plan.kpis.coveredTargetsCount);

// Target TGT-004 (p=84) is uncovered.
const t4 = sc.targetRequests.find((t) => t.id === 'TGT-004')!;
console.log('TGT-004:', t4);

// Lowest covered target is TGT-024 (p=62)
const t24 = sc.targetRequests.find((t) => t.id === 'TGT-024')!;
console.log('TGT-024:', t24);

// Let's drop TGT-024 package from the plan:
const without24 = plan.sorties.filter((s) => s.targetRequestId !== t24.id);

// Now try to schedule TGT-004 into without24:
const openBases = sc.bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');
const rolesNeeded: Array<{ role: Sortie['role']; munType?: string }> = [];
for (let i = 0; i < t4.requiredPackage.strikeSorties; i++) rolesNeeded.push({ role: 'OMNIROLE_STRIKE', munType: t4.desiredMunitions[0] });
for (let i = 0; i < t4.requiredPackage.seadSorties; i++) rolesNeeded.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
for (let i = 0; i < t4.requiredPackage.escortSorties; i++) rolesNeeded.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });

console.log('Roles needed for TGT-004:', rolesNeeded.length);

// Try candidate TOTs within TGT-004 window [120, 180]
let bestPkg: Sortie[] | null = null;

for (let tot = t4.totStartMinutes; tot <= t4.totEndMinutes; tot += 5) {
  const candidatePkg: Sortie[] = [];
  const trialPlan = [...without24];
  let feasible = true;

  for (const slot of rolesNeeded) {
    let assigned = false;
    for (const base of openBases) {
      const distKm = haversineDistanceKm(base.location, t4.location);
      const candidatePlanes = sc.aircraft.filter((a) => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role));

      for (const plane of candidatePlanes) {
        if (distKm * 2 > plane.combatRadiusKm * 1.8) continue;
        const fltMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);
        const dep = Math.max(0, tot - fltMin);
        const rec = tot + fltMin;
        const turnaround = plane.turnaroundTimeMinutes || 35;

        // Check turnaround on trialPlan
        let planeFree = true;
        for (const st of trialPlan.filter((s) => s.aircraftTail === plane.tailNumber)) {
          if (dep < st.recoveryTimeMinutes + turnaround && rec > st.depTimeMinutes - turnaround) {
            planeFree = false;
            break;
          }
        }
        if (!planeFree) continue;

        // Check hourly capacity
        const hour = Math.floor(dep / 60);
        const hourlyDep = trialPlan.filter((s) => s.originBaseId === base.id && Math.floor(s.depTimeMinutes / 60) === hour).length;
        if (hourlyDep >= base.maxSortiePerHour) continue;

        // Find pilot
        const pilot = sc.pilots.find((p) => {
          if (p.baseId !== base.id || p.status !== 'READY' || p.typeRating !== plane.model || p.fatigueScore > 65) return false;
          for (const st of trialPlan.filter((s) => s.pilotId === p.id)) {
            if (dep < st.recoveryTimeMinutes + 45 && rec > st.depTimeMinutes - 45) return false;
          }
          return true;
        });
        if (!pilot) continue;

        // Compatible munition
        const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
        const mun = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(plane.model));
        if (!mun) continue;

        const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
        const waypoints = [base.location, t4.location, base.location];
        const newSortie: Sortie = {
          sortieId: `SRT-KNAP-${candidatePkg.length + 1}`,
          callsign: `VAYU-${pilot.callsign.split('-')[0]}-K`,
          packageId: `PKG-KNAP-${t4.id}`,
          targetRequestId: t4.id,
          role: slot.role,
          aircraftTail: plane.tailNumber,
          pilotId: pilot.id,
          originBaseId: base.id,
          recoveryBaseId: base.id,
          munitionLoadout: [{ munitionId: mun.id, count: 2 }],
          depTimeMinutes: dep,
          totMinutes: tot,
          recoveryTimeMinutes: rec,
          fuelPlannedKg: Math.round(distKm * 2 * burnRate),
          routeWaypoints: waypoints,
          expectedRiskScore: calculateRouteRisk(waypoints, sc.threats),
          status: 'SCHEDULED',
          isFrozen: false,
          justificationNotes: 'Knapsack ALNS upgrade',
        };

        candidatePkg.push(newSortie);
        trialPlan.push(newSortie);
        assigned = true;
        break;
      }
      if (assigned) break;
    }
    if (!assigned) {
      feasible = false;
      break;
    }
  }

  if (feasible && candidatePkg.length === rolesNeeded.length) {
    const fullPlan = without24.concat(candidatePkg);
    const audit = verifier.verifyPlan(fullPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
    if (audit.totalViolations === 0) {
      console.log(`SUCCESS! Scheduled TGT-004 at TOT=${tot}! Total violations: 0!`);
      bestPkg = candidatePkg;
      break;
    }
  }
}

if (bestPkg) {
  console.log('Knapsack exchange succeeded! Replaced TGT-024 (p=62) with TGT-004 (p=84)! Net priority gain: +22!');
} else {
  console.log('Could not schedule TGT-004 by dropping only TGT-024.');
}
