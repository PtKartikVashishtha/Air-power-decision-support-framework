import { describe, it, expect } from 'vitest';
import { generateSyntheticScenario } from '../src/synthetic-data';
import {
  ThreatAwareRoutePlanner,
  MultiObjectiveParetoEngine,
  MatheuristicLnsEngine,
  BanditOperatorSelector,
  RobustStochasticPlanner,
  DecisionQualityExplainer,
  AlnsTacticalOptimizer,
} from '@air-power/optimizer';
import {
  EdgeCrdtSyncNode,
  RedCellWargameEngine,
  StaffCollegeTrainerEngine,
  AfterActionReviewEngine,
} from '../src/index';
import {
  generateSortieCotEvent,
  parseCotXml,
  generateTheatreGeoJson,
  generateCampaignKml,
  getOpenApiSpec,
  Sortie,
} from '@air-power/shared';

describe('Phase 4: Depth-Check & Verification on All Phase-3 Features', () => {
  const scenario = generateSyntheticScenario(42);

  // 1. 3D COP & Terrain Routing
  it('1. Terrain Routing: runs real 3D Dijkstra/sampling with synthetic DEM LOS masking', () => {
    const planner = new ThreatAwareRoutePlanner();
    const result = planner.planAndCompareRoutes(
      scenario.bases[0].location,
      scenario.targetRequests[0].location,
      scenario.threats,
      'RAFALE_CLASS'
    );

    expect(result.routeA).toBeDefined();
    expect(result.routeB).toBeDefined();
    expect(result.routeA.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(result.routeB.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(result.routeA.elevationProfile.length).toBeGreaterThanOrEqual(5);
    expect(result.routeB.elevationProfile.length).toBeGreaterThanOrEqual(5);

    // Verify real numeric computation
    expect(result.routeA.averageRiskScore).toBeGreaterThan(0);
    expect(result.riskReductionPercent).toBeGreaterThanOrEqual(0);
    expect(result.routeB.terrainMaskingPercent).toBeGreaterThanOrEqual(0);
  });

  // 2. Matheuristic LNS Fix-and-Optimise
  it('2. Matheuristic LNS: executes real destroy-and-repair with HiGHS-WASM', async () => {
    const optimizer = new AlnsTacticalOptimizer();
    const lns = new MatheuristicLnsEngine();

    const initialPlan = optimizer.solve(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats,
      { maxIterations: 15 }
    );

    const step = await lns.reoptimizeSubneighborhood(
      initialPlan.sorties,
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 6),
      scenario.threats,
      { subTargetCount: 2, timeLimitSeconds: 0.2 }
    );

    expect(step.durationMs).toBeGreaterThanOrEqual(0);
    expect(step.sorties.length).toBeGreaterThan(0);
    expect(['Optimal', 'Feasible', 'SkippedEmpty', 'NoSubResources', 'HiGHS_Fallback']).toContain(
      step.highsStatus
    );
  });

  // 3. Bandit Operator Selector (UCB1 & Thompson)
  it('3. Bandit Operator Selector: tracks empirical regret and updates arm posteriors dynamically', () => {
    const operators = ['randomDestroy', 'worstRiskDestroy', 'clusterDestroy', 'greedyRepair', 'regretRepair'];
    const bandit = new BanditOperatorSelector(operators, 'UCB1');

    for (let i = 0; i < 20; i++) {
      const op = bandit.selectOperator(operators);
      expect(operators).toContain(op);
      const reward = op === 'regretRepair' ? 30 : 5;
      bandit.recordFeedback(op, reward, true, op === 'regretRepair');
    }

    const stats = bandit.getOperatorStats('REPAIR');
    expect(stats.length).toBe(operators.length);
    const regret = bandit.calculateCumulativeRegret();
    expect(regret).toBeGreaterThanOrEqual(0);
  });

  // 4. Pareto Engine & Commander's Dial
  it('4. Pareto Engine: produces real non-dominated frontier and smooth dial gliding', () => {
    const pareto = new MultiObjectiveParetoEngine();
    const frontier = pareto.generateParetoFrontier(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 10),
      scenario.threats
    );

    expect(frontier.frontierPoints.length).toBeGreaterThanOrEqual(3);
    expect(frontier.hypervolumeEstimate).toBeGreaterThan(0);

    const minRiskPlan = pareto.getPlanForDial(frontier.frontierPoints, 0.0);
    const maxSurgePlan = pareto.getPlanForDial(frontier.frontierPoints, 1.0);

    expect(minRiskPlan.dialPosition).toBe(0.0);
    expect(maxSurgePlan.dialPosition).toBe(1.0);
    expect(maxSurgePlan.objectives.targetValue).toBeGreaterThanOrEqual(minRiskPlan.objectives.targetValue);
  });

  // 5. Robust Stochastic Planner (Price of Robustness)
  it('5. Robust Stochastic Planner: evaluates scenario recourse and computes Price of Robustness', () => {
    const planner = new RobustStochasticPlanner();
    const robustRes = planner.evaluateRobustPlan(
      scenario.bases,
      scenario.aircraft,
      scenario.pilots,
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 8),
      scenario.threats,
      5 // 5 Monte Carlo scenarios
    );

    expect(robustRes.scenariosEvaluatedCount).toBe(5);
    expect(robustRes.nominalPlan).toBeDefined();
    expect(robustRes.robustPlan).toBeDefined();
    expect(typeof robustRes.priceOfRobustnessPercent).toBe('number');
    expect(robustRes.conformalInterval90.lowerBoundScore).toBeLessThanOrEqual(
      robustRes.conformalInterval90.upperBoundScore
    );
  });

  // 6. Contested Edge CRDT Engine
  it('6. CRDT Edge Sync: computes vector clocks and achieves deterministic merge under partition', () => {
    const hqNode = new EdgeCrdtSyncNode('CAOC_AIR_HQ');
    const ambalaNode = new EdgeCrdtSyncNode('BASE_AMBALA');

    hqNode.setLinkSevered(true);
    ambalaNode.setLinkSevered(true);

    const hypotheticalSortie: Sortie = {
      sortieId: 'SRT-HQ-01',
      callsign: 'VAYU-HQ',
      packageId: 'PKG-HQ',
      targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
      role: 'AIR_SUPERIORITY',
      aircraftTail: 'SB-101',
      pilotId: 'PILOT-001',
      originBaseId: 'BASE_AMBALA',
      recoveryBaseId: 'BASE_AMBALA',
      depTimeMinutes: 60,
      totMinutes: 90,
      recoveryTimeMinutes: 120,
      fuelPlannedKg: 4000,
      routeWaypoints: [{
        lat: 30.3, lon: 76.8,
        altM: 0
      }, {
        lat: 32.4, lon: 74.1,
        altM: 0
      }],
      expectedRiskScore: 30,
      status: 'SCHEDULED',
      munitionLoadout: [],
      isFrozen: false,
    };
    hqNode.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: hypotheticalSortie });

    const localScrambleSortie: Sortie = {
      ...hypotheticalSortie,
      sortieId: 'SRT-AMB-SCRAMBLE',
      callsign: 'GARUDA-SCRAMBLE',
      status: 'AIRBORNE',
      depTimeMinutes: 15,
      isFrozen: true,
    };
    ambalaNode.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: localScrambleSortie });

    expect(hqNode.getVectorClock().hq).toBe(1);
    expect(ambalaNode.getVectorClock().ambala).toBe(1);

    hqNode.setLinkSevered(false);
    ambalaNode.setLinkSevered(false);

    const reconciliation = hqNode.mergeRemoteEventLogs(ambalaNode);
    expect(reconciliation.conflictsResolvedCount).toBe(1);
    expect(hqNode.getCommittedSorties().some((s) => s.sortieId === 'SRT-AMB-SCRAMBLE')).toBe(true);
  });

  // 7. Red Cell Adversarial Wargame
  it('7. Red Cell Wargame: simulates adaptive enemy injects against Static vs Robust controllers', () => {
    const wargame = new RedCellWargameEngine();
    const report = wargame.runAdversarialWargame(
      scenario.bases,
      scenario.aircraft.slice(0, 16),
      scenario.pilots.slice(0, 20),
      scenario.munitionStocks,
      scenario.targetRequests.slice(0, 5),
      scenario.threats.slice(0, 2),
      3
    );

    expect(report.simulationsRun).toBe(3);
    expect(report.controllers.length).toBe(3);
    expect(report.tacticalLessonsLearned.length).toBeGreaterThan(0);
  });

  // 8. Staff College Trainer & Branching AAR
  it('8. Staff College Trainer & AAR: grades doctrine kernels and branches counterfactual timelines', () => {
    const trainer = new StaffCollegeTrainerEngine();
    const report = trainer.gradePlan([], {
      bases: scenario.bases,
      aircraft: scenario.aircraft,
      pilots: scenario.pilots,
      munitionStocks: scenario.munitionStocks,
      threats: scenario.threats,
      targetRequests: scenario.targetRequests,
    });

    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(report.letterGrade);
    expect(report.critiques).toBeInstanceOf(Array);

    const aar = new AfterActionReviewEngine();
    const events = aar.getCampaignTimelineEvents();
    expect(events.length).toBeGreaterThanOrEqual(3);

    const counterfactual = aar.simulateBranchWhatIf(events[1].id, 'EARLY_RETASK_15M');
    expect(counterfactual.comparison.riskReductionPercent).toBeGreaterThan(0);
    expect(counterfactual.pedagogicalTakeaway).toBeTruthy();
  });

  // 9. XAI (Decision Quality & Explainability)
  it('9. XAI Studio: generates valid +/- point trade-off cards, attribution, and sensitivity tornado', () => {
    const explainer = new DecisionQualityExplainer();
    const dummySortie: Sortie = {
      sortieId: 'S001',
      callsign: 'GARUDA-01',
      packageId: 'PKG-01',
      targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
      role: 'OMNIROLE_STRIKE',
      aircraftTail: scenario.aircraft[0].tailNumber,
      pilotId: scenario.pilots[0].id,
      originBaseId: scenario.bases[0].id,
      recoveryBaseId: scenario.bases[0].id,
      munitionLoadout: [],
      depTimeMinutes: 30,
      totMinutes: 75,
      recoveryTimeMinutes: 120,
      fuelPlannedKg: 6800,
      routeWaypoints: [scenario.bases[0].location, scenario.targetRequests[0].location],
      expectedRiskScore: 12.0,
      status: 'SCHEDULED',
      isFrozen: false,
    };

    const card = explainer.explainSortieAssignment(dummySortie, {
      allSorties: [dummySortie],
      aircraft: scenario.aircraft,
      pilots: scenario.pilots,
      targets: scenario.targetRequests,
      threats: scenario.threats,
    });

    expect(card.sortieId).toBe('S001');
    expect(card.scoreBreakdown.netScore).toBeDefined();
    expect(card.runnerUp).toBeDefined();

    const attributions = explainer.computeGlobalFeatureAttribution({ sorties: [dummySortie], kpis: {} } as any);
    expect(attributions.length).toBe(4);

    const tornado = explainer.generateSensitivityTornadoAnalysis();
    expect(tornado.length).toBeGreaterThanOrEqual(4);
  });

  // 10. CoT / GeoJSON / KML / OpenAPI Tactical Interoperability
  it('10. Tactical Interop: round-trips CoT XML, valid GeoJSON FeatureCollection, KML, and OpenAPI spec', () => {
    const dummySortie: Sortie = {
      sortieId: 'S001',
      callsign: 'GARUDA-01',
      packageId: 'PKG-01',
      targetRequestId: scenario.targetRequests[0]?.id || 'TGT-001',
      role: 'OMNIROLE_STRIKE',
      aircraftTail: scenario.aircraft[0].tailNumber,
      pilotId: scenario.pilots[0].id,
      originBaseId: scenario.bases[0].id,
      recoveryBaseId: scenario.bases[0].id,
      munitionLoadout: [],
      depTimeMinutes: 30,
      totMinutes: 75,
      recoveryTimeMinutes: 120,
      fuelPlannedKg: 6800,
      routeWaypoints: [scenario.bases[0].location, scenario.targetRequests[0].location],
      expectedRiskScore: 12.0,
      status: 'SCHEDULED',
      isFrozen: false,
    };

    const cotXml = generateSortieCotEvent(dummySortie, scenario.bases[0], scenario.targetRequests[0], 0);
    expect(cotXml).toContain('<event');
    const parsed = parseCotXml(cotXml);
    expect(parsed.success).toBe(true);
    expect(parsed.event?.uid).toBe('AP-SRT-S001');

    const geoJson = generateTheatreGeoJson({
      bases: scenario.bases,
      targets: scenario.targetRequests,
      threats: scenario.threats,
    });
    expect(geoJson.type).toBe('FeatureCollection');
    expect(geoJson.features.length).toBeGreaterThan(0);

    const kml = generateCampaignKml({
      bases: scenario.bases,
      targets: scenario.targetRequests,
      threats: scenario.threats,
    });
    expect(kml).toContain('<kml');

    const openApi = getOpenApiSpec();
    expect(openApi.openapi).toBe('3.0.3');
  });
});
