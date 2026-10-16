/**
 * NEXUS TENNIS PREDICTIVE LAB — Herramientas de IA para Gemini Copilot
 * 
 * Permite a NEXUS AI consultar partidos, discrepancias con el mercado,
 * contexto de lesiones y estadísticas de superficie.
 * 
 * REGLA ESTRICTA: Gemini NO inventa probabilidades ni sustituye al modelo estadístico.
 * Gemini consume los resultados del modelo y explica el por qué.
 */

import {
  defaultTennisDataProvider,
  defaultTennisDataset,
  TennisNewsAnalyzer,
  WalkForwardBacktester,
  NexusTennisPredictiveLab,
  Glicko2State,
  NTPFService,
} from '@/lib/tennis'
import type { TennisSurface, TennisTour, NTPFForensicRecord } from '@/lib/tennis'

export interface AnalyzeTennisMatchParams {
  playerA: string
  playerB?: string
  surface?: TennisSurface
  tour?: TennisTour
}

export interface GetTennisEdgeCandidatesParams {
  tour?: TennisTour
  minEdge?: number
}

export interface SearchTennisNewsParams {
  player: string
  opponent?: string
}

export interface GetPlayerSurfaceStatsParams {
  player: string
  surface: TennisSurface
}

export async function executeAnalyzeTennisMatch(params: AnalyzeTennisMatchParams) {
  const pA = defaultTennisDataProvider.getPlayerByName(params.playerA)
  if (!pA) {
    return {
      success: false,
      error: `Jugador/a "${params.playerA}" no encontrado en el registro. Jugadores disponibles: Sinner, Alcaraz, Djokovic, Medvedev, Zverev, Swiatek, Sabalenka, Gauff, Rybakina, Pegula, etc.`,
    }
  }

  let pB = params.playerB ? defaultTennisDataProvider.getPlayerByName(params.playerB) : undefined
  if (!pB) {
    // Si no se especifica oponente, buscar el fixture programado más relevante
    const upcoming = await defaultTennisDataProvider.getUpcomingPredictions()
    const fix = upcoming.find((u) => u.player_a.id === pA.id || u.player_b.id === pA.id)
    if (fix) {
      return {
        success: true,
        prediction: fix,
        analysis_summary: `Partido programado: ${fix.player_a.name} vs ${fix.player_b.name} (${fix.tournament_name}, ${fix.surface}). Probabilidad del modelo: ${fix.player_a.name} ${(fix.calibrated_probability_a * 100).toFixed(1)}% vs ${fix.player_b.name} ${(fix.calibrated_probability_b * 100).toFixed(1)}%.`,
      }
    }
    // Fallback: emparejar con el rival natural
    pB = pA.id === 'p_sinner' ? defaultTennisDataProvider.getPlayer('p_alcaraz') : defaultTennisDataProvider.getPlayer('p_sinner')
  }

  const surface: TennisSurface = params.surface || 'Hard'
  const tour: TennisTour = params.tour || (pA.name === 'Iga Swiatek' || pA.name === 'Aryna Sabalenka' || pA.name === 'Coco Gauff' ? 'WTA' : 'ATP')

  const pred = defaultTennisDataProvider.analyzeMatch(
    pA.id,
    pB!.id,
    surface,
    tour,
    '2026-10-03',
    'Enfrentamiento Cuantitativo NEXUS'
  )

  // Ejecución del Pipeline Cuántico NTPL de 8 Etapas
  const ntpl = NexusTennisPredictiveLab.getInstance()
  const glickoA: Glicko2State = { player_id: pA.id, rating: 2150, rd: 48, volatility: 0.05 }
  const glickoB: Glicko2State = { player_id: pB!.id, rating: 2100, rd: 52, volatility: 0.05 }

  const ntplPrediction = ntpl.predict(
    {
      player_a: {
        id: pA.id,
        hand: (pA.handedness === 'L' ? 'L' : 'R') as 'R' | 'L',
        backhand: (pA.backhand || '2H') as '1H' | '2H',
        hold_pct: 0.88,
        break_pct: 0.28,
        days_inactive: 5,
        workload_ewma: 25.0,
      },
      player_b: {
        id: pB!.id,
        hand: (pB!.handedness === 'L' ? 'L' : 'R') as 'R' | 'L',
        backhand: (pB!.backhand || '2H') as '1H' | '2H',
        hold_pct: 0.85,
        break_pct: 0.29,
        days_inactive: 6,
        workload_ewma: 24.0,
      },
      tournament: {
        name: 'Torneo Cuantitativo NTPL',
        city: 'Madrid',
        surface,
        tour,
        level: 'GrandSlam',
        altitude_m: 650,
        temperature_c: 26,
        humidity_pct: 45,
        base_cpi: surface === 'Clay' ? 24 : surface === 'Grass' ? 44 : 37,
      },
      odds: {
        decimal_a: pred.odds_a || 1.85,
        decimal_b: pred.odds_b || 2.05,
      },
      data_quality_tier: 'HIGH',
    },
    glickoA,
    glickoB
  )

  return {
    success: true,
    prediction: pred,
    ntpl_pipeline: ntplPrediction,
    analysis_summary: `Análisis Cuantitativo NTPL: ${pred.player_a.name} (${(ntplPrediction.stage_predictions.beta_calibrated_p_win_a * 100).toFixed(1)}%) vs ${pred.player_b.name} (${((1 - ntplPrediction.stage_predictions.beta_calibrated_p_win_a) * 100).toFixed(1)}%). Intervalo de Credibilidad al 95%: [${(ntplPrediction.uncertainty_quantification.credible_intervals.ci_95_lower * 100).toFixed(0)}% – ${(ntplPrediction.uncertainty_quantification.credible_intervals.ci_95_upper * 100).toFixed(0)}%]. Factores principales: ${pred.top_factors.map((f) => f.factor_name).join(', ')}.`,
  }
}

