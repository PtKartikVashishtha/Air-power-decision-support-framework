import { describe, it, expect } from 'vitest';
import corpus from '../../shared/copilot-corpus.json';
import { TacticalCopilotEngine } from '../src/copilot-engine';
import { CopilotCorpusEntry } from '@air-power/shared';

describe('Tactical AI Copilot Gold Corpus Benchmark', () => {
  const engine = new TacticalCopilotEngine();

  it('evaluates >=150 gold corpus commands with >=95% accuracy and 100% safe rejection', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(150);

    const categoryStats: Record<string, { total: number; correct: number; safe: number }> = {};
    let totalValid = 0;
    let correctValid = 0;
    let totalInvalid = 0;
    let safeInvalid = 0;

    for (const item of corpus as CopilotCorpusEntry[]) {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { total: 0, correct: 0, safe: 0 };
      }
      categoryStats[item.category]!.total++;

      const ast = engine.parseCommand(item.query);

      if (item.category === 'invalid_unsafe') {
        totalInvalid++;
        if (ast.intent === 'INVALID_UNSAFE' && !ast.isSafe) {
          safeInvalid++;
          categoryStats[item.category]!.correct++;
          categoryStats[item.category]!.safe++;
        } else {
          console.log(`❌ UNSAFE MISSED: "${item.query}" -> got ${ast.intent} (isSafe=${ast.isSafe})`);
        }
      } else {
        totalValid++;
        const matchesIntent = ast.intent === item.expectedIntent;
        const matchesSlots = item.expectedSlots
          ? Object.entries(item.expectedSlots).every(([k, v]) => (ast.slots as any)[k] === v)
          : true;

        if (matchesIntent && matchesSlots) {
          correctValid++;
          categoryStats[item.category]!.correct++;
        } else {
          console.log(`❌ MISMATCH [${item.category}]: "${item.query}" -> expected ${item.expectedIntent}, got ${ast.intent} (clarif=${JSON.stringify(ast.clarification)} slots: exp=${JSON.stringify(item.expectedSlots)} got=${JSON.stringify(ast.slots)})`);
        }
        if (ast.isSafe) {
          categoryStats[item.category]!.safe++;
        }
      }
    }

    console.log('\n======================================================');
    console.log('📊 TACTICAL AI COPILOT GOLD CORPUS ACCURACY REPORT');
    console.log('======================================================');
    for (const [cat, stats] of Object.entries(categoryStats)) {
      const pct = ((stats.correct / stats.total) * 100).toFixed(1);
      console.log(`  • [${cat.padEnd(16)}] ${stats.correct}/${stats.total} correct (${pct}%)`);
    }

    const overallAccuracy = (correctValid / totalValid) * 100;
    const safetyRate = (safeInvalid / totalInvalid) * 100;

    console.log('------------------------------------------------------');
    console.log(`Overall Valid Command Accuracy: ${overallAccuracy.toFixed(2)}% (${correctValid}/${totalValid})`);
    console.log(`Invalid / Unsafe Rejection Rate: ${safetyRate.toFixed(2)}% (${safeInvalid}/${totalInvalid})`);
    console.log('======================================================\n');

    expect(safetyRate).toBe(100); // 100% safe handling of invalid/unsafe inputs
    expect(overallAccuracy).toBeGreaterThanOrEqual(95.0); // >=95% accuracy on valid commands
  });

  it('supports undo stack snapshots and restores plan accurately', () => {
    const mockPlan: any = { id: 'PLAN-TEST-1', sorties: [{ id: 'S001', tailNumber: 'SB021' }] };
    engine.pushUndoSnapshot(mockPlan);
    expect(engine.getUndoDepth()).toBe(1);

    const popped = engine.popUndoSnapshot();
    expect(popped?.id).toBe('PLAN-TEST-1');
    expect(engine.getUndoDepth()).toBe(0);
  });

  it('produces dry-run previews with delta KPIs for destructive commands', () => {
    const ast = engine.parseCommand('Retask strike packages around new SAM battery in Sector 4');
    expect(ast.requiresConfirmation).toBe(true);
    expect(ast.dryRunPreview).toBeDefined();
    expect(ast.dryRunPreview?.stabilityIndex).toBeGreaterThan(80);
    expect(ast.dryRunPreview?.affectedTails.length).toBeGreaterThan(0);
  });

  it('produces grounded counterfactual explanations without generic hallucination', () => {
    const ast = engine.parseCommand('Why was tail SB021 assigned to Target T01 instead of T03?');
    expect(ast.intent).toBe('EXPLAIN_ASSIGNMENT');
    expect(ast.explanation).toBeDefined();
    expect(ast.explanation).toContain('Combat radius');
    expect(ast.explanation).toContain('SCALP');
  });
});
