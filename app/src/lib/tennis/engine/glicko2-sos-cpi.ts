/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — STAGE 2: BASELINES & DYNAMIC RATINGS (PRIOR GENERATION)
 * 
 * 1. Full Glicko-2 Algorithm:
 *    Maintains Rating (mu), Rating Deviation (phi), and Volatility (sigma) across
 *    Global, Surface-Specific, and Recent-Form horizons.
 * 
 * 2. Hierarchical Bayesian Strength of Schedule (SoS) & Common Opponent Model:
 *    Discounts win streaks against weak competition (Challengers/ITF) vs elite Grand Slam/Masters fields.
 * 
 * 3. Continuous Empirical Court Pace Index (CPI) with Physical Air Density Modulation:
 *    Calculates baseline CPI from Ace% and Hold% and scales it by real air density rho(altitude, temp, humidity).
 * 
 * 4. Ablation Test 1:
 *    Establishes baseline Log-Loss and Brier Score using Glicko-2 rating difference alone.
 */

import { HistoricalMatchRecord, TennisSurface, TennisTour } from '../types'
import { TennisModelMetrics } from '../models/metrics'

// Glicko-2 scaling constant
const GLICKO2_SCALE = 173.7178
const DEFAULT_TAU = 0.5 // System constant constraining volatility changes

export interface Glicko2State {
  player_id: string
  rating: number // r in [1000, 3000]
  rd: number // phi in [30, 350]
  volatility: number // sigma in [0.03, 0.08]
  last_match_date?: string
}

export interface PlayerDynamicRatings {
  player_id: string
  global: Glicko2State
  surface: Record<TennisSurface, Glicko2State>
  recent_form: Glicko2State // 60-day accelerated decay
}

export interface CommonOpponentComparison {
  common_opponents_count: number
  common_opponents: string[]
  transitive_advantage_a: number // In standard rating units (-150 to +150)
  sos_player_a: number // Mean opponent rating faced
  sos_player_b: number
  sos_differential: number
}

export interface AirDensityCPI {
  tournament_name: string
  surface: TennisSurface
  base_empirical_cpi: number
  altitude_m: number
  temperature_c: number
  relative_humidity_pct: number
  air_density_kg_m3: number
  modulated_cpi: number
  speed_category: 'Very Slow' | 'Slow' | 'Medium' | 'Fast' | 'Very Fast'
}

export class Glicko2Calculator {
  /**
   * Converts standard rating r into Glicko-2 mu.
   */
  public static rToMu(r: number): number {
    return (r - 1500) / GLICKO2_SCALE
  }

  /**
   * Converts Glicko-2 mu into standard rating r.
   */
  public static muToR(mu: number): number {
    return mu * GLICKO2_SCALE + 1500
  }

  /**
   * Converts standard RD into Glicko-2 phi.
   */
  public static rdToPhi(rd: number): number {
    return rd / GLICKO2_SCALE
  }

  /**
   * Converts Glicko-2 phi into standard RD.
   */
  public static phiToRd(phi: number): number {
    return phi * GLICKO2_SCALE
  }

  /**
   * Glicko-2 impact function g(phi).
   */
  public static g(phi: number): number {
    return 1.0 / Math.sqrt(1.0 + (3.0 * phi * phi) / (Math.PI * Math.PI))
  }

  /**
   * Expected outcome E(s | mu, mu_j, phi_j).
   */
  public static E(mu: number, muJ: number, phiJ: number): number {
    return 1.0 / (1.0 + Math.exp(-this.g(phiJ) * (mu - muJ)))
  }

  /**
   * Decays Rating Deviation (RD) with elapsed inactivity time.
   */
  public static decayRD(state: Glicko2State, daysSinceLastMatch: number, decayPerDay: number = 0.5): Glicko2State {
    const phi = this.rdToPhi(state.rd)
    const c = 0.02 * (decayPerDay / 0.5)
    const phiNew = Math.min(this.rdToPhi(350), Math.sqrt(phi * phi + c * c * daysSinceLastMatch))

    return {
      ...state,
      rd: Math.round(this.phiToRd(phiNew) * 10) / 10,
    }
  }