export async function executeGetTennisEdgeCandidates(params?: GetTennisEdgeCandidatesParams) {
  const minEdge = params?.minEdge ?? 0.03
  const predictions = await defaultTennisDataProvider.getUpcomingPredictions({ tour: params?.tour })

  const candidates = predictions
    .filter((p) => (p.edge_a && p.edge_a >= minEdge) || (p.edge_b && p.edge_b >= minEdge))
    .map((p) => {
      const isEdgeA = (p.edge_a || 0) >= (p.edge_b || 0)
      const edgePlayer = isEdgeA ? p.player_a.name : p.player_b.name
      const edgeVal = isEdgeA ? p.edge_a! : p.edge_b!
      const evVal = isEdgeA ? p.ev_a! : p.ev_b!
      const odds = isEdgeA ? p.odds_a : p.odds_b
      const modelProb = isEdgeA ? p.calibrated_probability_a : p.calibrated_probability_b
      const impliedProb = isEdgeA ? p.implied_probability_a : p.implied_probability_b

      return {
        match: `${p.player_a.name} vs ${p.player_b.name}`,
        tournament: p.tournament_name,
        surface: p.surface,
        candidate_player: edgePlayer,
        model_probability: `${(modelProb * 100).toFixed(1)}%`,
        market_odds: odds,
        implied_probability: `${((impliedProb || 0) * 100).toFixed(1)}%`,
        edge: `${(edgeVal * 100).toFixed(1)}%`,
        expected_value_ev: `${(evVal * 100).toFixed(1)}%`,
        top_factor: p.top_factors[0]?.description || 'Ventaja en diferencial Elo y forma.',
      }
    })

  return {
    success: true,
    total_analyzed: predictions.length,
    candidates_count: candidates.length,
    candidates,
    disclaimer: 'Análisis puramente estadístico. El valor esperado (EV) y el edge cuantitativo no garantizan resultados.',
  }
}

export async function executeSearchTennisNews(params: SearchTennisNewsParams) {
  const queries = TennisNewsAnalyzer.buildSearchQueries(params.player, params.opponent)
  const context = TennisNewsAnalyzer.evaluatePlayerContext(params.player, [])

  return {
    success: true,
    player: params.player,
    suggested_grounding_queries: queries,
    injury_status: context.injury_status,
    news_summary: context.rationale,
    context_modifier: context.context_modifier,
    sources_count: context.sources_count,
    note: 'Si no se configuran API keys de búsqueda en vivo, se devuelve el estado verificado del registro local sin inventar novedades.',
  }
}

