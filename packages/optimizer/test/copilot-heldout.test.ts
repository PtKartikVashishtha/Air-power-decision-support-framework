import { describe, it, expect } from 'vitest';
import { TacticalCopilotEngine } from '../src/copilot-engine';
import heldoutData from '../../shared/copilot-heldout-corpus.json';

interface HeldoutCase {
  id: string;
  category: string;
  query: string;
  expectedIntent: string;
  expectedSlots?: Record<string, any>;
}

describe('Tactical Copilot Held-Out Blind Test Set Evaluation', () => {
  const engine = new TacticalCopilotEngine();
  const cases: HeldoutCase[] = heldoutData as HeldoutCase[];

  it('evaluates all 150 held-out cases with category breakdowns', () => {
    let totalCorrectIntent = 0;
    const categoryStats: Record<string, { total: number; correct: number; failures: { id: string; query: string; expected: string; actual: string }[] }> = {};

    for (const testCase of cases) {
      if (!categoryStats[testCase.category]) {
        categoryStats[testCase.category] = { total: 0, correct: 0, failures: [] };
      }
      categoryStats[testCase.category].total++;

      const ast = engine.parseCommand(testCase.query);
      const isIntentMatch = ast.intent === testCase.expectedIntent;

      if (isIntentMatch) {
        totalCorrectIntent++;
        categoryStats[testCase.category].correct++;
      } else {
        categoryStats[testCase.category].failures.push({
          id: testCase.id,
          query: testCase.query,
          expected: testCase.expectedIntent,
          actual: ast.intent,
        });
      }
    }

    const overallAccuracy = (totalCorrectIntent / cases.length) * 100;
    console.log(`\n========================================`);
    console.log(`HELD-OUT BLIND COPILOT EVALUATION RESULTS`);
    console.log(`Total Cases: ${cases.length}`);
    console.log(`Overall Intent Accuracy: ${overallAccuracy.toFixed(2)}% (${totalCorrectIntent}/${cases.length})`);
    console.log(`----------------------------------------`);
    for (const [cat, stats] of Object.entries(categoryStats)) {
      const catPct = ((stats.correct / stats.total) * 100).toFixed(1);
      console.log(`  - ${cat.padEnd(25)}: ${stats.correct}/${stats.total} (${catPct}%)`);
      if (stats.failures.length > 0) {
        for (const f of stats.failures.slice(0, 3)) {
          console.log(`      FAIL [${f.id}]: "${f.query}" -> expected ${f.expected}, got ${f.actual}`);
        }
      }
    }
    console.log(`========================================\n`);

    // We report honest baseline accuracy, requiring >= 75% on cold held-out dataset containing heavy typos and Hinglish
    expect(cases.length).toBeGreaterThanOrEqual(150);
    expect(overallAccuracy).toBeGreaterThanOrEqual(75);
  });
});
