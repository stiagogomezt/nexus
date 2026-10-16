/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — MASTER QUANTITATIVE PREDICTIVE ENGINE
 * 
 * Orchestrates the complete 8-Stage Bayesian and Machine Learning Forecasting Pipeline:
 * - Stage 1: Point-in-Time State & Leakage Prevention
 * - Stage 2: Dynamic Priors (Glicko-2, SoS, Physical Air Density CPI)
 * - Stage 3: Micro-Dynamics (Hierarchical Markov Chain & Monte Carlo)
 * - Stage 4: Non-Linear Residual ML Modeling (Zero Player-ID Categoricals, Tree-SHAP)
 * - Stage 5: Bayesian Model Averaging (BMA) & Multi-Parameter Beta Calibration
 * - Stage 6: Disentangled Uncertainty Quantification (Epistemic vs Aleatoric, Credible Intervals)
 * - Stage 7: Murphy's Brier Score Decomposition (Reliability, Resolution, Uncertainty)
 * - Stage 8: Append-Only Model Governance & Cryptographic Artifact Registry
 */

import { TennisSurface, TennisTour, TennisDataQualityTier, TennisNewsItem } from '../types'
import { Glicko2Calculator, Glicko2State, AirDensityCPICalculator, StrengthOfScheduleModel } from './glicko2-sos-cpi'
import { TennisMarkovModel, MatchOutcomeDistribution } from './markov-simulator'
import { PlayerAgnosticResidualBoostingModel, PlayerAgnosticFeatures, FeatureShapAttribution } from './residual-ml-model'
import { BayesianModelEnsemble, BetaCalibrator } from './ensemble-calibration'
import { UncertaintyQuantificationEngine, QuantifiedPrediction } from './uncertainty-quantification'
import { MurphyBrierDecomposer, MurphyBrierDecomposition } from './murphy-brier-decomposition'
import { TennisModelRegistry } from './model-registry'

export interface NTPLMatchInput {
  player_a: {
    id: string
    hand: 'R' | 'L'
    backhand: '1H' | '2H'
    hold_pct: number
    break_pct: number
    days_inactive: number
    workload_ewma: number
  }
  player_b: {
    id: string
    hand: 'R' | 'L'
    backhand: '1H' | '2H'
    hold_pct: number
    break_pct: number
    days_inactive: number
    workload_ewma: number
  }
  tournament: {
    name: string
    city: string
    surface: TennisSurface
    tour: TennisTour
    level: 'GrandSlam' | 'Masters1000' | 'ATP500' | 'ATP250' | 'WTA1000' | 'WTA500' | 'WTA250'
    altitude_m: number
    temperature_c: number
    humidity_pct: number
    base_cpi: number
  }
  odds?: {
    decimal_a: number
    decimal_b: number
  }
  news_items?: TennisNewsItem[]
  data_quality_tier?: TennisDataQualityTier
}

export interface NTPLComprehensivePrediction {
  matchup_summary: {
    surface: TennisSurface
    tour: TennisTour
    format: 'BestOf3' | 'BestOf5'
    effective_cpi: number
  }
  stage_predictions: {
    glicko2_prior_p_win_a: number
    markov_p_win_a: number
    residual_ml_p_win_a: number
    bma_ensemble_p_win_a: number
    beta_calibrated_p_win_a: number
  }
  market_analysis?: {
    market_fair_p_a: number
    insider_fraction_z: number
    implied_probability_raw_a: number
    expected_value_edge_pct: number
  }
  markov_distributions: MatchOutcomeDistribution
  uncertainty_quantification: QuantifiedPrediction
  tree_shap_associations: FeatureShapAttribution[]
  governance: {
    pipeline_version: string
    zero_player_id_verified: true
    attribution_type: 'ASSOCIATIVE_ONLY'
    causal_overclaim_prohibited: true
    data_quality_tier: TennisDataQualityTier
  }
}

export class NexusTennisPredictiveLab {
  private static instance: NexusTennisPredictiveLab
  private residualMlModel: PlayerAgnosticResidualBoostingModel
  private ensemble: BayesianModelEnsemble
  private betaCalibrator: BetaCalibrator

  constructor() {
    this.residualMlModel = new PlayerAgnosticResidualBoostingModel({
      learningRate: 0.08,
      numTrees: 20,
      maxDepth: 2,
    })
    this.betaCalibrator = new BetaCalibrator({ a: 1.04, b: 1.04, c: 0.0 })
    this.ensemble = new BayesianModelEnsemble(this.betaCalibrator)
  }

  public static getInstance(): NexusTennisPredictiveLab {
    if (!this.instance) {
      this.instance = new NexusTennisPredictiveLab()
    }
    return this.instance
  }

