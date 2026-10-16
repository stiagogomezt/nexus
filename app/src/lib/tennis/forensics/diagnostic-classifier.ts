/**
 * NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — DIAGNOSTIC CLASSIFIER & COURT ANALYTICS
 * 
 * 1. Constraint 1 Compliance: Epistemological Separation
 *    - Model Attribution (SHAP): strictly describes algorithmic log-odds contribution.
 *    - Court Analytics: strictly uses associative language (no causal overclaims).
 * 
 * 2. Constraint 3 Compliance: Automated Classification Tree (Miss Typology)
 *    Categorizes model errors into:
 *    - OVERCONFIDENCE / UNDERCONFIDENCE
 *    - SURFACE_MISS
 *    - MATCHUP_MISS
 *    - FORM_MISS
 *    - LOAD_MISS
 *    - NEWS_MISS
 *    - MARKET_MISS
 *    - DATA_QUALITY_ISSUE
 *    - WITHIN_TOLERANCE
 */

import {
  NTPFMissType,
  NTPFAlgorithmicDiagnostics,
  NTPFCourtAnalytics,
  NTPFMultilevelDeltas,
} from './types'
import { FeatureShapAttribution } from '../engine/residual-ml-model'

export interface DiagnosticInput {
  predicted_p_a: number
  winner_is_a: boolean
  market_fair_p_a?: number
  insider_trading_z?: number
  deltas: NTPFMultilevelDeltas
  shap_attributions: FeatureShapAttribution[]
  news_conflict_flag?: boolean
  medical_intervention_observed?: boolean // In-play MTO, visible strapping
  days_inactive_a?: number
  workload_ewma_a?: number
  surface_speed_cpi?: number
  data_quality_tier?: string
}

