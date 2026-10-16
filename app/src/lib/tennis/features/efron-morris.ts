/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 3: EFRON-MORRIS SHRINKAGE & DEGRADATION
 * 
 * Implements Empirical Bayes Efron-Morris Shrinkage for Cold-Start Players (rookies / post-injury).
 * Replaces risky small-sample estimators by shrinking variance toward the empirical tour prior.
 * Strict Last Observation Carried Forward (LOCF) with zero future imputation.
 * Passes NULL for missing micro-telemetry (never fabricates data).
 */

import { TennisSurface, TennisTour } from '../types'

export interface EmpiricalTourPriors {
  mean_hold_pct: number
  mean_break_pct: number
  mean_first_serve_won: number
  mean_second_serve_won: number
  between_player_variance: number // tau^2
  within_player_variance: number // sigma_0^2
}

export const ATP_TOUR_PRIORS: Record<TennisSurface, EmpiricalTourPriors> = {
  Hard: {
    mean_hold_pct: 0.792,
    mean_break_pct: 0.208,
    mean_first_serve_won: 0.725,
    mean_second_serve_won: 0.515,
    between_player_variance: 0.0036, // tau^2 (std dev ~ 0.060)
    within_player_variance: 0.0450,  // sigma_0^2
  },
  Clay: {
    mean_hold_pct: 0.735,
    mean_break_pct: 0.265,
    mean_first_serve_won: 0.685,
    mean_second_serve_won: 0.490,
    between_player_variance: 0.0042,
    within_player_variance: 0.0500,
  },
  Grass: {
    mean_hold_pct: 0.835,
    mean_break_pct: 0.165,
    mean_first_serve_won: 0.755,
    mean_second_serve_won: 0.535,
    between_player_variance: 0.0032,
    within_player_variance: 0.0400,
  },
  Carpet: {
    mean_hold_pct: 0.840,
    mean_break_pct: 0.160,
    mean_first_serve_won: 0.760,
    mean_second_serve_won: 0.540,
    between_player_variance: 0.0030,
    within_player_variance: 0.0380,
  },
}

export const WTA_TOUR_PRIORS: Record<TennisSurface, EmpiricalTourPriors> = {
  Hard: {
    mean_hold_pct: 0.655,
    mean_break_pct: 0.345,
    mean_first_serve_won: 0.635,
    mean_second_serve_won: 0.445,
    between_player_variance: 0.0045,
    within_player_variance: 0.0480,
  },
  Clay: {
    mean_hold_pct: 0.615,
    mean_break_pct: 0.385,
    mean_first_serve_won: 0.605,
    mean_second_serve_won: 0.425,
    between_player_variance: 0.0050,
    within_player_variance: 0.0520,
  },
  Grass: {
    mean_hold_pct: 0.695,
    mean_break_pct: 0.305,
    mean_first_serve_won: 0.665,
    mean_second_serve_won: 0.465,
    between_player_variance: 0.0040,
    within_player_variance: 0.0440,
  },
  Carpet: {
    mean_hold_pct: 0.700,
    mean_break_pct: 0.300,
    mean_first_serve_won: 0.670,
    mean_second_serve_won: 0.470,
    between_player_variance: 0.0038,
    within_player_variance: 0.0420,
  },
}

export interface ColdStartPlayerMetrics {
  player_id: string
  sample_size_matches: number
  raw_hold_pct: number
  shrunk_hold_pct: number
  raw_break_pct: number
  shrunk_break_pct: number
  shrinkage_factor_B: number // 1 = 100% prior (rookie), 0 = 100% sample (veteran)
  is_cold_start: boolean
  micro_shot_speed_kmh: number | null // null when telemetry is unavailable
  micro_spin_rpm: number | null
}

export class EfronMorrisShrinkageEngine {
  /**
   * Calculates the Efron-Morris shrinkage factor B_i and regularized metric theta_i.
   * 
   * B_i = sigma_0^2 / (sigma_0^2 + N_i * tau^2)
   * theta_i = (1 - B_i) * Y_bar_i + B_i * mu_0
   */
  public static calculateShrinkage(
    sampleValue: number,
    sampleSize: number,
    priorMean: number,
    withinVarSigma0Sq: number,
    betweenVarTauSq: number
  ): { shrunkValue: number; shrinkageFactorB: number } {
    if (sampleSize <= 0) {
      return { shrunkValue: priorMean, shrinkageFactorB: 1.0 }
    }

    const numerator = withinVarSigma0Sq
    const denominator = withinVarSigma0Sq + sampleSize * betweenVarTauSq
    const B = Math.max(0, Math.min(1.0, numerator / denominator))

    const shrunkValue = (1 - B) * sampleValue + B * priorMean
    return {
      shrunkValue: Math.round(shrunkValue * 10000) / 10000,
      shrinkageFactorB: Math.round(B * 10000) / 10000,
    }
  }

  /**
   * Regularizes player metrics for a given match setting.
   * Gracefully degrades micro-telemetry to null when unobserved.
   */
  public static regularizePlayer(
    playerId: string,
    tour: TennisTour,
    surface: TennisSurface,
    sampleMatches: number,
    rawHoldPct: number,
    rawBreakPct: number,
    telemetry?: { shot_speed?: number; spin_rpm?: number }
  ): ColdStartPlayerMetrics {
    const priorsTable = tour === 'ATP' ? ATP_TOUR_PRIORS : WTA_TOUR_PRIORS
    const surfacePrior = priorsTable[surface] || priorsTable.Hard

    // Hold% Shrinkage
    const holdShrink = this.calculateShrinkage(
      rawHoldPct,
      sampleMatches,
      surfacePrior.mean_hold_pct,
      surfacePrior.within_player_variance,
      surfacePrior.between_player_variance
    )

    // Break% Shrinkage
    const breakShrink = this.calculateShrinkage(
      rawBreakPct,
      sampleMatches,
      surfacePrior.mean_break_pct,
      surfacePrior.within_player_variance,
      surfacePrior.between_player_variance
    )

    const isColdStart = sampleMatches < 20

    return {
      player_id: playerId,
      sample_size_matches: sampleMatches,
      raw_hold_pct: rawHoldPct,
      shrunk_hold_pct: holdShrink.shrunkValue,
      raw_break_pct: rawBreakPct,
      shrunk_break_pct: breakShrink.shrunkValue,
      shrinkage_factor_B: holdShrink.shrinkageFactorB,
      is_cold_start: isColdStart,
      // Strictly do not fabricate micro-stats if missing
      micro_shot_speed_kmh: telemetry?.shot_speed ?? null,
      micro_spin_rpm: telemetry?.spin_rpm ?? null,
    }
  }
}