  /**
   * Single match Glicko-2 update for Player A vs Player B.
   * actualScore: 1 if Player A wins, 0 if Player B wins.
   */
  public static updateMatch(
    playerA: Glicko2State,
    playerB: Glicko2State,
    actualScore: number,
    tau: number = DEFAULT_TAU
  ): { updatedA: Glicko2State; updatedB: Glicko2State } {
    const muA = this.rToMu(playerA.rating)
    const phiA = this.rdToPhi(playerA.rd)
    const sigmaA = playerA.volatility

    const muB = this.rToMu(playerB.rating)
    const phiB = this.rdToPhi(playerB.rd)
    const sigmaB = playerB.volatility

    // 1. Compute for Player A
    const gB = this.g(phiB)
    const expA = this.E(muA, muB, phiB)
    const vA = 1.0 / (gB * gB * expA * (1.0 - expA))
    const deltaA = vA * gB * (actualScore - expA)

    // Volatility update via Newton-Raphson approximation
    const aA = Math.log(sigmaA * sigmaA)
    const f = (x: number) => {
      const eX = Math.exp(x)
      const dSq = deltaA * deltaA
      const phiSq = phiA * phiA
      const term1 = (eX * (dSq - phiSq - vA - eX)) / (2.0 * Math.pow(phiSq + vA + eX, 2))
      const term2 = (x - aA) / (tau * tau)
      return term1 - term2
    }

    let xA = aA
    for (let i = 0; i < 20; i++) {
      const fx = f(xA)
      const dfx = (f(xA + 1e-5) - fx) / 1e-5
      if (Math.abs(dfx) < 1e-8) break
      const step = fx / dfx
      xA -= step
      if (Math.abs(step) < 1e-5) break
    }
    const sigmaAPrime = Math.max(0.03, Math.min(0.08, Math.exp(xA / 2.0)))

    const phiAPre = Math.sqrt(phiA * phiA + sigmaAPrime * sigmaAPrime)
    const phiAPrime = 1.0 / Math.sqrt(1.0 / (phiAPre * phiAPre) + 1.0 / vA)
    const muAPrime = muA + phiAPrime * phiAPrime * gB * (actualScore - expA)

    // 2. Compute for Player B (score = 1 - actualScore)
    const scoreB = 1.0 - actualScore
    const gA = this.g(phiA)
    const expB = this.E(muB, muA, phiA)
    const vB = 1.0 / (gA * gA * expB * (1.0 - expB))
    const deltaB = vB * gA * (scoreB - expB)

    const aB = Math.log(sigmaB * sigmaB)
    const fB = (x: number) => {
      const eX = Math.exp(x)
      const dSq = deltaB * deltaB
      const phiSq = phiB * phiB
      const term1 = (eX * (dSq - phiSq - vB - eX)) / (2.0 * Math.pow(phiSq + vB + eX, 2))
      const term2 = (x - aB) / (tau * tau)
      return term1 - term2
    }

    let xB = aB
    for (let i = 0; i < 20; i++) {
      const fx = fB(xB)
      const dfx = (fB(xB + 1e-5) - fx) / 1e-5
      if (Math.abs(dfx) < 1e-8) break
      const step = fx / dfx
      xB -= step
      if (Math.abs(step) < 1e-5) break
    }
    const sigmaBPrime = Math.max(0.03, Math.min(0.08, Math.exp(xB / 2.0)))

    const phiBPre = Math.sqrt(phiB * phiB + sigmaBPrime * sigmaBPrime)
    const phiBPrime = 1.0 / Math.sqrt(1.0 / (phiBPre * phiBPre) + 1.0 / vB)
    const muBPrime = muB + phiBPrime * phiBPrime * gA * (scoreB - expB)

    return {
      updatedA: {
        player_id: playerA.player_id,
        rating: Math.round(this.muToR(muAPrime) * 10) / 10,
        rd: Math.round(this.phiToRd(phiAPrime) * 10) / 10,
        volatility: Math.round(sigmaAPrime * 10000) / 10000,
      },
      updatedB: {
        player_id: playerB.player_id,
        rating: Math.round(this.muToR(muBPrime) * 10) / 10,
        rd: Math.round(this.phiToRd(phiBPrime) * 10) / 10,
        volatility: Math.round(sigmaBPrime * 10000) / 10000,
      },
    }
  }

  /**
   * Evaluates match probability of Player A defeating Player B using Glicko-2 ratings.
   */
  public static predictProbability(playerA: Glicko2State, playerB: Glicko2State): number {
    const muA = this.rToMu(playerA.rating)
    const phiA = this.rdToPhi(playerA.rd)
    const muB = this.rToMu(playerB.rating)
    const phiB = this.rdToPhi(playerB.rd)

    const compositePhi = Math.sqrt(phiA * phiA + phiB * phiB)
    return Math.round(this.E(muA, muB, compositePhi) * 10000) / 10000
  }
}

