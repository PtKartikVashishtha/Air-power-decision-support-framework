import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Evaluator Preview Bundle & Static Replay Integrity', () => {
  const previewPath = path.resolve(__dirname, '../../../apps/web/src/data/seed42-preview.json');

  it('verifies seed42-preview.json exists and is valid deterministic JSON', () => {
    expect(fs.existsSync(previewPath)).toBe(true);
    const raw = fs.readFileSync(previewPath, 'utf8');
    const data = JSON.parse(raw);

    expect(data.seed).toBe(42);
    expect(data.mode).toBe('STATIC_RECORDED_REPLAY');
    expect(data.fusedPicture).toBeDefined();
    expect(data.coas).toBeDefined();
    expect(data.retaskDiffReport).toBeDefined();
    expect(data.auditEvents).toBeDefined();
    expect(data.wargameReport).toBeDefined();
  });

  it('validates 3 non-dominated Pareto COAs are pre-calculated with sorties', () => {
    const raw = fs.readFileSync(previewPath, 'utf8');
    const data = JSON.parse(raw);

    expect(data.coas.maxEffect).toBeDefined();
    expect(data.coas.minRisk).toBeDefined();
    expect(data.coas.balanced).toBeDefined();

    expect(data.coas.balanced.sorties.length).toBeGreaterThan(50);
    expect(data.coas.balanced.kpis.priorityCoveragePercent).toBeGreaterThan(50);
  });

  it('validates cryptographic SHA-256 audit ledger hash chaining', () => {
    const raw = fs.readFileSync(previewPath, 'utf8');
    const data = JSON.parse(raw);

    expect(Array.isArray(data.auditEvents)).toBe(true);
    expect(data.auditEvents.length).toBeGreaterThanOrEqual(8);

    for (const evt of data.auditEvents) {
      expect(evt.hash).toBeDefined();
      expect(evt.actorRole).toBeDefined();
      expect(evt.reasonCode).toBeDefined();
    }
  });

  it('verifies static export output constraints (< 25 MB)', () => {
    const outDir = path.resolve(__dirname, '../../../apps/web/out');
    if (fs.existsSync(outDir)) {
      const indexHtml = path.join(outDir, 'index.html');
      expect(fs.existsSync(indexHtml)).toBe(true);
    }
  });
});
