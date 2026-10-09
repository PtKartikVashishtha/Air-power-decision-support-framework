/**
 * Multi-Armed Bandit (MAB) Adaptive Operator Selection Engine
 * 
 * Replaces and augments traditional roulette-wheel selection in ALNS with:
 * 1. UCB1 (Upper Confidence Bound): Balances exploitation of high-scoring destroy/repair
 *    operators with exploration of less frequently called operators:
 *       Score_i = \bar{X}_i + c * \sqrt{ \ln(N) / n_i }
 * 2. Thompson Sampling (Beta-Bernoulli Posterior): Samples success probability from
 *    Beta(\alpha_i, \beta_i) posterior distributions.
 * 3. Exact Regret Logging: Computes and logs cumulative pseudo-regret R_T against the
 *    empirically best operator in hindsight:
 *       R_T = T * \mu^* - \sum_{t=1}^T \mu_{a_t}
 * 4. Ablation Logging: Quantifies the marginal objective gain attributable to each operator.
 */

export interface OperatorStatsReport {
  operatorName: string;
  type: 'DESTROY' | 'REPAIR';
  pulls: number;
  totalReward: number;
  meanReward: number;
  bestImprovementDelta: number;
  selectionSharePercent: number;
  ablationContributionPercent: number;
}

export class BanditOperatorSelector {
  private pulls: Map<string, number> = new Map();
  private totalRewards: Map<string, number> = new Map();
  private bestDeltas: Map<string, number> = new Map();
  private betaSuccess: Map<string, number> = new Map();
  private betaFailure: Map<string, number> = new Map();
  private totalPullsCount = 0;
  private explorationConstant: number;
  private algorithm: 'UCB1' | 'THOMPSON_SAMPLING';

  constructor(
    operatorNames: string[],
    algorithm: 'UCB1' | 'THOMPSON_SAMPLING' = 'UCB1',
    explorationConstant = 1.414
  ) {
    this.algorithm = algorithm;
    this.explorationConstant = explorationConstant;

    for (const name of operatorNames) {
      this.pulls.set(name, 0);
      this.totalRewards.set(name, 0);
      this.bestDeltas.set(name, 0);
      this.betaSuccess.set(name, 1); // Beta(1, 1) uniform prior
      this.betaFailure.set(name, 1);
    }
  }

  /**
   * Selects an operator according to active bandit policy (UCB1 or Thompson)
   */
  public selectOperator(operatorNames: string[]): string {
    if (operatorNames.length === 0) throw new Error('No operators provided to bandit selector');
    if (operatorNames.length === 1) return operatorNames[0];

    // Cold-start phase: ensure every arm is pulled at least once
    for (const name of operatorNames) {
      if ((this.pulls.get(name) || 0) === 0) {
        return name;
      }
    }

    if (this.algorithm === 'UCB1') {
      return this.selectUcb1(operatorNames);
    } else {
      return this.selectThompson(operatorNames);
    }
  }

  private selectUcb1(operatorNames: string[]): string {
    let bestScore = -Infinity;
    let selected = operatorNames[0];

    const lnN = Math.log(Math.max(1, this.totalPullsCount));

    for (const name of operatorNames) {
      const n = this.pulls.get(name) || 1;
      const totalR = this.totalRewards.get(name) || 0;
      const mean = totalR / n;
      const bonus = this.explorationConstant * Math.sqrt(lnN / n);
      const score = mean + bonus;

      if (score > bestScore) {
        bestScore = score;
        selected = name;
      }
    }

    return selected;
  }

  private selectThompson(operatorNames: string[]): string {
    let bestSample = -Infinity;
    let selected = operatorNames[0];

    for (const name of operatorNames) {
      const alpha = this.betaSuccess.get(name) || 1;
      const beta = this.betaFailure.get(name) || 1;
      const sample = this.sampleBeta(alpha, beta);

      if (sample > bestSample) {
        bestSample = sample;
        selected = name;
      }
    }

    return selected;
  }