  /**
   * Generates an end-to-end quantitative prediction executing the full NTPL pipeline.
   */
  public predict(
    input: NTPLMatchInput,
    glickoA: Glicko2State,
    glickoB: Glicko2State
  ): NTPLComprehensivePrediction {
    const tier = input.data_quality_tier ?? 'HIGH'
    const isGrandSlam = input.tournament.level === 'GrandSlam' && input.tournament.tour === 'ATP'
    const format = isGrandSlam ? 'BestOf5' : 'BestOf3'

    // 1. Stage 2: Physical Air Density Modulated CPI
    const modulatedCpi = AirDensityCPICalculator.modulateCPI(
      input.tournament.city,
      input.tournament.surface,
      input.tournament.base_cpi,
      input.tournament.altitude_m,
      input.tournament.temperature_c,
      input.tournament.humidity_pct
    )

    // Stage 2: Glicko-2 Prior
    const pGlicko = Glicko2Calculator.predictProbability(glickoA, glickoB)

    // 2. Stage 3: Hierarchical Markov Chain
    const serveProbs = TennisMarkovModel.derivePointServeProbabilities(
      {
        hold_pct: input.player_a.hold_pct,
        break_pct: input.player_a.break_pct,
        hand: input.player_a.hand,
        backhand: input.player_a.backhand,
      },
      {
        hold_pct: input.player_b.hold_pct,
        break_pct: input.player_b.break_pct,
        hand: input.player_b.hand,
        backhand: input.player_b.backhand,
      },
      input.tournament.surface,
      input.tournament.tour,
      modulatedCpi.modulated_cpi
    )

    const markovDist = TennisMarkovModel.calcMatchDistribution(
      serveProbs.p_serve_a,
      serveProbs.p_serve_b,
      format
    )

    // 3. Stage 4: Non-Linear Residual ML Modeling (Zero Player-ID)
    const diffHold = input.player_a.hold_pct - input.player_b.hold_pct
    const diffBreak = input.player_a.break_pct - input.player_b.break_pct

    let styleAsymmetry = 0
    if (input.player_a.hand === 'L' && input.player_b.backhand === '1H') styleAsymmetry = 1
    if (input.player_b.hand === 'L' && input.player_a.backhand === '1H') styleAsymmetry = -1

    const features: PlayerAgnosticFeatures = {
      diff_glicko_mu: (glickoA.rating - glickoB.rating) / 173.7178,
      diff_rd: glickoA.rd - glickoB.rd,
      combined_rd: Math.sqrt(glickoA.rd * glickoA.rd + glickoB.rd * glickoB.rd),
      diff_surface_elo: (glickoA.rating - glickoB.rating) / 200,
      diff_hold_pct: diffHold,
      diff_break_pct: diffBreak,
      cpi_serve_interaction: (modulatedCpi.modulated_cpi - 37.0) * diffHold,
      fatigue_differential: input.player_a.workload_ewma - input.player_b.workload_ewma,
      rest_days_differential: Math.log(1 + input.player_a.days_inactive) - Math.log(1 + input.player_b.days_inactive),
      style_asymmetry: styleAsymmetry,
      is_grand_slam: isGrandSlam ? 1 : 0,
    }

    const residualPred = this.residualMlModel.predict(features, markovDist.p_win_a)

    // 4. Stage 5: Bayesian Model Averaging & Beta Calibration
    const ensembleResult = this.ensemble.combineAndCalibrate(
      {
        p_glicko: pGlicko,
        p_markov: markovDist.p_win_a,
        p_residual_ml: residualPred.p_final_calibrated,
      },
      tier
    )

    // 5. Stage 6: Disentangled Uncertainty Quantification & Shin Market Fusion
    const uq = UncertaintyQuantificationEngine.quantifyPrediction({
      pModel: ensembleResult.p_calibrated,
      rdA: glickoA.rd,
      rdB: glickoB.rd,
      daysInactiveA: input.player_a.days_inactive,
      daysInactiveB: input.player_b.days_inactive,
      decimalOddsA: input.odds?.decimal_a,
      decimalOddsB: input.odds?.decimal_b,
      newsItems: input.news_items,
      dataQualityTier: tier,
    })

    // Market Analysis (recreational analytics)
    let marketAnalysis: NTPLComprehensivePrediction['market_analysis'] = undefined
    if (input.odds && uq.market_fair_p !== null && uq.insider_trading_z !== null) {
      const impliedA = 1.0 / input.odds.decimal_a
      const evA = (uq.p_win_point_estimate * input.odds.decimal_a) - 1.0
      marketAnalysis = {
        market_fair_p_a: uq.market_fair_p,
        insider_fraction_z: uq.insider_trading_z,
        implied_probability_raw_a: Math.round(impliedA * 1000) / 1000,
        expected_value_edge_pct: Math.round(evA * 10000) / 100,
      }
    }

    return {
      matchup_summary: {
        surface: input.tournament.surface,
        tour: input.tournament.tour,
        format,
        effective_cpi: modulatedCpi.modulated_cpi,
      },
      stage_predictions: {
        glicko2_prior_p_win_a: pGlicko,
        markov_p_win_a: markovDist.p_win_a,
        residual_ml_p_win_a: residualPred.p_final_calibrated,
        bma_ensemble_p_win_a: ensembleResult.p_raw_ensemble,
        beta_calibrated_p_win_a: ensembleResult.p_calibrated,
      },
      market_analysis: marketAnalysis,
      markov_distributions: markovDist,
      uncertainty_quantification: uq,
      tree_shap_associations: residualPred.tree_shap_attributions,
      governance: {
        pipeline_version: 'v1.0.0-ntpl',
        zero_player_id_verified: true,
        attribution_type: 'ASSOCIATIVE_ONLY',
        causal_overclaim_prohibited: true,
        data_quality_tier: tier,
      },
    }
  }

  /**
   * Helper for Murphy's Brier Score Decomposition.
   */
  public decomposeBrier(predictions: number[], labels: number[]): MurphyBrierDecomposition {
    return MurphyBrierDecomposer.decompose(predictions, labels)
  }
}