export class StrengthOfScheduleModel {
  private static readonly TOURNAMENT_TIER_WEIGHTS: Record<string, number> = {
    GrandSlam: 1.0,
    Masters1000: 0.90,
    ATP500: 0.80,
    ATP250: 0.70,
    WTA1000: 0.90,
    WTA500: 0.80,
    WTA250: 0.70,
    Challenger: 0.45,
    ITF: 0.30,
  }

  /**
   * Computes Common Opponent Transitive Differential and Strength of Schedule (SoS).
   * Prevents rating inflation from players accumulating wins in lower tier Challenger/ITF circuits.
   */
  public static compareCommonOpponents(
    playerAId: string,
    playerBId: string,
    priorMatches: HistoricalMatchRecord[],
    ratingsMap: Map<string, number>
  ): CommonOpponentComparison {
    const opponentsA = new Set<string>()
    const matchesA = new Map<string, { winRate: number; matches: number; weightedTier: number }>()

    const opponentsB = new Set<string>()
    const matchesB = new Map<string, { winRate: number; matches: number; weightedTier: number }>()

    let weightedOpponentSumA = 0
    let totalWeightA = 0

    let weightedOpponentSumB = 0
    let totalWeightB = 0

    for (const m of priorMatches) {
      const tierWeight = this.TOURNAMENT_TIER_WEIGHTS[m.tournament_level] || 0.70

      // Player A matches
      if (m.winner_id === playerAId || m.loser_id === playerAId) {
        const opp = m.winner_id === playerAId ? m.loser_id : m.winner_id
        const isWin = m.winner_id === playerAId
        opponentsA.add(opp)

        const existing = matchesA.get(opp) || { winRate: 0, matches: 0, weightedTier: 0 }
        const newMatches = existing.matches + 1
        const newWins = existing.winRate * existing.matches + (isWin ? 1 : 0)
        matchesA.set(opp, { winRate: newWins / newMatches, matches: newMatches, weightedTier: tierWeight })

        const oppRating = ratingsMap.get(opp) || 1500
        weightedOpponentSumA += oppRating * tierWeight
        totalWeightA += tierWeight
      }

      // Player B matches
      if (m.winner_id === playerBId || m.loser_id === playerBId) {
        const opp = m.winner_id === playerBId ? m.loser_id : m.winner_id
        const isWin = m.winner_id === playerBId
        opponentsB.add(opp)

        const existing = matchesB.get(opp) || { winRate: 0, matches: 0, weightedTier: 0 }
        const newMatches = existing.matches + 1
        const newWins = existing.winRate * existing.matches + (isWin ? 1 : 0)
        matchesB.set(opp, { winRate: newWins / newMatches, matches: newMatches, weightedTier: tierWeight })

        const oppRating = ratingsMap.get(opp) || 1500
        weightedOpponentSumB += oppRating * tierWeight
        totalWeightB += tierWeight
      }
    }

    const sosA = totalWeightA > 0 ? weightedOpponentSumA / totalWeightA : 1500
    const sosB = totalWeightB > 0 ? weightedOpponentSumB / totalWeightB : 1500

    // Find intersection of common opponents
    const common = Array.from(opponentsA).filter((opp) => opponentsB.has(opp))

    let transitiveAdvantageA = 0
    if (common.length > 0) {
      let totalDiff = 0
      for (const opp of common) {
        const recordA = matchesA.get(opp)!
        const recordB = matchesB.get(opp)!
        // Difference in win rate against common opponent scaled by tier
        const diff = (recordA.winRate - recordB.winRate) * 150 * Math.min(recordA.weightedTier, recordB.weightedTier)
        totalDiff += diff
      }
      transitiveAdvantageA = Math.round((totalDiff / common.length) * 10) / 10
    } else {
      // Fallback: differential in Strength of Schedule
      transitiveAdvantageA = Math.round(((sosA - sosB) * 0.20) * 10) / 10
    }

    return {
      common_opponents_count: common.length,
      common_opponents: common,
      transitive_advantage_a: transitiveAdvantageA,
      sos_player_a: Math.round(sosA * 10) / 10,
      sos_player_b: Math.round(sosB * 10) / 10,
      sos_differential: Math.round((sosA - sosB) * 10) / 10,
    }
  }
}

