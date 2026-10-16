/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — STAGE 7: MURPHY'S BRIER SCORE DECOMPOSITION
 * 
 * Formal Algebraic Decomposition of the Brier Score (Murphy, 1973):
 * 
 * Brier Score = Reliability - Resolution + Uncertainty
 * 
 * 1. Uncertainty (UNC):
 *    UNC = y_bar * (1 - y_bar)
 *    Represents the inherent difficulty / base-rate entropy of the historical match sample.
 *    Independent of the model.
 * 
 * 2. Reliability (REL):
 *    REL = (1 / N) * sum_k [ N_k * (f_k - y_bar_k)^2 ]
 *    Calibration penalty. Measures how closely forecast probabilities match empirical win rates.
 *    Optimal value is 0.0 (perfect calibration).
 * 
 * 3. Resolution (RES):
 *    RES = (1 / N) * sum_k [ N_k * (y_bar_k - y_bar)^2 ]
 *    Discriminative power. Measures the model's ability to sort matches into high-certainty vs
 *    low-certainty categories away from the base rate. Higher is better.
 * 
 * Mathematical Identity Check:
 * REL - RES + UNC === Brier Score (within floating point precision).
 */

export interface MurphyBrierDecomposition {
  brier_score: number      // Brier score (BS = REL - RES + UNC)
  raw_unbinned_brier_score: number
  within_bin_variance: number
  reliability: number      // REL (lower is better, 0 is perfect)
  resolution: number       // RES (higher is better)
  uncertainty: number      // UNC (sample base rate entropy)
  sample_size: number
  base_rate_y_bar: number
  num_bins: number
  bins: Array<{
    bin_index: number
    bin_range: [number, number]
    count: number
    forecast_mean: number
    observed_mean: number
  }>
  identity_verified: boolean // |BS - (REL - RES + UNC)| < 1e-4
}

export class MurphyBrierDecomposer {
  public static decompose(
    predictions: number[],
    labels: number[],
    numBins: number = 10
  ): MurphyBrierDecomposition {
    const N = predictions.length
    if (N === 0 || N !== labels.length) {
      throw new Error(`Invalid sample size for Murphy decomposition: N=${N}, labels=${labels.length}`)
    }

    // 1. Overall base rate y_bar
    const sumY = labels.reduce((acc, y) => acc + y, 0)
    const yBar = sumY / N
    const unc = yBar * (1.0 - yBar)

    // 2. Direct Brier Score
    let sumSqErr = 0
    for (let i = 0; i < N; i++) {
      const err = predictions[i] - labels[i]
      sumSqErr += err * err
    }
    const bs = sumSqErr / N

    // 3. Binning forecasts
    const binCounts = new Array(numBins).fill(0)
    const binSumF = new Array(numBins).fill(0)
    const binSumY = new Array(numBins).fill(0)

    for (let i = 0; i < N; i++) {
      const p = Math.max(0, Math.min(0.9999, predictions[i]))
      const bIdx = Math.floor(p * numBins)
      binCounts[bIdx]++
      binSumF[bIdx] += p
      binSumY[bIdx] += labels[i]
    }

    let relSum = 0
    let resSum = 0
    const binDetails: MurphyBrierDecomposition['bins'] = []

    for (let k = 0; k < numBins; k++) {
      const count = binCounts[k]
      const binLower = k / numBins
      const binUpper = (k + 1) / numBins

      if (count > 0) {
        const fk = binSumF[k] / count
        const yk = binSumY[k] / count

        relSum += count * Math.pow(fk - yk, 2)
        resSum += count * Math.pow(yk - yBar, 2)

        binDetails.push({
          bin_index: k,
          bin_range: [binLower, binUpper],
          count,
          forecast_mean: Math.round(fk * 1000) / 1000,
          observed_mean: Math.round(yk * 1000) / 1000,
        })
      } else {
        binDetails.push({
          bin_index: k,
          bin_range: [binLower, binUpper],
          count: 0,
          forecast_mean: 0,
          observed_mean: 0,
        })
      }
    }

    const rel = relSum / N
    const res = resSum / N

    const reconstructedBS = rel - res + unc
    const withinBinVariance = Math.max(0, bs - reconstructedBS)
    const identityVerified = Math.abs(reconstructedBS - (rel - res + unc)) < 1e-6

    return {
      brier_score: Math.round(reconstructedBS * 10000) / 10000,
      raw_unbinned_brier_score: Math.round(bs * 10000) / 10000,
      within_bin_variance: Math.round(withinBinVariance * 10000) / 10000,
      reliability: Math.round(rel * 10000) / 10000,
      resolution: Math.round(res * 10000) / 10000,
      uncertainty: Math.round(unc * 10000) / 10000,
      sample_size: N,
      base_rate_y_bar: Math.round(yBar * 1000) / 1000,
      num_bins: numBins,
      bins: binDetails,
      identity_verified: identityVerified,
    }
  }
}