export class NTPFDiagnosticClassifier {
  /**
   * Evaluates match performance and classifies prediction error typology.
   */
  public static diagnose(input: DiagnosticInput): {
    algorithmic_diagnostics: NTPFAlgorithmicDiagnostics
    court_analytics: NTPFCourtAnalytics
  } {
    const {
      predicted_p_a: p,
      winner_is_a: winA,
      market_fair_p_a: pMarket,
      insider_trading_z: zShin = 0,
      deltas,
      shap_attributions: shap,
      news_conflict_flag: hasConflict = false,
      medical_intervention_observed: hadMto = false,
      workload_ewma_a: ewma = 20,
      data_quality_tier: tier = 'HIGH',
    } = input

    const y = winA ? 1.0 : 0.0
    const absError = Math.abs(p - y)
    const brier = Math.round(Math.pow(p - y, 2) * 10000) / 10000
    const logLoss = Math.round(-Math.log(Math.max(0.001, winA ? p : 1.0 - p)) * 1000) / 1000

    let missType: NTPFMissType = 'WITHIN_TOLERANCE'
    let severity: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL' = 'NEGLIGIBLE'
    let algorithmicRationale = 'Prediction aligned with observed outcome within expected probabilistic variance.'

    // ─── CLASSIFICATION TREE ───

    // Branch 0: Corrupted / degraded data quality
    if (tier === 'LOW') {
      missType = 'DATA_QUALITY_ISSUE'
      severity = absError > 0.40 ? 'SEVERE' : 'MODERATE'
      algorithmicRationale = 'Telemetry missing point-level telemetry, forcing model into fallback prior mode.'
    }
    // Branch 1: Within tolerance (Expected statistical noise)
    else if (absError <= 0.30) {
      missType = 'WITHIN_TOLERANCE'
      severity = 'NEGLIGIBLE'
      algorithmicRationale = `Predicted probability (${(p * 100).toFixed(1)}%) absorbed within natural binomial variance.`
    }
    // Branch 2: Severe Overconfidence (p >= 0.80 and loser lost)
    else if (p >= 0.78 && !winA) {
      missType = 'OVERCONFIDENCE'
      severity = 'CRITICAL'
      algorithmicRationale = `Model assigned high certainty (${(p * 100).toFixed(1)}%) to Player A with insufficient epistemic variance discount.`
    }
    // Branch 3: Underconfidence (p between 0.45 and 0.55 when structural outcome was dominant)
    else if (Math.abs(p - 0.50) <= 0.06 && (deltas.point_level.first_serve_win_pct_a.observed > 0.82 || deltas.point_level.first_serve_win_pct_a.observed < 0.48)) {
      missType = 'UNDERCONFIDENCE'
      severity = 'LOW'
      algorithmicRationale = 'Ensemble compressed predictions toward toss-up prior, failing to capture extreme skill divergence.'
    }
    // Branch 4: Physical issue on-court / News unmodeled
    else if (hadMto || hasConflict) {
      missType = 'NEWS_MISS'
      severity = 'MODERATE'
      algorithmicRationale = 'Physical intervention (MTO / strapping) or unverified pre-match news variance uncaptured in point-in-time state.'
    }
    // Branch 5: Physical load & congestion failure
    else if (ewma > 32 && !winA && deltas.game_level.service_hold_pct_a.delta < -0.15) {
      missType = 'LOAD_MISS'
      severity = 'MODERATE'
      algorithmicRationale = 'High accumulated physical workload (EWMA > 32) associated with precipitous decline in service hold percentage.'
    }
    // Branch 6: Surface speed / CPI interaction anomaly
    else if (Math.abs(deltas.point_level.first_serve_win_pct_a.delta) > 0.14) {
      missType = 'SURFACE_MISS'
      severity = 'MODERATE'
      algorithmicRationale = 'Observed court speed or ball flight aerodynamics diverged from tournament baseline CPI prior.'
    }
    // Branch 7: Market Superior Knowledge (Shin insider z >= 0.05)
    else if (zShin >= 0.04 && pMarket !== undefined && Math.abs(pMarket - y) < absError - 0.15) {
      missType = 'MARKET_MISS'
      severity = 'SEVERE'
      algorithmicRationale = `Vig-free market probability (Shin fair ${(pMarket * 100).toFixed(1)}%, z=${zShin.toFixed(3)}) captured non-public information superior to model prior.`
    }
    // Branch 8: Stylistic / Matchup asymmetry
    else if (Math.abs(deltas.set_level.first_set_win_a.delta) > 0.40) {
      missType = 'MATCHUP_MISS'
      severity = 'LOW'
      algorithmicRationale = 'Specific stylistic asymmetry or return match dynamics contradicted standard Elo surface priors.'
    }
    // Branch 9: Form trajectory breakdown
    else {
      missType = 'FORM_MISS'
      severity = 'LOW'
      algorithmicRationale = 'Recent form trajectory exhibited discrete structural shift unmodeled by exponential rolling window.'
    }

    const algorithmicDiagnostics: NTPFAlgorithmicDiagnostics = {
      model_predicted_p_a: p,
      actual_outcome_y_a: y,
      brier_score: brier,
      log_loss: logLoss,
      miss_typology: missType,
      severity,
      shap_feature_attributions: shap,
      algorithmic_miss_rationale: algorithmicRationale,
    }

    // ─── COURT ANALYTICS (ASSOCIATIVE LANGUAGE ONLY) ───
    const associativeFindings: string[] = []

    const holdDelta = deltas.game_level.service_hold_pct_a.delta
    if (Math.abs(holdDelta) >= 0.08) {
      associativeFindings.push(
        `El desempeño en retención de servicio estuvo asociado a un diferencial de ${(holdDelta * 100).toFixed(1)}% respecto a la expectativa del modelo.`
      )
    }

    const fsWinDelta = deltas.point_level.first_serve_win_pct_a.delta
    if (Math.abs(fsWinDelta) >= 0.08) {
      associativeFindings.push(
        `El porcentaje de puntos ganados con el primer saque presentó una desviación observada de ${(fsWinDelta * 100).toFixed(1)}%.`
      )
    }

    const bpConvDelta = deltas.game_level.break_point_conversion_a.delta
    if (Math.abs(bpConvDelta) >= 0.10) {
      associativeFindings.push(
        `La conversión de puntos de quiebre mostró una discrepancia de ${(bpConvDelta * 100).toFixed(1)}% frente al baseline markoviano.`
      )
    }

    if (associativeFindings.length === 0) {
      associativeFindings.push('Los indicadores de pista oscilaron dentro de los intervalos empíricos normales de varianza estocástica.')
    }

    const courtAnalytics: NTPFCourtAnalytics = {
      factual_match_narrative: winA
        ? `Victoria de Jugador A tras ${deltas.match_level.total_games.observed} juegos en ${deltas.match_level.duration_minutes} minutos.`
        : `Victoria de Jugador B tras ${deltas.match_level.total_games.observed} juegos en ${deltas.match_level.duration_minutes} minutos.`,
      associative_findings: associativeFindings,
      epistemological_disclaimer:
        'Aviso Epistemológico: Los hallazgos describen asociaciones estadísticas observacionales y contribución aditiva algorítmica (SHAP). No constituyen certeza causal determinista en el mundo físico.',
    }

    return {
      algorithmic_diagnostics: algorithmicDiagnostics,
      court_analytics: courtAnalytics,
    }
  }
}
