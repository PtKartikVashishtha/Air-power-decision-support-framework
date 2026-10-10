import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm, MUNITION_CATALOG } from '../../packages/shared/src';

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

const neededRoles = [
  { role: 'OMNIROLE_STRIKE', munType: t.desiredMunitions[0] },
  { role: 'OMNIROLE_STRIKE', munType: t.desiredMunitions[0] },
  { role: 'SEAD_DEAD', munType: 'ANTI_RADIATION_MISSILE' },
  { role: 'AIR_SUPERIORITY', munType: 'BVR_AAM' },
];

for (const slot of neededRoles) {
  console.log(`Checking slot ${slot.role} (munType: ${slot.munType}):`);
  let matched = false;
  for (const base of sc.bases) {
    const distKm = haversineDistanceKm(base.location, t.location);
    const candidatePlanes = sc.aircraft.filter(a => a.baseId === base.id && a.status === 'FMC' && a.roles.includes(slot.role as any));
    for (const ac of candidatePlanes) {
      const candidatePilots = sc.pilots.filter(p => p.baseId === base.id && p.status === 'READY' && p.typeRating === ac.model);
      const munItem = MUNITION_CATALOG.find(m => m.category === slot.munType && m.compatibleModels.includes(ac.model));
      const inStock = sc.munitionStocks?.find(m => m.baseId === base.id && m.munitionId === munItem?.id)?.quantity || 0;
      console.log(`  Base ${base.id}: plane=${ac.tailNumber}(${ac.model}), pilots=${candidatePilots.length}, munItem=${munItem?.id}, stock=${inStock}`);
      if (candidatePilots.length > 0 && munItem && inStock >= 2) {
        matched = true;
        break;
      }
    }
    if (matched) break;
  }
}
