import { generateSyntheticScenario } from '../../packages/sim/src';
import { AlnsTacticalOptimizer } from '../../packages/optimizer/src/alns-optimizer';

const sc = generateSyntheticScenario(42);
const opt = new AlnsTacticalOptimizer();
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

const initialSorties = (opt as any).constructiveHeuristic(
  sc.bases,
  sc.aircraft,
  sc.pilots,
  sc.munitionStocks,
  [t],
  sc.threats,
  1.0,
  0.5,
  0.0001,
  'BALANCED_RESERVE',
  true
);

console.log('constructiveHeuristic sorties:', initialSorties.length);
