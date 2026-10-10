import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const t10 = sc.targetRequests.find(t => t.id === 'TGT-010')!;
console.log('TGT-010:', t10);

for (const base of sc.bases) {
  const dist = haversineDistanceKm(base.location, t10.location);
  console.log(`Base ${base.id} (${base.name}): dist=${Math.round(dist)}km, weather=${base.currentWeatherStatus}`);
  const aircraft = sc.aircraft.filter(a => a.baseId === base.id && a.status === 'FMC');
  console.log(`  FMC aircraft: ${aircraft.map(a => `${a.tailNumber}(${a.model}, roles:${a.roles.join(',')})`).join(', ')}`);
}
