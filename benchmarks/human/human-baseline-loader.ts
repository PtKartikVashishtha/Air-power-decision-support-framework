import fs from 'fs';
import path from 'path';

export interface ParticipantTrialResult {
  participantId: string;
  scenarioSeed: number;
  durationSeconds: number;
  targetsAttempted: number;
  targetsCoveredValid: number;
  hardViolationsCount: number;
  violationDetails: string[];
  totalScore: number;
  packageIntegrityPercent: number;
  submittedAtIso: string;
}

export interface HumanBaselineSummary {
  hasData: boolean;
  sampleSize: number;
  caveatMessage: string;
  meanDurationSeconds?: number;
  duration95ConfidenceInterval?: [number, number];
  meanScore?: number;
  score95ConfidenceInterval?: [number, number];
  meanPackageIntegrity?: number;
  trials: ParticipantTrialResult[];
}

export class HumanBaselineLoader {
  private static readonly FILE_PATH = path.join(__dirname, 'results.json');

  public static loadTrials(): ParticipantTrialResult[] {
    try {
      if (fs.existsSync(this.FILE_PATH)) {
        const raw = fs.readFileSync(this.FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('Could not read human baseline trials file:', err);
    }
    return [];
  }

  public static appendTrial(trial: ParticipantTrialResult): void {
    const trials = this.loadTrials();
    trials.push(trial);
    fs.writeFileSync(this.FILE_PATH, JSON.stringify(trials, null, 2), 'utf8');
  }

  public static getSummary(): HumanBaselineSummary {
    const trials = this.loadTrials();
    if (trials.length === 0) {
      return {
        hasData: false,
        sampleSize: 0,
        caveatMessage: 'NO EMPIRICAL HUMAN DATA YET (n=0). Awaiting formal execution of trials per docs/HUMAN_BASELINE_PROTOCOL.md. Speedup claims are currently labelled as modelled assumptions pending participant trials.',
        trials: [],
      };
    }

    const n = trials.length;
    const durations = trials.map((t) => t.durationSeconds);
    const scores = trials.map((t) => t.totalScore);
    const integrities = trials.map((t) => t.packageIntegrityPercent);

    const meanDuration = durations.reduce((a, b) => a + b, 0) / n;
    const meanScore = scores.reduce((a, b) => a + b, 0) / n;
    const meanIntegrity = integrities.reduce((a, b) => a + b, 0) / n;

    // Student's t 95% critical value approx for small samples
    const stdDevDuration = Math.sqrt(durations.reduce((acc, d) => acc + Math.pow(d - meanDuration, 2), 0) / Math.max(1, n - 1));
    const stdDevScore = Math.sqrt(scores.reduce((acc, s) => acc + Math.pow(s - meanScore, 2), 0) / Math.max(1, n - 1));

    const marginDuration = (1.96 * stdDevDuration) / Math.sqrt(n);
    const marginScore = (1.96 * stdDevScore) / Math.sqrt(n);

    return {
      hasData: true,
      sampleSize: n,
      caveatMessage: n < 8 ? `PRELIMINARY PILOT SAMPLE (n=${n} < 8). Minimum recommended n>=8 participants required for high-confidence statistical power.` : `EMPIRICAL HUMAN BASELINE (n=${n} participants, 95% CI reported).`,
      meanDurationSeconds: parseFloat(meanDuration.toFixed(1)),
      duration95ConfidenceInterval: [
        parseFloat(Math.max(0, meanDuration - marginDuration).toFixed(1)),
        parseFloat((meanDuration + marginDuration).toFixed(1)),
      ],
      meanScore: parseFloat(meanScore.toFixed(1)),
      score95ConfidenceInterval: [
        parseFloat(Math.max(0, meanScore - marginScore).toFixed(1)),
        parseFloat((meanScore + marginScore).toFixed(1)),
      ],
      meanPackageIntegrity: parseFloat(meanIntegrity.toFixed(1)),
      trials,
    };
  }
}
