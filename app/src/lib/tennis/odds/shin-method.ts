/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 4: SHIN METHOD & NLP EPISTEMIC FUSION
 * 
 * 1. Shin (1993) Method:
 *    Removes bookmaker overround by solving for the fraction of insider/informed traders (z),
 *    yielding true vig-free fair probabilities without naive proportional scaling.
 * 
 * 2. NLP Epistemic Uncertainty Fusion:
 *    Converts observational news and injury events into variance-expansion modifiers,
 *    strictly preventing double-counting of news already priced in by market odds.
 */

export interface ShinDecompositionResult {
  decimal_odds_a: number
  decimal_odds_b: number
  raw_implied_prob_a: number // 1 / odds_a
  raw_implied_prob_b: number // 1 / odds_b
  bookmaker_overround: number // (1/odds_a + 1/odds_b) - 1
  shin_prob_a: number // Fair vig-free probability
  shin_prob_b: number // Fair vig-free probability
  insider_fraction_z: number // Parameter z representing informed insider trading fraction
  proportional_fair_prob_a: number // (1/odds_a) / overround (for comparison)
}

export interface EpistemicUncertaintyResult {
  base_probability: number
  injury_status: 'UNKNOWN' | 'QUESTIONABLE' | 'DOCUMENTED_ISSUE'
  epistemic_modifier: number // delta in [0.0, 0.35]
  unmodified_ci_95: [number, number]
  widened_ci_95: [number, number]
  effective_sample_size: number
  rationale: string
}

export class ShinOddsMethod {
  /**
   * Solves for Shin's insider fraction z and fair probabilities using numerical root finding.
   * f(z) = sum( sqrt( z^2 + 4*(1-z)*(pi_i / Pi) ) ) - (2 - z) - z = sum( ... ) - 2
   */
  public static calculateShinProbabilities(
    oddsA: number,
    oddsB: number,
    tolerance: number = 1e-7,
    maxIterations: number = 100
  ): ShinDecompositionResult {
    if (oddsA <= 1.0 || oddsB <= 1.0) {
      throw new Error(`Invalid decimal odds: odds must be strictly greater than 1.0 (got ${oddsA}, ${oddsB})`)
    }

    const piA = 1.0 / oddsA
    const piB = 1.0 / oddsB
    const Pi = piA + piB
    const overround = Pi - 1.0

    const propFairA = piA / Pi

    // Binary search for z in [0, 0.40]
    let low = 0.0
    let high = 0.40
    let z = 0.0

    const evalShin = (candZ: number): number => {
      const termA = Math.sqrt(candZ * candZ + 4 * (1 - candZ) * (piA / Pi))
      const termB = Math.sqrt(candZ * candZ + 4 * (1 - candZ) * (piB / Pi))
      return termA + termB - 2.0
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      z = (low + high) / 2.0
      const val = evalShin(z)

      if (Math.abs(val) < tolerance) {
        break
      }

      if (val > 0) {
        // Function is monotonically decreasing with z for two outcomes
        low = z
      } else {
        high = z
      }
    }

    // Recover fair probabilities using solved z
    const denom = 2 * (1 - z)
    const probA = denom > 0 ? (Math.sqrt(z * z + 4 * (1 - z) * (piA / Pi)) - z) / denom : propFairA
    const probB = denom > 0 ? (Math.sqrt(z * z + 4 * (1 - z) * (piB / Pi)) - z) / denom : 1 - propFairA

    // Normalize precisely to sum to 1.00000
    const sumP = probA + probB
    const normalizedA = Math.round((probA / sumP) * 100000) / 100000
    const normalizedB = Math.round((1.0 - normalizedA) * 100000) / 100000

    return {
      decimal_odds_a: oddsA,
      decimal_odds_b: oddsB,
      raw_implied_prob_a: Math.round(piA * 100000) / 100000,
      raw_implied_prob_b: Math.round(piB * 100000) / 100000,
      bookmaker_overround: Math.round(overround * 100000) / 100000,
      shin_prob_a: normalizedA,
      shin_prob_b: normalizedB,
      insider_fraction_z: Math.round(z * 100000) / 100000,
      proportional_fair_prob_a: Math.round(propFairA * 100000) / 100000,
    }
  }
}

export class NLPEpistemicUncertaintyEngine {
  /**
   * Applies epistemic variance expansion based on observational news/injury classification.
   * The point estimate P(Win) remains UNALTERED to prevent double-counting market-priced news.
   */
  public static calculateUncertaintyInterval(
    pointEstimate: number,
    injuryStatus: 'UNKNOWN' | 'QUESTIONABLE' | 'DOCUMENTED_ISSUE',
    effectiveSampleSize: number = 30
  ): EpistemicUncertaintyResult {
    const p = Math.max(0.01, Math.min(0.99, pointEstimate))

    // Base standard error from sample size
    const baseSE = Math.sqrt((p * (1 - p)) / effectiveSampleSize)

    let epistemicDelta = 0.0
    let rationale = 'No se registraron incidentes físicos recientes verificables.'

    if (injuryStatus === 'QUESTIONABLE') {
      epistemicDelta = 0.15
      rationale = 'Incertidumbre moderada por molestias reportadas o fatiga acumulada en rondas previas.'
    } else if (injuryStatus === 'DOCUMENTED_ISSUE') {
      epistemicDelta = 0.35
      rationale = 'Incertidumbre elevada por vendajes, historial médico verificado o declaraciones explícitas.'
    }

    const zCrit = 1.96 // 95% Confidence Interval
    const unmodifiedMargin = zCrit * baseSE
    const widenedMargin = zCrit * baseSE * (1 + epistemicDelta)

    const unmodifiedLow = Math.max(0.01, Math.round((p - unmodifiedMargin) * 1000) / 1000)
    const unmodifiedHigh = Math.min(0.99, Math.round((p + unmodifiedMargin) * 1000) / 1000)

    const widenedLow = Math.max(0.01, Math.round((p - widenedMargin) * 1000) / 1000)
    const widenedHigh = Math.min(0.99, Math.round((p + widenedMargin) * 1000) / 1000)

    return {
      base_probability: p,
      injury_status: injuryStatus,
      epistemic_modifier: epistemicDelta,
      unmodified_ci_95: [unmodifiedLow, unmodifiedHigh],
      widened_ci_95: [widenedLow, widenedHigh],
      effective_sample_size: effectiveSampleSize,
      rationale,
    }
  }
}
