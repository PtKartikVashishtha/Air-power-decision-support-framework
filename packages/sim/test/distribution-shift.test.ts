import { describe, it, expect } from 'vitest';
import { DistributionShiftAuditor } from '../src/distribution-shift';

describe('Distribution Shift & Predictive Calibration Robustness', () => {
  const auditor = new DistributionShiftAuditor();

  it('quantifies calibration degradation under out-of-distribution combat shift', () => {
    const report = auditor.evaluateShift(1000);

    console.log('\n========================================');
    console.log('PREDICTIVE DISTRIBUTION SHIFT AUDIT');
    console.log(`In-Distribution Family : ${report.inDistributionFamily}`);
    console.log(`  Brier Score          : ${report.inDistribution.brierScore}`);
    console.log(`  ECE                  : ${report.inDistribution.expectedCalibrationError}`);
    console.log(`  Conformal 90% Cov    : ${report.inDistribution.conformal90Coverage}%`);
    console.log(`Out-of-Distribution Fam: ${report.outOfDistributionFamily}`);
    console.log(`  Brier Score          : ${report.outOfDistribution.brierScore}`);
    console.log(`  ECE                  : ${report.outOfDistribution.expectedCalibrationError}`);
    console.log(`  Conformal 90% Cov    : ${report.outOfDistribution.conformal90Coverage}%`);
    console.log(`Brier Degradation Ratio: ${report.brierDegradationRatio}x`);
    console.log(`Interval Coverage Drop : ${report.coverageDropPercent}%`);
    console.log('Notice: ' + report.methodologicalNotice);
    console.log('========================================\n');

    expect(report.inDistribution.brierScore).toBeLessThan(report.outOfDistribution.brierScore);
    expect(report.brierDegradationRatio).toBeGreaterThan(1.0);
    expect(report.methodologicalNotice).toContain('DO NOT OVERCLAIM');
  });
});
