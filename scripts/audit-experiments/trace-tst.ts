import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const t = {
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

for (const b of sc.bases) {
  const dist = haversineDistanceKm(b.location, t.location);
  console.log(`Base ${b.id}: dist=${Math.round(dist)}km, weather=${b.currentWeatherStatus}`);
  const acs = sc.aircraft.filter(a => a.baseId === b.id && a.status === 'FMC');
  console.log(`  Aircraft count: ${acs.length}, models: ${[...new Set(acs.map(a => a.model))].join(', ')}`);
  for (const a of acs) {
    const flightMin = Math.round((dist / a.cruiseSpeedKmh) * 60);
    const tot = Math.round((t.totStartMinutes + t.totEndMinutes) / 2);
    const dep = Math.max(0, tot - flightMin);
    const rec = tot + flightMin;
    console.log(`    Tail ${a.tailNumber} (${a.model}): dep=${dep}, tot=${tot}, rec=${rec}, roles=${a.roles.join(',')}`);
    break;
  }
}
