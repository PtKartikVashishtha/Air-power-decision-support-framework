import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm, AIRCRAFT_MODEL_SPECS, MUNITION_CATALOG } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const t: any = {
  id: 'TGT-TST-99',
  name: 'Emergent Radar Node',
  category: 'TIME_SENSITIVE_TARGET_CONVOY',
  location: { lat: 32.1, lon: 74.2, altM: 300 },
  priority: 99,
  totStartMinutes: 60,
  totEndMinutes: 90,
  requiredPackage: { strikeSorties: 2, seadSorties: 1, escortSorties: 1, tankerSorties: 0 },
  desiredMunitions: ['PRECISION_GUIDED_BOMB'],
  minMunitionsCount: 2,
  isTimeSensitive: true,
  status: 'PENDING',
};

const bases = sc.bases;
const aircraftList = sc.aircraft;
const pilotsList = sc.pilots;
const munitionList = sc.munitionStocks || [];
const targetsList = [t];
const threatsList = sc.threats;

const availableAircraft = aircraftList.filter((a) => a.status === 'FMC');
const availablePilots = pilotsList.filter((p) => p.status === 'READY' && p.fatigueScore <= 65);
const openBases = bases.filter((b) => b.currentWeatherStatus !== 'CLOSED');

const aircraftSortieTimeline = new Map<string, Array<{ dep: number; rec: number }>>();
const pilotSortieTimeline = new Map<string, Array<{ dep: number; rec: number; dutyHours: number }>>();
const stockInventory = new Map(munitionList.map((m) => [`${m.baseId}_${m.munitionId}`, m.quantity]));
const baseHourlySorties = new Map<string, number>();

const sortedTargets = [...targetsList].sort((a, b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);

for (const target of sortedTargets) {
  const pkgId = `PKG-001`;
  const neededRoles: Array<{ role: any; munType?: string }> = [];

  for (let i = 0; i < target.requiredPackage.strikeSorties; i++) {
    neededRoles.push({ role: 'OMNIROLE_STRIKE', munType: target.desiredMunitions[0] });
  }
  for (let i = 0; i < target.requiredPackage.seadSorties; i++) {
    neededRoles.push({ role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' });
  }
  for (let i = 0; i < target.requiredPackage.escortSorties; i++) {
    neededRoles.push({ role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' });
  }

  console.log('Needed roles count:', neededRoles.length);

  const packageSorties: any[] = [];
  let packageFeasible = true;

  for (const slot of neededRoles) {
    let bestCandidate: any = null;

    for (const base of openBases) {
      const distKm = haversineDistanceKm(base.location, target.location);
      const roundtripDistKm = distKm * 2;
      const candidatePlanes = availableAircraft.filter(
        (a) => a.baseId === base.id && a.roles.includes(slot.role)
      );

      for (const ac of candidatePlanes) {
        if (roundtripDistKm > ac.combatRadiusKm * 1.8) {
          console.log(`  Plane ${ac.tailNumber} rejected: combat radius`);
          continue;
        }

        const flightTimeOneWayMin = Math.round((distKm / ac.cruiseSpeedKmh) * 60);
        const tot = Math.round((target.totStartMinutes + target.totEndMinutes) / 2);
        const depTime = Math.max(0, tot - flightTimeOneWayMin);
        const recTime = tot + flightTimeOneWayMin;

        // Check active tails ceiling
        const currentActiveTails = new Set([...aircraftSortieTimeline.keys()].filter((k) => (aircraftSortieTimeline.get(k) || []).length > 0));
        console.log(`  Plane ${ac.tailNumber}: currentActiveTails=${currentActiveTails.size}, maxActive=${Math.floor(availableAircraft.length * 0.85)}`);

        const candidatePilots = availablePilots.filter(
          (p) => p.baseId === base.id && p.typeRating === ac.model
        );
        console.log(`  Plane ${ac.tailNumber}: candidatePilots=${candidatePilots.length}`);

        for (const pilot of candidatePilots) {
          const loadout: Array<{ munitionId: string; count: number }> = [];
          const desiredMunCat = slot.munType || 'PRECISION_GUIDED_BOMB';
          const munItem = MUNITION_CATALOG.find((m) => m.category === desiredMunCat && m.compatibleModels.includes(ac.model));
          console.log(`    Pilot ${pilot.callsign}: desiredMunCat=${desiredMunCat}, munItem=${munItem?.id}`);
          if (munItem) {
            const stockKey = `${base.id}_${munItem.id}`;
            const inStock = stockInventory.get(stockKey) || 0;
            console.log(`    StockKey=${stockKey}, inStock=${inStock}`);
            if (inStock >= 2) {
              loadout.push({ munitionId: munItem.id, count: 2 });
            }
          }
          if (loadout.length === 0) {
            console.log(`    REJECTED: loadout length is 0!`);
            continue;
          }

          bestCandidate = { ac, pilot, base, depTime, recTime, loadout };
          break;
        }
        if (bestCandidate) break;
      }
      if (bestCandidate) break;
    }

    if (bestCandidate) {
      console.log(`Slot ${slot.role} ASSIGNED: ${bestCandidate.ac.tailNumber}`);
      packageSorties.push(bestCandidate);
    } else {
      console.log(`Slot ${slot.role} FAILED TO ASSIGN!`);
      packageFeasible = false;
      break;
    }
  }

  console.log('Package feasible:', packageFeasible, 'Sorties:', packageSorties.length);
}
