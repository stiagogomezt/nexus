/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — STAGE 6: UNCERTAINTY QUANTIFICATION (UQ)
 * 
 * Formal Disentanglement of Epistemic vs Aleatoric Uncertainty:
 * 
 * 1. Epistemic Uncertainty (sigma_epistemic):
 *    - Model/parameter uncertainty caused by limited observations, rookie players, high Glicko RD,
 *      long periods of inactivity, missing surface history, or conflicting news reports.
 *    - Reducible with additional historical data.
 * 
 * 2. Aleatoric Uncertainty (sigma_aleatoric):
 *    - Irreducible intrinsic stochasticity of sports competition (point variance, deuce volatility,
 *      wind gusts, ball bounces, net cords).
 *    - Formulated via Bernoulli variance: sqrt(p * (1 - p)).
 * 
 * 3. Market Consensus Fusion via Shin Method:
 *    - Incorporates market fair probability p* and insider trading parameter z.
 *    - If z is elevated (sharp money consensus), model uncertainty tightens toward market prior.
 *    - If news reports are noisy or conflicting, epistemic interval expands without artificially shifting the mean.
 * 
 * 4. Bayesian Credible Intervals:
 *    - Generates rigorous 90% and 95% Credible Intervals [CI_lower, CI_upper].
 */

import { ShinOddsMethod } from '../odds/shin-method'
import { TennisNewsItem } from '../types'

export interface UncertaintyComponents {
  sigma_epistemic: number
  sigma_aleatoric: number
  sigma_total: number
  epistemic_sources: {
    glicko_rd_uncertainty: number
    inactivity_uncertainty: number
    news_entropy_uncertainty: number
    tier_penalty: number
  }
}

export interface CredibleInterval {
  ci_90_lower: number
  ci_90_upper: number
  ci_95_lower: number
  ci_95_upper: number
  credible_interval_width: number
}

export interface QuantifiedPrediction {
  p_win_point_estimate: number
  market_fair_p: number | null
  insider_trading_z: number | null
  uncertainty: UncertaintyComponents
  credible_intervals: CredibleInterval
  epistemic_ratio: number // sigma_epistemic^2 / sigma_total^2
  recommendation: 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'HIGH_UNCERTAINTY_NO_ACTION'
}

export class UncertaintyQuantificationEngine {
  /**
   * Computes rigorous Epistemic and Aleatoric uncertainty breakdown.
   */
  public static computeUncertainty(params: {
    pWin: number
    rdA: number
    rdB: number
    daysInactiveA: number
    daysInactiveB: number
    newsItems?: TennisNewsItem[]
    dataQualityTier: 'HIGH' | 'MEDIUM' | 'LOW'
  }): UncertaintyComponents {
    const { pWin, rdA, rdB, daysInactiveA, daysInactiveB, newsItems = [], dataQualityTier } = params

    // 1. Aleatoric Uncertainty: Intrinsic variance of Bernoulli outcome
    // Max at p = 0.5 (0.50), min at p = 0.95 (~0.217)
    // Scaled for match outcome distribution standard error
    const aleatoricVariance = pWin * (1.0 - pWin)
    const sigmaAleatoric = Math.round(Math.sqrt(aleatoricVariance) * 0.18 * 1000) / 1000

    // 2. Epistemic Uncertainty from Glicko RD (Rating Deviation)
    // Baseline RD is 350 for unknown, 40-70 for active elite
    const combinedRD = Math.sqrt(rdA * rdA + rdB * rdB)
    const rdUncertainty = Math.min(0.12, (combinedRD / (2 * 350)) * 0.12)

    // 3. Epistemic Uncertainty from Inactivity
    const maxInactivity = Math.max(daysInactiveA, daysInactiveB)
    const inactivityUncertainty = maxInactivity > 30 ? Math.min(0.06, ((maxInactivity - 30) / 180) * 0.06) : 0.0

    // 4. Epistemic Uncertainty from News Entropy / Conflicting sentiment
    let newsEntropy = 0.0
    if (newsItems.length > 0) {
      const questionableCount = newsItems.filter(
        (n) => n.injury_status === 'QUESTIONABLE' || n.injury_status === 'UNKNOWN'
      ).length
      newsEntropy = Math.min(0.08, questionableCount * 0.03)
    }

    // 5. Tier penalty
    const tierPenalty = dataQualityTier === 'LOW' ? 0.08 : dataQualityTier === 'MEDIUM' ? 0.03 : 0.0

    const totalEpistemic = Math.round((rdUncertainty + inactivityUncertainty + newsEntropy + tierPenalty) * 1000) / 1000

    // Total standard deviation via quadrature
    const totalVariance = totalEpistemic * totalEpistemic + sigmaAleatoric * sigmaAleatoric
    const sigmaTotal = Math.round(Math.sqrt(totalVariance) * 1000) / 1000

    return {
      sigma_epistemic: totalEpistemic,
      sigma_aleatoric: sigmaAleatoric,
      sigma_total: sigmaTotal,
      epistemic_sources: {
        glicko_rd_uncertainty: Math.round(rdUncertainty * 1000) / 1000,
        inactivity_uncertainty: Math.round(inactivityUncertainty * 1000) / 1000,
        news_entropy_uncertainty: Math.round(newsEntropy * 1000) / 1000,
        tier_penalty: tierPenalty,
      },
    }
  }

