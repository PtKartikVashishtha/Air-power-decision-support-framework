import { generateSyntheticScenario } from '../../packages/sim/src';
import { DynamicRetaskingEngine } from '../../packages/optimizer/src/dynamic-retasker';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';
import { TacticalInject } from '../../packages/shared/src';

const sc = generateSyntheticScenario(42);
const opt = new AlnsTacticalOptimizer();
const engine = new DynamicRetaskingEngine();
const initialPlan = opt.solve(sc.bases, sc.aircraft, sc.pilots, sc.munitionStocks, sc.targetRequests, sc.threats, { seed: 42 });

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

// Let's test solving for TST directly
const spareAc = sc.aircraft.filter(a => a.status === 'FMC');
const sparePilots = sc.pilots.filter(p => p.status === 'READY');
const tstPlan = opt.solve(sc.bases, spareAc, sparePilots, sc.munitionStocks, [tstInject.payload.target], sc.threats);
console.log('Direct TST solve sorties:', tstPlan.sorties.length);
console.log('Covered targets:', tstPlan.kpis.coveredTargetsCount);
