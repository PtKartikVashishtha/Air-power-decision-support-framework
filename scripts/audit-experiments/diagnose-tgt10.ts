import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm, AIRCRAFT_MODEL_SPECS, MUNITION_CATALOG, Sortie } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const bases = sc.bases;
const aircraftList = sc.aircraft;
const pilotsList = sc.pilots;
const munitionList = sc.munitionStocks;
const targetsList = sc.targetRequests;
const threatsList = sc.threats;

const availableAircraft = aircraftList.filter((a) => a.status === 'FMC');
const availablePilots = pilotsList.filter((p) => p.status === 'READY' && p.fatigueScore <= 65);
const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

const aircraftSortieTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
const pilotSortieTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
const stockInventory = new Map((munitionList || []).map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
const baseHourlySorties = new Map<string, number>();

const sortedTargets = [...targetsList].sort((a, b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);

for (const target of sortedTargets) {
  const neededRoles: Array<{ role: Sortie['role']; munType?: string }> = [];

  for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
    neededRoles.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
  }
  for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
    neededRoles.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
  }
  for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
    neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
  }

  const packageSorties: any[] = [];
  let packageFeasible = true;

  for (const slot of neededRoles) {
    let bestCandidate: any = null;

    for (const base of openBases) {
      const distKm = haversineDistanceKm(base.location, target.location);
      const roundtripDistKm = distKm * 2;
      const candidatePlanes = availableAircraft.filter((a) => a.baseId === base.id && a.roles.includes(slot.role));

      for (const ac of candidatePlanes) {
        if (roundtripDistKm > ac.combatRadiusKm * 1.8) {
          if (target.id === 'TGT-010') console.log(`  [TGT-010] ${ac.tailNumber} at ${base.id} rejected: radius (${roundtripDistKm} > ${ac.combatRadiusKm * 1.8})`);
          continue;
        }
        const flightTimeOneWayMin = Math.round((distKm / ac.cruiseSpeedKmh) * 60);
        const tot = Math.round((target.totStartMinutes + target.totEndMinutes) / 2);
        const depTime = Math.max(0, tot - flightTimeOneWayMin);
        const recTime = tot + flightTimeOneWayMin;

        const acHistory = aircraftSortieTimeline.get(ac.tailNumber) || [];
        let acAvailable = true;
        for (const prev of acHistory) {
          const turnaround = ac.turnaroundTimeMinutes || 35;
          if (depTime < prev.rec + turnaround && recTime > prev.dep - turnaround) {
            acAvailable = false;
            if (target.id === 'TGT-010') console.log(`  [TGT-010] ${ac.tailNumber} turnaround conflict: dep=${depTime}, rec=${recTime}, prev=[${prev.dep}, ${prev.rec}]`);
            break;
          }
        }
        if (!acAvailable) continue;

        const hourSlot = Math.floor(depTime / 60);
        const slotKey = `${base.id}_${hourSlot}`;
        const currentSlotSorties = baseHourlySorties.get(slotKey) || 0;
        if (currentSlotSorties >= base.maxSortiePerHour) {
          if (target.id === 'TGT-010') console.log(`  [TGT-010] base ${base.id} runway slot full at hour ${hourSlot}`);
          continue;
        }

        const candidatePilots = availablePilots.filter((p) => p.baseId === base.id && p.typeRating === ac.model);
        for (const pilot of candidatePilots) {
          const pilotHistory = pilotSortieTimeline.get(pilot.id) || [];
          let pilotAvailable = true;
          let accumulatedFlightMins = 0;
          for (const prev of pilotHistory) {
            accumulatedFlightMins += prev.rec - prev.dep;
            if (depTime < prev.rec + 45 && recTime > prev.dep - 45) {
              pilotAvailable = false;
              break;
            }
          }
          if ((accumulatedFlightMins + (recTime - depTime)) / 60 + pilot.dutyHoursLast24h > 12) {
            pilotAvailable = false;
          }
          if (!pilotAvailable) continue;

          bestCandidate = { ac, pilot, base, depTime, recTime };
          break;
        }
        if (bestCandidate) break;
      }
      if (bestCandidate) break;
    }

    if (bestCandidate) {
      packageSorties.push(bestCandidate);
      const acHistory = aircraftSortieTimeline.get(bestCandidate.ac.tailNumber) || [];
      acHistory.push({ dep: bestCandidate.depTime, rec: bestCandidate.recTime });
      aircraftSortieTimeline.set(bestCandidate.ac.tailNumber, acHistory);

      const pilotHistory = pilotSortieTimeline.get(bestCandidate.pilot.id) || [];
      pilotHistory.push({ dep: bestCandidate.depTime, rec: bestCandidate.recTime, dutyHours: 1 });
      pilotSortieTimeline.set(bestCandidate.pilot.id, pilotHistory);

      const hSlot = Math.floor(bestCandidate.depTime / 60);
      const sKey = `${bestCandidate.base.id}_${hSlot}`;
      baseHourlySorties.set(sKey, (baseHourlySorties.get(sKey) || 0) + 1);
    } else {
      if (target.id === 'TGT-010') console.log(`  [TGT-010] slot ${slot.role} could NOT find any available candidate!`);
      packageFeasible = false;
      break;
    }
  }

  if (!packageFeasible) {
    if (target.id === 'TGT-010') console.log(`[TGT-010] FAILED FEASIBILITY`);
    for (const s of packageSorties) {
      const acHistory = aircraftSortieTimeline.get(s.ac.tailNumber) || [];
      acHistory.pop();
      const pHistory = pilotSortieTimeline.get(s.pilot.id) || [];
      pHistory.pop();
      const hSlot = Math.floor(s.depTime / 60);
      const sKey = `${s.base.id}_${hSlot}`;
      baseHourlySorties.set(sKey, Math.max(0, (baseHourlySorties.get(sKey) || 0) - 1));
    }
  }
}
