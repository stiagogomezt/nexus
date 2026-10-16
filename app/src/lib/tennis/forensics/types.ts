/**
 * NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — DOMAIN TYPES & CONTRACTS
 * 
 * Defines schemas for:
 * 1. Multilevel performance deltas (Point, Game, Set, Match).
 * 2. Diagnostic classification tree & Miss Typology.
 * 3. Algorithmic Attribution (SHAP) vs Court Analytics separation.
 * 4. Mathematical counterfactual sensitivity analysis.
 * 5. Shadow-deployment continuous learning governance.
 */

import { TennisSurface, TennisTour } from '../types'
import { FeatureShapAttribution } from '../engine/residual-ml-model'

export type NTPFMissType =
  | 'WITHIN_TOLERANCE'       // Prediction matched outcome or error within expected variance (|p - y| <= 0.30)
  | 'OVERCONFIDENCE'         // High confidence favored winner but loser won (e.g. p > 0.80, y = 0)
  | 'UNDERCONFIDENCE'        // Predicted toss-up (p ~ 0.50) when structural signals indicated heavy mismatch
  | 'SURFACE_MISS'           // Court CPI speed / bounce deviation drove unexpected service/return dynamics
  | 'MATCHUP_MISS'           // Stylistic or handedness/backhand vulnerability unmodeled in standard elo
  | 'FORM_MISS'              // Abrupt breakdown or surge in form exceeding rolling EWMA priors
  | 'LOAD_MISS'              // Physical workload, congestion or fatigue uncaptured by rest window
  | 'NEWS_MISS'              // Physical restriction / Strapping / MTO occurred on-court unannounced
  | 'MARKET_MISS'            // Severe market discrepancy where Shin insider z signaled market superior knowledge
  | 'DATA_QUALITY_ISSUE'     // Corrupted telemetry or incomplete historical priors

export interface NTPFLevelDelta<T = number> {
  expected: T
  observed: T
  delta: T
  variance_z_score?: number
}

export interface NTPFPointLevelDeltas {
  first_serve_in_pct_a: NTPFLevelDelta<number>
  first_serve_win_pct_a: NTPFLevelDelta<number>
  second_serve_win_pct_a: NTPFLevelDelta<number>
  return_points_win_pct_a: NTPFLevelDelta<number>
  short_rally_win_pct_a: NTPFLevelDelta<number>   // <= 4 shots
  medium_rally_win_pct_a: NTPFLevelDelta<number>  // 5-8 shots
  long_rally_win_pct_a: NTPFLevelDelta<number>    // > 8 shots
}

export interface NTPFGameLevelDeltas {
  service_hold_pct_a: NTPFLevelDelta<number>
  break_point_conversion_a: NTPFLevelDelta<number>
  break_points_saved_pct_a: NTPFLevelDelta<number>
  service_games_played: number
}

export interface NTPFSetLevelDeltas {
  first_set_win_a: NTPFLevelDelta<number>
  deciding_set_win_a: NTPFLevelDelta<number>
  tiebreak_win_pct_a: NTPFLevelDelta<number>
  tiebreaks_played: number
}

export interface NTPFMatchLevelDeltas {
  match_win_a: NTPFLevelDelta<number>
  total_games: NTPFLevelDelta<number>
  ace_differential: NTPFLevelDelta<number>
  unforced_error_differential: NTPFLevelDelta<number>
  duration_minutes: number
}

export interface NTPFMultilevelDeltas {
  point_level: NTPFPointLevelDeltas
  game_level: NTPFGameLevelDeltas
  set_level: NTPFSetLevelDeltas
  match_level: NTPFMatchLevelDeltas
}

export interface NTPFCounterfactualPerturbation {
  feature_name: string
  original_value: number
  counterfactual_value: number
  minimal_delta: number
  brier_sensitivity_derivative: number
  interpretative_diagnostic: string
}

export interface NTPFCounterfactualSensitivityAudit {
  target_brier_optimal_probability: number
  top_leverage_features: NTPFCounterfactualPerturbation[]
  audit_summary: string
  speculative_alternate_realities_prohibited: true
}

export interface NTPFCourtAnalytics {
  factual_match_narrative: string
  associative_findings: string[]
  epistemological_disclaimer: string // Confirms associative finding, not physical causality
}

export interface NTPFAlgorithmicDiagnostics {
  model_predicted_p_a: number
  actual_outcome_y_a: number // 1 or 0
  brier_score: number
  log_loss: number
  miss_typology: NTPFMissType
  severity: 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL'
  shap_feature_attributions: FeatureShapAttribution[]
  algorithmic_miss_rationale: string
}

export interface NTPFForensicRecord {
  forensic_id: string
  match_id: string
  match_fingerprint: string
  match_date: string
  player_a_name: string
  player_b_name: string
  tournament: string
  surface: TennisSurface
  tour: TennisTour
  model_version: string
  model_sha256: string
  algorithmic_diagnostics: NTPFAlgorithmicDiagnostics
  court_analytics: NTPFCourtAnalytics
  multilevel_deltas: NTPFMultilevelDeltas
  counterfactual_audit: NTPFCounterfactualSensitivityAudit
  created_at: string
}

export interface NTPFModelTelemetry {
  model_version: string
  slice_type: 'OVERALL' | 'ATP' | 'WTA' | 'HARD' | 'CLAY' | 'GRASS' | 'GRAND_SLAM' | 'MASTERS_1000'
  sample_size: number
  cumulative_brier_score: number
  murphy_reliability: number
  murphy_resolution: number
  murphy_uncertainty: number
  log_loss: number
  expected_calibration_error: number
  accuracy: number
  drift_detected: boolean
  drift_threshold_exceeded?: string
  recorded_at: string
}

export interface NTPFShadowCandidate {
  candidate_version: string
  sha256_hash: string
  status: 'PENDING_EVALUATION' | 'SHADOW_TESTING' | 'APPROVED_STAGING' | 'PROMOTED_PRODUCTION' | 'REJECTED'
  benchmark_brier: number
  benchmark_log_loss: number
  walk_forward_folds: number
  beta_calibration: { a: number; b: number; c: number }
  promotion_justification?: string
  approved_by?: string
  created_at: string
}
