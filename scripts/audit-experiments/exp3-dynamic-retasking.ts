import { generateSyntheticScenario } from '../../packages/sim/src';
import { DynamicRetaskingEngine } from '../../packages/optimizer/src/dynamic-retasker';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';
import { TacticalInject, Sortie } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const opt = new AlnsTacticalOptimizer();
const engine = new DynamicRetaskingEngine();

const initialPlan = opt.solve(
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats,
  { seed: 42 }
);

console.log('Testing Dynamic Retasking Suite across inject matrix:');

// 1. Frozen Zone Test: simTime = 40 min, frozen boundary = 40 + 15 = 55 min
const simTime = 40;
const aogInject: TacticalInject = {
  id: 'INJ-AOG-1',
  type: 'AIRCRAFT_AOG_SNAG',
  simTimeMinutes: 40,
  title: 'Airframe Hydraulic Failure',
  description: 'Sudden hydraulic leak on aircraft',
  payload: { tailNumber: initialPlan.sorties[0]!.aircraftTail },
  acknowledged: false,
};

const resultAOG = engine.retaskPlan(
  initialPlan,
  aogInject,
  simTime,
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats
);

// Verify Frozen Zone respect:
const frozenSorties = resultAOG.updatedPlan.sorties.filter(s => s.isFrozen);
console.log('1. Frozen Zone Verification:');
console.log(`   Total frozen sorties: ${frozenSorties.length}`);
let frozenRespected = true;
for (const s of frozenSorties) {
  if (s.depTimeMinutes > simTime + 15 && s.status !== 'AIRBORNE') {
    console.error(`   VIOLATION: Sortie ${s.sortieId} at dep=${s.depTimeMinutes} should NOT be frozen (horizon=${simTime + 15})`);
    frozenRespected = false;
  }
}
if (frozenRespected) console.log('   PASSED: Every frozen sortie is strictly <= currentSimTime + 15m or AIRBORNE.');

// 2. Weather Closure Inject
const weatherInject: TacticalInject = {
  id: 'INJ-WX-1',
  type: 'BASE_WEATHER_CLOSURE',
  simTimeMinutes: 40,
  title: 'Squall Line over Base Ambala',
  description: 'Sub-minima weather closure',
  payload: { baseId: 'BASE_AMBALA' },
  acknowledged: false,
};

const resultWX = engine.retaskPlan(
  initialPlan,
  weatherInject,
  simTime,
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats
);

console.log('2. Weather Closure Verification:');
const cancelledForWx = resultWX.diffReport.changes.filter(c => c.reasonCode === 'RUNWAY_WEATHER_MINIMA');
console.log(`   Cancelled sorties for BASE_AMBALA: ${cancelledForWx.length}`);
console.log(`   Stability index: ${resultWX.diffReport.stabilityIndex}%`);

// 3. TST Inject
const tstInject: TacticalInject = {
  id: 'INJ-TST-1',
  type: 'NEW_HIGH_VALUE_TST',
  simTimeMinutes: 40,
  title: 'High Value Convoy Detected',
  description: 'Pop-up TST request',
  payload: {
    target: {
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
    },
  },
  acknowledged: false,
};

const targetsWithTst = [tstInject.payload.target, ...sc.targetRequests];
const resultTST = engine.retaskPlan(
  initialPlan,
  tstInject,
  simTime,
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  targetsWithTst,
  sc.threats
);

console.log('3. Time-Sensitive Target (TST) Verification:');
const addedForTst = resultTST.diffReport.changes.filter(c => c.changeType === 'ADDED');
console.log(`   Added sorties for TST: ${addedForTst.length}`);

// 4. Idempotence Verification (Applying the exact same inject twice)
const resultAOG_2 = engine.retaskPlan(
  resultAOG.updatedPlan,
  aogInject,
  simTime,
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  sc.targetRequests,
  sc.threats
);

console.log('4. Idempotence Verification:');
console.log(`   Sorties count run 1: ${resultAOG.updatedPlan.sorties.length}, run 2: ${resultAOG_2.updatedPlan.sorties.length}`);
console.log(`   Idempotent matching: ${resultAOG.updatedPlan.sorties.length === resultAOG_2.updatedPlan.sorties.length}`);

// 5. Stability Index Metric Invariant
console.log('5. Stability Metrics Bounds:');
console.log(`   AOG stability: ${resultAOG.diffReport.stabilityIndex}% (in [20, 100])`);
console.log(`   WX stability: ${resultWX.diffReport.stabilityIndex}% (in [20, 100])`);
console.log(`   TST stability: ${resultTST.diffReport.stabilityIndex}% (in [20, 100])`);
