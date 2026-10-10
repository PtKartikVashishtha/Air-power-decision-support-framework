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

const coveredIds = new Set(plan.sorties.map((s) => s.targetRequestId));
const uncoveredTargets = sc.targetRequests.filter((t) => !coveredIds.has(t.id));
const coveredTargets = sc.targetRequests.filter((t) => coveredIds.has(t.id));

console.log('Testing Knapsack Exchange on Seed 101:');

for (const unc of uncoveredTargets) {
  // Find covered targets that have LOWER priority than unc
  const lowerCovered = coveredTargets.filter((c) => c.priority < unc.priority);

  for (const low of lowerCovered) {
    const withoutLow = plan.sorties.filter((s) => s.targetRequestId !== low.id);

    // Try to schedule unc
    const rolesNeeded: Array<{ role: Sortie['role']; munType?: string }> = [];
    for (let i = 0; i < unc.requiredPackage.strikeSorties; i++) rolesNeeded.push({ role: 'OMNIROLE_STRIKE', munType: unc.desiredMunitions[0] });
    for (let i = 0; i < unc.requiredPackage.seadSorties; i++) rolesNeeded.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
    for (let i = 0; i < unc.requiredPackage.escortSorties; i++) rolesNeeded.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });

    for (let tot = unc.totStartMinutes; tot <= unc.totEndMinutes; tot += 10) {
      const candidatePkg: Sortie[] = [];
      const trialPlan = [...withoutLow];
      let feasible = true;

      for (const slot of rolesNeeded) {
        let assigned = false;
        for (const base of sc.bases) {
          if (base.currentWeatherStatus === 'CLOSED') continue;
          const distKm = haversineDistanceKm(base.location, unc.location);
          const candidatePlanes = sc.aircraft.filter((a) => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role));

          for (const plane of candidatePlanes) {
            if (distKm * 2 > plane.combatRadiusKm * 1.8) continue;
            const fltMin = Math.round((distKm / plane.cruiseSpeedKmh) * 60);
            const dep = Math.max(0, tot - fltMin);
            const rec = tot + fltMin;
            const turnaround = plane.turnaroundTimeMinutes || 35;

            let planeFree = true;
            for (const st of trialPlan.filter((s) => s.aircraftTail === plane.tailNumber)) {
              if (dep < st.recoveryTimeMinutes + turnaround && rec > st.depTimeMinutes - turnaround) {
                planeFree = false;
                break;
              }
            }
            if (!planeFree) continue;

            const hour = Math.floor(dep / 60);
            const hourlyDep = trialPlan.filter((s) => s.originBaseId === base.id && Math.floor(s.depTimeMinutes / 60) === hour).length;
            if (hourlyDep >= base.maxSortiePerHour) continue;

            const pilot = sc.pilots.find((p) => {
              if (p.baseId !== base.id || p.status !== 'READY' || p.typeRating !== plane.model || p.fatigueScore > 65) return false;
              for (const st of trialPlan.filter((s) => s.pilotId === p.id)) {
                if (dep < st.recoveryTimeMinutes + 45 && rec > st.depTimeMinutes - 45) return false;
              }
              return true;
            });
            if (!pilot) continue;

            const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
            const mun = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(plane.model));
            if (!mun) continue;

            const burnRate = AIRCRAFT_MODEL_SPECS[plane.model]?.burnRateKgPerKm || 2.5;
            const waypoints = [base.location, unc.location, base.location];
            const newSortie: Sortie = {
              sortieId: `SRT-K-${candidatePkg.length + 1}`,
              callsign: `VAYU-${pilot.callsign.split('-')[0]}-K`,
              packageId: `PKG-K-${unc.id}`,
              targetRequestId: unc.id,
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
              justificationNotes: 'Knapsack upgrade',
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
        const fullPlan = withoutLow.concat(candidatePkg);
        const audit = verifier.verifyPlan(fullPlan, sc.aircraft, sc.pilots, sc.bases, sc.munitionStocks, sc.targetRequests, sc.threats);
        if (audit.totalViolations === 0) {
          console.log(`FOUND IMPROVING KNAPSACK SWAP! Dropped ${low.id} (p=${low.priority}), Added ${unc.id} (p=${unc.priority})! Net prio gain: +${unc.priority - low.priority}`);
          break;
        }
      }
    }
  }
}