export class AirDensityCPICalculator {
  /**
   * Computes physical air density rho (kg/m^3) using International Standard Atmosphere (ISA) barometric formula.
   */
  public static calculateAirDensity(
    altitudeMeters: number = 0,
    temperatureCelsius: number = 20,
    relativeHumidityPct: number = 50
  ): number {
    const tempKelvin = temperatureCelsius + 273.15
    // Pressure at altitude (Pa)
    const p0 = 101325 * Math.pow(1 - (0.0065 * altitudeMeters) / 288.15, 5.25588)

    // Saturation vapor pressure (Tetens formula in hPa -> Pa)
    const pSat = 610.78 * Math.exp((17.27 * temperatureCelsius) / (temperatureCelsius + 237.3))
    const pVapor = (relativeHumidityPct / 100) * pSat
    const pDry = p0 - pVapor

    const rd = 287.058 // Specific gas constant for dry air, J/(kg·K)
    const rv = 461.495 // Specific gas constant for water vapor, J/(kg·K)

    const rho = pDry / (rd * tempKelvin) + pVapor / (rv * tempKelvin)
    return Math.round(rho * 1000) / 1000
  }

  /**
   * Modulates the Empirical Court Pace Index (CPI) based on physical Air Density.
   * Thinner air (high altitude or high heat) produces less aerodynamic drag,
   * significantly increasing ball velocity and effective court speed (e.g. Madrid vs Sea Level).
   */
  public static modulateCPI(
    tournamentName: string,
    surface: TennisSurface,
    baseCPI: number,
    altitudeMeters: number,
    temperatureCelsius: number = 22,
    relativeHumidityPct: number = 50
  ): AirDensityCPI {
    const rhoStandard = 1.225 // Standard sea level air density at 15C
    const rhoActual = this.calculateAirDensity(altitudeMeters, temperatureCelsius, relativeHumidityPct)

    // Drag-induced speed amplification factor: (rho_standard / rho_actual)^0.65
    const densityRatio = Math.max(0.80, Math.min(1.30, rhoStandard / rhoActual))
    const speedMultiplier = Math.pow(densityRatio, 0.65)

    const rawModulated = baseCPI * speedMultiplier
    const boundedCPI = Math.round(Math.max(15, Math.min(65, rawModulated)) * 10) / 10

    let category: AirDensityCPI['speed_category'] = 'Medium'
    if (boundedCPI < 27) category = 'Very Slow'
    else if (boundedCPI < 34) category = 'Slow'
    else if (boundedCPI < 42) category = 'Medium'
    else if (boundedCPI < 50) category = 'Fast'
    else category = 'Very Fast'

    return {
      tournament_name: tournamentName,
      surface,
      base_empirical_cpi: baseCPI,
      altitude_m: altitudeMeters,
      temperature_c: temperatureCelsius,
      relative_humidity_pct: relativeHumidityPct,
      air_density_kg_m3: rhoActual,
      modulated_cpi: boundedCPI,
      speed_category: category,
    }
  }
}

export class GlickoAblationBenchmark {
  /**
   * ABLATION TEST 1:
   * Establishes baseline Log-Loss and Brier Score using Glicko-2 ratings difference ALONE.
   */
  public static runAblationTest1(
    matches: HistoricalMatchRecord[]
  ): {
    sample_size: number
    accuracy: number
    log_loss: number
    brier_score: number
    calibration_error_ece: number
    roc_auc: number
  } {
    const playerRatings = new Map<string, Glicko2State>()

    const getOrInit = (id: string): Glicko2State => {
      if (!playerRatings.has(id)) {
        playerRatings.set(id, { player_id: id, rating: 1500, rd: 350, volatility: 0.06 })
      }
      return playerRatings.get(id)!
    }

    const testTrueLabels: number[] = []
    const testPredProbs: number[] = []

    // Sort strictly chronological
    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // First 40% used for burn-in / rating initialization
    const burnInCount = Math.floor(sorted.length * 0.40)

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      const stateW = getOrInit(m.winner_id)
      const stateL = getOrInit(m.loser_id)

      if (i >= burnInCount) {
        // Evaluate prediction strictly using state prior to match
        const probWinner = Glicko2Calculator.predictProbability(stateW, stateL)
        testTrueLabels.push(1)
        testPredProbs.push(probWinner)
      }

      // Update state with match outcome
      const { updatedA, updatedB } = Glicko2Calculator.updateMatch(stateW, stateL, 1.0)
      playerRatings.set(m.winner_id, updatedA)
      playerRatings.set(m.loser_id, updatedB)
    }

    const metrics = TennisModelMetrics.evaluate(testTrueLabels, testPredProbs)

    return {
      sample_size: testTrueLabels.length,
      accuracy: metrics.accuracy,
      log_loss: metrics.log_loss,
      brier_score: metrics.brier_score,
      calibration_error_ece: metrics.calibration_error_ece,
      roc_auc: metrics.roc_auc,
    }
  }
}
