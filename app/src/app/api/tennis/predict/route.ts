import { NextResponse } from 'next/server'
import { liveScheduleService } from '@/lib/tennis/data/live-schedule-service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetro requerido faltante: "match_id" es obligatorio.',
        },
        { status: 400 }
      )
    }

    const match = liveScheduleService.getMatchById(matchId)
    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: `Partido con match_id "${matchId}" no encontrado en el registro.`,
        },
        { status: 404 }
      )
    }

    // On-demand prediction with fresh cache verification (< 6 hours)
    const forecast = await liveScheduleService.getOrGeneratePrediction(matchId)

    return NextResponse.json({
      success: true,
      match: {
        match_id: match.match_id,
        tournament_name: match.tournament_name,
        tournament_tier: match.tournament_tier,
        surface: match.surface,
        tour: match.tour,
        round: match.round,
        scheduled_start_time: match.scheduled_start_time,
        player_a: match.player_a,
        player_b: match.player_b,
        venue: match.venue,
        live_market_odds: match.live_market_odds,
        telemetry: match.telemetry,
      },
      forecast: {
        calculated_at: forecast.calculated_at,
        expires_at: forecast.expires_at,
        is_fresh: true,
        p_win_a: forecast.p_win_a,
        p_win_b: forecast.p_win_b,
        credible_interval_95: forecast.credible_interval_95,
        uncertainty_type: forecast.uncertainty_type,
        data_quality_tier: forecast.data_quality_tier,
        missing_metrics: forecast.missing_metrics,
        executive_summary: forecast.executive_summary,
        semantic_cpi_label: forecast.semantic_cpi_label,
        semantic_uncertainty_label: forecast.semantic_uncertainty_label,
        tree_shap_summary: forecast.tree_shap_summary,
        distributions: {
          expected_total_games: forecast.raw_prediction.markov_distributions.expected_total_games,
          set_score_probabilities: forecast.raw_prediction.markov_distributions.set_score_probabilities,
          p_at_least_one_tiebreak: forecast.raw_prediction.markov_distributions.p_at_least_one_tiebreak,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error en inferencia predictiva on-demand',
      },
      { status: 500 }
    )
  }
}
