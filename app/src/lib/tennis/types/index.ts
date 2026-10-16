/**
 * NEXUS TENNIS PREDICTIVE LAB — Tipos de Datos y Dominio Cuantitativo
 * 
 * Sistema cuantitativo para análisis de partidos profesionales (ATP/WTA),
 * ingeniería de características, modelos predictivos, calibración de probabilidad,
 * noticias con Google Search Grounding y análisis de cuotas de mercado.
 */

export type TennisTour = 'ATP' | 'WTA'
export type TennisSurface = 'Hard' | 'Clay' | 'Grass' | 'Carpet'
export type MatchRound = 'R128' | 'R64' | 'R32' | 'R16' | 'QF' | 'SF' | 'F' | 'RR'

export interface TennisPlayer {
  id: string
  name: string
  country: string
  birth_date?: string
  age?: number
  handedness?: 'R' | 'L' | 'U'
  backhand?: '1H' | '2H'
  height_cm?: number
}

export interface PlayerStatsSnapshot {
  ranking?: number
  ranking_points?: number
  elo_overall: number
  elo_surface: number
  elo_recency: number
  
  // Forma reciente
  form_last_5_win_rate: number
  form_last_10_win_rate: number
  
  // Registro de superficie
  surface_wins: number
  surface_losses: number
  surface_win_rate: number
  
  // Estadísticas de servicio y devolución
  serve_hold_pct: number
  return_break_pct: number
  first_serve_pct: number
  first_serve_won_pct: number
  second_serve_won_pct: number
  break_points_saved_pct: number
  break_points_converted_pct: number
  tiebreak_win_pct: number
  
  // Carga física y fatiga
  matches_last_7_days: number
  minutes_last_7_days: number
  rest_days: number
  
  // Tono y edad
  age: number
  recent_trend: 'up' | 'stable' | 'down'
}

export interface HistoricalMatchRecord {
  id: string
  tour: TennisTour
  tournament_name: string
  tournament_level: 'GrandSlam' | 'Masters1000' | 'ATP500' | 'ATP250' | 'WTA1000' | 'WTA500' | 'WTA250' | 'Challenger'
  date: string // ISO YYYY-MM-DD
  surface: TennisSurface
  round: MatchRound
  
  winner_id: string
  winner_name: string
  loser_id: string
  loser_name: string
  
  score?: string
  duration_minutes?: number
  
  // Stats detalladas del ganador si están disponibles
  winner_aces?: number
  winner_dfs?: number
  winner_1st_in?: number
  winner_1st_won?: number
  winner_2nd_won?: number
  winner_svpt?: number
  winner_bp_saved?: number
  winner_bp_faced?: number
  
  // Stats detalladas del perdedor
  loser_aces?: number
  loser_dfs?: number
  loser_1st_in?: number
  loser_1st_won?: number
  loser_2nd_won?: number
  loser_svpt?: number
  loser_bp_saved?: number
  loser_bp_faced?: number
}

export interface MatchFeatureVector {
  match_id: string
  date: string
  surface: TennisSurface
  tour: TennisTour
  player_a_id: string
  player_b_id: string
  
  // Features diferenciales (Player A - Player B)
  elo_diff: number
  surface_elo_diff: number
  recency_elo_diff: number
  ranking_diff: number // B ranking - A ranking (positivo si A está mejor rankeado)
  form_5_diff: number
  form_10_diff: number
  surface_win_rate_diff: number
  
  // Ventajas de juego
  serve_advantage: number // (hold_a + break_a) - (hold_b + break_b)
  first_serve_diff: number
  break_point_resilience_diff: number // bp_saved_a - bp_saved_b
  tiebreak_diff: number
  
  // Fatiga y descanso
  rest_days_diff: number // A - B (positivo si A descansó más)
  fatigue_minutes_diff: number // B - A (positivo si B jugó más minutos / está más fatigado)
  
  // H2H
  h2h_win_rate_a: number
  h2h_matches_count: number
  
  // Edad
  age_diff: number // B - A (juventud relativa)
  
  // Target para entrenamiento (1 si A ganó, 0 si B ganó)
  target_winner_a?: number
}

// ─────────────────────────────────────────────
// NOTICIAS Y LESIONES (GROUNDING)
// ─────────────────────────────────────────────