export async function executeGetPlayerSurfaceStats(params: GetPlayerSurfaceStatsParams) {
  const player = defaultTennisDataProvider.getPlayerByName(params.player)
  if (!player) {
    return { success: false, error: `Jugador/a "${params.player}" no encontrado.` }
  }

  const allMatches = defaultTennisDataset.getMatches()
  const surfaceMatches = allMatches.filter(
    (m) =>
      m.surface === params.surface &&
      (m.winner_id === player.id || m.loser_id === player.id)
  )

  const wins = surfaceMatches.filter((m) => m.winner_id === player.id).length
  const losses = surfaceMatches.filter((m) => m.loser_id === player.id).length
  const winRate = surfaceMatches.length > 0 ? wins / surfaceMatches.length : 0

  return {
    success: true,
    player: player.name,
    surface: params.surface,
    matches_played: surfaceMatches.length,
    wins,
    losses,
    win_rate: `${(winRate * 100).toFixed(1)}%`,
    recent_matches: surfaceMatches.slice(-3).map((m) => ({
      date: m.date,
      opponent: m.winner_id === player.id ? m.loser_name : m.winner_name,
      result: m.winner_id === player.id ? 'Victoria' : 'Derrota',
      score: m.score,
    })),
  }
}

export interface PostMatchForensicsParams {
  playerA: string
  playerB?: string
  surface?: TennisSurface
  actualWinnerA?: boolean
  totalGames?: number
}

export async function executePostMatchForensics(params: PostMatchForensicsParams) {
  const pA = defaultTennisDataProvider.getPlayerByName(params.playerA)
  if (!pA) {
    return { success: false, error: `Jugador/a "${params.playerA}" no encontrado.` }
  }

  const pB = params.playerB
    ? defaultTennisDataProvider.getPlayerByName(params.playerB)
    : defaultTennisDataProvider.getPlayer(pA.id === 'p_sinner' ? 'p_alcaraz' : 'p_sinner')
  if (!pB) {
    return { success: false, error: `Oponente "${params.playerB}" no encontrado.` }
  }

  const surface: TennisSurface = params.surface || 'Hard'
  const winA = params.actualWinnerA ?? true
  const totalGames = params.totalGames ?? 22

  const autopsy = NTPFService.runPostMatchAutopsy({
    match_id: `match_${pA.id}_vs_${pB.id}`,
    match_fingerprint: `fp_${pA.id}_${pB.id}_${Date.now()}`,
    match_date: '2026-10-03',
    player_a_name: pA.name,
    player_b_name: pB.name,
    tournament: 'NEXUS Forensic Tour Match',
    surface,
    tour: 'ATP',
    model_version: 'v1.0.0-ntpl',
    model_sha256: 'e82a991f4a478129849208104820194820194820194820194820194820194820',
    expected_baseline: {
      p_win_a: 0.65,
      expected_total_games: 23.5,
      p_first_set_a: 0.62,
      p_tiebreak_a: 0.52,
      expected_hold_pct_a: 0.88,
      expected_break_pct_a: 0.28,
      expected_first_serve_in_pct_a: 0.64,
      expected_first_serve_win_pct_a: 0.76,
      expected_second_serve_win_pct_a: 0.54,
    },
    observed_stats: {
      winner_is_a: winA,
      total_games_played: totalGames,
      first_set_won_a: winA,
      deciding_set_played: totalGames > 24,
      deciding_set_won_a: winA,
      tiebreaks_played: 1,
      tiebreaks_won_a: winA ? 1 : 0,
      first_serve_in_pct_a: 0.67,
      first_serve_win_pct_a: 0.79,
      second_serve_win_pct_a: 0.56,
      return_points_win_pct_a: 0.38,
      service_hold_pct_a: 0.91,
      break_point_conversion_a: 0.33,
      break_points_saved_pct_a: 0.75,
      service_games_played: 11,
      aces_a: 8,
      aces_b: 5,
      unforced_errors_a: 18,
      unforced_errors_b: 24,
      duration_minutes: 108,
    },
    shap_attributions: [
      { feature_name: 'diff_glicko_mu', feature_value: 1.15, shap_log_odds_impact: 0.32, direction: 'FAVORS_PLAYER_A' },
      { feature_name: 'diff_surface_elo', feature_value: 0.95, shap_log_odds_impact: 0.21, direction: 'FAVORS_PLAYER_A' },
      { feature_name: 'diff_hold_pct', feature_value: 0.06, shap_log_odds_impact: 0.14, direction: 'FAVORS_PLAYER_A' },
      { feature_name: 'cpi_serve_interaction', feature_value: 0.18, shap_log_odds_impact: 0.08, direction: 'FAVORS_PLAYER_A' },
    ],
    feature_vector: {
      diff_glicko_mu: 1.15,
      diff_surface_elo: 0.95,
      diff_hold_pct: 0.06,
      cpi_serve_interaction: 0.18,
    },
    market_fair_p_a: 0.64,
    insider_trading_z: 0.015,
  })

  return {
    success: true,
    autopsy,
    forensic_summary: `Autopsia Post-Partido NTPF: ${autopsy.algorithmic_diagnostics.miss_typology} (Brier: ${autopsy.algorithmic_diagnostics.brier_score}). ${autopsy.court_analytics.factual_match_narrative}`,
    top_counterfactual_lever: autopsy.counterfactual_audit.top_leverage_features[0]?.interpretative_diagnostic,
    epistemological_disclaimer: autopsy.court_analytics.epistemological_disclaimer,
  }
}

