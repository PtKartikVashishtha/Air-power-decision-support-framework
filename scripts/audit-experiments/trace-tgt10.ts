import { generateSyntheticScenario } from '../../packages/sim/src';
import { haversineDistanceKm, AIRCRAFT_MODEL_SPECS, MUNITION_CATALOG } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const sorted = [...sc.targetRequests].sort((a,b) => b.priority - a.priority || a.totStartMinutes - b.totStartMinutes);

// Find index of TGT-010
const idx = sorted.findIndex(t => t.id === 'TGT-010');
console.log('TGT-010 is target index:', idx);
console.log('Targets evaluated before TGT-010:');
for (let i = 0; i < idx; i++) {
  console.log(`  ${sorted[i].id}: prio=${sorted[i].priority}, TOT=[${sorted[i].totStartMinutes}, ${sorted[i].totEndMinutes}], req=${JSON.stringify(sorted[i].requiredPackage)}`);
}