export type InjuryStatus = 'UNKNOWN' | 'HEALTHY' | 'QUESTIONABLE' | 'CONFIRMED' | 'RETURNING'
export type FreshnessTier = '<1h' | '1-6h' | '6-24h' | '>24h'

export interface TennisNewsItem {
  id: string
  player: string
  source: string
  title: string
  url: string
  snippet?: string
  published_at?: string
  retrieved_at: string
  relevance: number // 0 a 1
  confidence: number // 0 a 1
  injury_status: InjuryStatus
  freshness_tier: FreshnessTier
  context_modifier_label?: string
  context_penalty?: number // e.g. -0.05 para penalización auditable
}

export interface PlayerNewsContext {
  player: string
  injury_status: InjuryStatus
  news: TennisNewsItem[]
  context_modifier: number // Modificador probabilístico total aplicado de forma auditable (-0.15 a +0.05)
  rationale: string
  sources_count: number
  latest_timestamp?: string
}

// ─────────────────────────────────────────────
// CUOTAS Y MERCADO
// ─────────────────────────────────────────────

export interface MatchOdds {
  match_id: string
  provider: string // 'Pinnacle', 'Bet365', 'Tennis-API', 'Manual Entry'
  timestamp: string
  is_manual: boolean
  odds_a: number // Cuota decimal (e.g. 1.85)
  odds_b: number // Cuota decimal (e.g. 2.10)
  implied_prob_a: number // 1 / odds_a
  implied_prob_b: number // 1 / odds_b
  margin_pct: number // (implied_a + implied_b - 1) * 100
}

// ─────────────────────────────────────────────
// SALIDA COMPLETA DEL MODELO
// ─────────────────────────────────────────────

export interface TopFactor {
  factor_name: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
}

export interface TennisMatchPrediction {
  match_id: string
  date: string
  surface: TennisSurface
  tour: TennisTour
  tournament_name: string
  round: MatchRound
  
  player_a: TennisPlayer
  player_b: TennisPlayer
  
  // Probabilidades crudas vs calibradas
  model_probability_a: number
  model_probability_b: number
  calibrated_probability_a: number
  calibrated_probability_b: number
  
  // Incertidumbre (IC 95%)
  uncertainty_interval_a: [number, number]
  uncertainty_interval_b: [number, number]
  
  // Cuotas de mercado
  odds_a?: number
  odds_b?: number
  implied_probability_a?: number
  implied_probability_b?: number
  
  // Edge y Expected Value
  edge_a?: number // calibrated_a - implied_a
  edge_b?: number
  ev_a?: number // calibrated_a * odds_a - 1
  ev_b?: number
  has_market_discrepancy: boolean
  
  // Factores explicativos y contextuales
  confidence: number // 0 a 1
  top_factors: TopFactor[]
  negative_factors: TopFactor[]
  
  // Contexto de lesiones y noticias
  news_context_a?: PlayerNewsContext
  news_context_b?: PlayerNewsContext
  news_summary: string
  sources: Array<{ name: string; url: string; published_at?: string }>
  
  // Metadatos del modelo
  model_version: string
  data_timestamp: string
  provenance_note: string
}

// ─────────────────────────────────────────────
// EVALUACIÓN Y BACKTEST
// ─────────────────────────────────────────────

export interface ModelPerformanceMetrics {
  accuracy: number
  log_loss: number
  brier_score: number
  calibration_error_ece: number
  roc_auc: number
  sample_size: number
}

export interface SliceEvaluationReport {
  overall: ModelPerformanceMetrics
  by_tour: {
    ATP: ModelPerformanceMetrics
    WTA: ModelPerformanceMetrics
  }
  by_surface: {
    Hard: ModelPerformanceMetrics
    Clay: ModelPerformanceMetrics
    Grass: ModelPerformanceMetrics
  }
}

export interface WalkForwardWindowResult {
  window_index: number
  train_period: { start: string; end: string; count: number }
  validation_period: { start: string; end: string; count: number }
  test_period: { start: string; end: string; count: number }
  raw_brier_score: number
  calibrated_brier_score: number
  accuracy: number
  log_loss: number
  roi_pct_flat_betting?: number
}

export type TennisDataQualityTier = 'HIGH' | 'MEDIUM' | 'LOW'