  /**
   * Quantifies prediction with full Credible Intervals and optional Shin Market Consensus.
   */
  public static quantifyPrediction(params: {
    pModel: number
    rdA: number
    rdB: number
    daysInactiveA: number
    daysInactiveB: number
    decimalOddsA?: number
    decimalOddsB?: number
    newsItems?: TennisNewsItem[]
    dataQualityTier: 'HIGH' | 'MEDIUM' | 'LOW'
  }): QuantifiedPrediction {
    let pFinal = params.pModel
    let fairMarketP: number | null = null
    let insiderZ: number | null = null

    // Shin method market consensus fusion if odds exist
    if (params.decimalOddsA && params.decimalOddsB) {
      const shin = ShinOddsMethod.calculateShinProbabilities(params.decimalOddsA, params.decimalOddsB)
      fairMarketP = shin.shin_prob_a
      insiderZ = shin.insider_fraction_z

      // If smart money / insider fraction z is detected, fuse with market prior
      if (insiderZ > 0.015) {
        const marketWeight = Math.min(0.35, insiderZ * 6.0)
        pFinal = (1.0 - marketWeight) * pFinal + marketWeight * fairMarketP
        pFinal = Math.round(pFinal * 10000) / 10000
      }
    }

    const uncertainty = this.computeUncertainty({
      pWin: pFinal,
      rdA: params.rdA,
      rdB: params.rdB,
      daysInactiveA: params.daysInactiveA,
      daysInactiveB: params.daysInactiveB,
      newsItems: params.newsItems,
      dataQualityTier: params.dataQualityTier,
    })

    // Z-scores for 90% (1.645) and 95% (1.960) credible intervals
    const z90 = 1.645
    const z95 = 1.960

    const ci90Lower = Math.max(0.01, Math.round((pFinal - z90 * uncertainty.sigma_total) * 1000) / 1000)
    const ci90Upper = Math.min(0.99, Math.round((pFinal + z90 * uncertainty.sigma_total) * 1000) / 1000)

    const ci95Lower = Math.max(0.01, Math.round((pFinal - z95 * uncertainty.sigma_total) * 1000) / 1000)
    const ci95Upper = Math.min(0.99, Math.round((pFinal + z95 * uncertainty.sigma_total) * 1000) / 1000)

    const epistemicRatio = Math.round(
      ((uncertainty.sigma_epistemic * uncertainty.sigma_epistemic) /
        (uncertainty.sigma_total * uncertainty.sigma_total)) * 100
    ) / 100

    let recommendation: 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'HIGH_UNCERTAINTY_NO_ACTION' = 'HIGH_CONFIDENCE'
    if (uncertainty.sigma_epistemic > 0.08 || uncertainty.sigma_total > 0.15) {
      recommendation = 'HIGH_UNCERTAINTY_NO_ACTION'
    } else if (uncertainty.sigma_epistemic > 0.04 || uncertainty.sigma_total > 0.10) {
      recommendation = 'MODERATE_CONFIDENCE'
    }

    return {
      p_win_point_estimate: pFinal,
      market_fair_p: fairMarketP,
      insider_trading_z: insiderZ,
      uncertainty,
      credible_intervals: {
        ci_90_lower: ci90Lower,
        ci_90_upper: ci90Upper,
        ci_95_lower: ci95Lower,
        ci_95_upper: ci95Upper,
        credible_interval_width: Math.round((ci95Upper - ci95Lower) * 1000) / 1000,
      },
      epistemic_ratio: epistemicRatio,
      recommendation,
    }
  }
}
