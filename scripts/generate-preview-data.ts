/**
 * Static Preview Data Generator (Seed 42 Deterministic Replay)
 * 
 * Pre-records the entire deterministic state of Seed 42:
 * - Common Operating Picture (COP)
 * - 3 Courses of Action (COAs: Max Effect, Min Risk, Balanced Reserve)
 * - Retasking diff under SAM pop-up inject
 * - Pre-recorded cryptographic SHA-256 audit ledger
 * - Benchmark results summary (100 seeds)
 * - Wargame wargame report
 * 
 * Saves output to apps/web/src/data/seed42-preview.json for pure client-side replay.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSyntheticScenario } from '../packages/sim/src/synthetic-data';
import { AlnsTacticalOptimizer } from '../packages/optimizer/src/alns-optimizer';
import { DynamicRetaskingEngine } from '../packages/optimizer/src/dynamic-retasker';
import { RedCellWargameEngine } from '../packages/sim/src/red-cell-wargame';

const OUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'src', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'apps', 'web', 'public');

function generatePreviewBundle() {
  console.log('📦 Compiling Seed-42 Deterministic Replay Package...');

  const sc = generateSyntheticScenario(42);
  const optimizer = new AlnsTacticalOptimizer();
  const retasker = new DynamicRetaskingEngine();
  const redCell = new RedCellWargameEngine();

  // 1. Fused Picture
  const fusedPicture = {
    timestampIso: '2026-10-10T06:00:00.000Z',
    simTimeMinutes: 255,
    overallConfidenceScore: 98.4,
    activeConflictsCount: 0,
    bases: sc.bases,
    aircraft: sc.aircraft,
    pilots: sc.pilots,
    munitionStocks: sc.munitionStocks,
    threats: sc.threats,
    airspaceZones: sc.airspaceZones,
    targetRequests: sc.targetRequests,
    weatherReports: sc.bases.map((b) => ({
      baseId: b.id,
      baseName: b.name,
      status: b.currentWeatherStatus,
      visibilityKm: 12.0,
      windSpeedKts: 8,
      cloudCeilingM: 3000,
    })),
    feedHealth: [
      { streamName: 'AFNET_TACTICAL_RADAR_EAST', status: 'HEALTHY', latencyMs: 14, lastHeartbeatIso: '2026-10-10T06:00:00.000Z' },
      { streamName: 'LINK16_SURVEILLANCE_GRID', status: 'HEALTHY', latencyMs: 22, lastHeartbeatIso: '2026-10-10T06:00:00.000Z' },
      { streamName: 'WEATHER_RADAR_DOPPLER', status: 'HEALTHY', latencyMs: 45, lastHeartbeatIso: '2026-10-10T06:00:00.000Z' },
    ],
  };

  // 2. Three Deterministic COAs
  console.log('  -> Generating 3 Non-Dominated COAs (Max Effect, Min Risk, Balanced Reserve)...');
  const coaMaxEffect = optimizer.solve(
    sc.bases,
    sc.aircraft,
    sc.pilots,
    sc.munitionStocks,
    sc.targetRequests,
    sc.threats,
    { doctrineFocus: 'MAX_EFFECT', maxIterations: 60 }
  );

  const coaMinRisk = optimizer.solve(
    sc.bases,
    sc.aircraft,
    sc.pilots,
    sc.munitionStocks,
    sc.targetRequests,
    sc.threats,
    { doctrineFocus: 'MIN_RISK', maxIterations: 60 }
  );

  const coaBalanced = optimizer.solve(
    sc.bases,
    sc.aircraft,
    sc.pilots,
    sc.munitionStocks,
    sc.targetRequests,
    sc.threats,
    { doctrineFocus: 'BALANCED_RESERVE', maxIterations: 60 }
  );

  // 3. Retasking Diff (Pop-up SAM inject)
  console.log('  -> Simulating SAM Pop-Up Dynamic Retasking...');
  const popupInject = {
    id: 'INJECT-SAM-01',
    type: 'SAM_POPUP' as const,
    title: 'Mobile SAM Battery Relocation (HQ-16)',
    simTimeMinutes: 260,
    description: 'Hostile mobile SAM battery detected along primary strike transit corridor.',
    payload: { threatId: 'THREAT_SAM_01' },
    acknowledged: true,
  };

  const retaskDiffReport = retasker.retaskPlan(
    coaBalanced,
    popupInject,
    255,
    sc.bases,
    sc.aircraft,
    sc.pilots,
    sc.munitionStocks,
    sc.targetRequests,
    sc.threats
  );

  // 4. Pre-recorded Cryptographic SHA-256 Audit Trail
  console.log('  -> Generating Cryptographic SHA-256 Audit Ledger...');
  const auditEvents = [];
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const actions = [
    { role: 'SYSTEM', act: 'GENESIS_LOAD_SCENARIO', reason: 'PRIMARY_STRIKE_MATCH' },
    { role: 'INTEL', act: 'BAYESIAN_FUSION_LOCK', reason: 'SEAD_ESCORT_SYNCHRONIZED' },
    { role: 'PLANNER', act: 'SYNTHESIZE_MASTER_ATO', reason: 'PRIMARY_STRIKE_MATCH' },
    { role: 'COMMANDER', act: 'SELECT_COA_BALANCED', reason: 'RESERVE_PRESERVED' },
    { role: 'COMMANDER', act: 'APPROVE_PLAN', reason: 'COMMANDER_AUTHORIZED' },
    { role: 'SYSTEM', act: 'TACTICAL_INJECT_SAM_POPUP', reason: 'POPUP_THREAT_DIVERT' },
    { role: 'PLANNER', act: 'DYNAMIC_RETASK', reason: 'POPUP_THREAT_DIVERT' },
    { role: 'COMMANDER', act: 'APPROVE_RETASK_DIFF', reason: 'COMMANDER_AUTHORIZED' },
  ];

  for (let i = 0; i < actions.length; i++) {
    const timeIso = new Date(Date.UTC(2026, 9, 10, 6, i * 5, 0)).toISOString();
    const payload = `${i}:${timeIso}:${actions[i].role}:${actions[i].act}:${prevHash}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    auditEvents.push({
      index: i + 1,
      timestampIso: timeIso,
      actorRole: actions[i].role,
      action: actions[i].act,
      reasonCode: actions[i].reason,
      hash: hash.slice(0, 16),
      prevHash: prevHash.slice(0, 16),
    });
    prevHash = hash;
  }

  // 5. Benchmark Summary
  let benchmarkSummary = null;
  const benchPath = path.join(__dirname, '..', 'benchmarks', 'results', 'benchmark-summary.json');
  if (fs.existsSync(benchPath)) {
    benchmarkSummary = JSON.parse(fs.readFileSync(benchPath, 'utf8'));
  }

  // 6. Wargame Results
  console.log('  -> Simulating Red Cell Adversarial Wargame (4 trials)...');
  const wargameReport = redCell.runAdversarialWargame(
    sc.bases,
    sc.aircraft,
    sc.pilots,
    sc.munitionStocks,
    sc.targetRequests.slice(0, 6),
    sc.threats.slice(0, 3),
    4
  );

  const previewPackage = {
    generatedAt: new Date().toISOString(),
    seed: 42,
    mode: 'STATIC_RECORDED_REPLAY',
    fusedPicture,
    coas: {
      maxEffect: coaMaxEffect,
      minRisk: coaMinRisk,
      balanced: coaBalanced,
    },
    retaskDiffReport,
    auditEvents,
    benchmarkSummary,
    wargameReport,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const jsonStr = JSON.stringify(previewPackage, null, 2);
  const jsonPath = path.join(OUT_DIR, 'seed42-preview.json');
  const publicPath = path.join(PUBLIC_DIR, 'preview-data.json');

  fs.writeFileSync(jsonPath, jsonStr, 'utf8');
  fs.writeFileSync(publicPath, jsonStr, 'utf8');

  const sizeKb = Math.round(Buffer.byteLength(jsonStr) / 1024);
  console.log(`✅ Seed-42 Preview Package generated (${sizeKb} KB) at:`);
  console.log(`   - ${jsonPath}`);
  console.log(`   - ${publicPath}`);
}

generatePreviewBundle();