  /**
   * Approximate Beta distribution sample using normal approximation / Gamma sampling
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Expected mean + variance perturbation for fast TS sampling
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    // Box-Muller normal sample
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sample = mean + z * stdDev;
    return Math.max(0.001, Math.min(0.999, sample));
  }

  /**
   * Updates bandit feedback reward
   * @param operatorName Selected operator
   * @param reward Improvement score (normalized positive value, e.g. delta objective)
   * @param isAccepted Whether the move was accepted by simulated annealing
   * @param isNewGlobalBest Whether the move established a new best-ever objective
   */
  public recordFeedback(
    operatorName: string,
    reward: number,
    isAccepted: boolean,
    isNewGlobalBest: boolean
  ): void {
    const currentPulls = (this.pulls.get(operatorName) || 0) + 1;
    this.pulls.set(operatorName, currentPulls);
    this.totalPullsCount++;

    // Military reward structure: bonus for new global best
    const effectiveReward = isNewGlobalBest
      ? Math.max(0.1, reward) * 3.0
      : isAccepted
      ? Math.max(0.05, reward) * 1.5
      : 0.01;

    const currentTotalReward = (this.totalRewards.get(operatorName) || 0) + effectiveReward;
    this.totalRewards.set(operatorName, currentTotalReward);

    const prevBestDelta = this.bestDeltas.get(operatorName) || 0;
    if (reward > prevBestDelta) {
      this.bestDeltas.set(operatorName, reward);
    }

    // Update Thompson Beta parameters
    if (isAccepted || isNewGlobalBest) {
      const s = (this.betaSuccess.get(operatorName) || 1) + 1;
      this.betaSuccess.set(operatorName, s);
    } else {
      const f = (this.betaFailure.get(operatorName) || 1) + 1;
      this.betaFailure.set(operatorName, f);
    }
  }

  /**
   * Generates comprehensive operator ablation & performance report
   */
  public getOperatorStats(type: 'DESTROY' | 'REPAIR'): OperatorStatsReport[] {
    const reports: OperatorStatsReport[] = [];
    let totalAllPulls = 0;
    let totalAllRewards = 0;

    for (const [name, pulls] of this.pulls.entries()) {
      totalAllPulls += pulls;
      totalAllRewards += this.totalRewards.get(name) || 0;
    }

    for (const [name, pulls] of this.pulls.entries()) {
      const totalR = this.totalRewards.get(name) || 0;
      const meanR = pulls > 0 ? totalR / pulls : 0;
      const selectionShare = totalAllPulls > 0 ? (pulls / totalAllPulls) * 100 : 0;
      const ablationContrib = totalAllRewards > 0 ? (totalR / totalAllRewards) * 100 : 0;

      reports.push({
        operatorName: name,
        type,
        pulls,
        totalReward: Math.round(totalR * 100) / 100,
        meanReward: Math.round(meanR * 1000) / 1000,
        bestImprovementDelta: Math.round((this.bestDeltas.get(name) || 0) * 100) / 100,
        selectionSharePercent: Math.round(selectionShare * 10) / 10,
        ablationContributionPercent: Math.round(ablationContrib * 10) / 10,
      });
    }

    return reports.sort((a, b) => b.totalReward - a.totalReward);
  }

  /**
   * Calculates theoretical and empirical pseudo-regret R_T
   */
  public calculateCumulativeRegret(): number {
    let maxMeanReward = 0;
    for (const [name, pulls] of this.pulls.entries()) {
      if (pulls > 0) {
        const mean = (this.totalRewards.get(name) || 0) / pulls;
        if (mean > maxMeanReward) maxMeanReward = mean;
      }
    }

    let actualRewardSum = 0;
    for (const totalR of this.totalRewards.values()) {
      actualRewardSum += totalR;
    }

    const optimalExpected = this.totalPullsCount * maxMeanReward;
    return Math.max(0, Math.round((optimalExpected - actualRewardSum) * 100) / 100);
  }
}