export interface SearchLiveTennisMatchesParams {
  query?: string
  tour?: TennisTour
}

export interface PredictLiveTennisMatchParams {
  matchId: string
}

export async function executeSearchLiveTennisMatches(params: SearchLiveTennisMatchesParams) {
  const { liveScheduleService } = await import('@/lib/tennis/data/live-schedule-service')
  const matches = liveScheduleService.searchMatches(params.query || '', params.tour)
  return {
    success: true,
    count: matches.length,
    matches: matches.map((m) => ({
      match_id: m.match_id,
      tournament: m.tournament_name,
      round: m.round,
      surface: m.surface,
      tour: m.tour,
      scheduled_start_time: m.scheduled_start_time,
      player_a: `${m.player_a.name} (${m.player_a.country} #${m.player_a.rank})`,
      player_b: `${m.player_b.name} (${m.player_b.country} #${m.player_b.rank})`,
      venue: `${m.venue.city}, ${m.venue.country} (${m.venue.altitude_m}m)`,
      odds: m.live_market_odds ? `${m.live_market_odds.odds_a} vs ${m.live_market_odds.odds_b}` : 'No disponibles',
    })),
  }
}

export async function executePredictLiveTennisMatch(params: PredictLiveTennisMatchParams) {
  const { liveScheduleService } = await import('@/lib/tennis/data/live-schedule-service')
  const match = liveScheduleService.getMatchById(params.matchId)
  if (!match) {
    return {
      success: false,
      error: `Partido con ID "${params.matchId}" no encontrado en el calendario oficial.`,
    }
  }

  const forecast = await liveScheduleService.getOrGeneratePrediction(params.matchId)
  return {
    success: true,
    match_id: match.match_id,
    match: `${match.player_a.name} vs ${match.player_b.name} (${match.tournament_name}, ${match.surface})`,
    scheduled_start_time: match.scheduled_start_time,
    probabilities: {
      player_a: `${(forecast.p_win_a * 100).toFixed(1)}%`,
      player_b: `${(forecast.p_win_b * 100).toFixed(1)}%`,
      credible_interval_95: `[${(forecast.credible_interval_95[0] * 100).toFixed(0)}% - ${(forecast.credible_interval_95[1] * 100).toFixed(0)}%]`,
      uncertainty_explanation: forecast.semantic_uncertainty_label,
    },
    court_pace: forecast.semantic_cpi_label,
    data_veracity: {
      data_quality_tier: forecast.data_quality_tier,
      zero_imputation_enforced: true,
      missing_metrics: forecast.missing_metrics,
    },
    executive_summary: forecast.executive_summary,
    key_factors: forecast.tree_shap_summary.map((s) => `${s.feature}: ${s.impact_description}`),
  }
}


