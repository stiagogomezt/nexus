/**
 * NEXUS TENNIS PREDICTIVE LAB — Canalización de Ingeniería de Características
 * 
 * Extrae y normaliza el vector de características diferencial para cualquier emparejamiento.
 * CERO DATA LEAKAGE: Toda métrica se calcula estrictamente usando partidos
 * anteriores a la fecha del partido a predecir.
 */

import type {
  HistoricalMatchRecord,
  MatchFeatureVector,
  PlayerStatsSnapshot,
  TennisSurface,
  TennisTour,
} from '../types'
import { TennisEloCalculator } from './elo-calculator'
import { TENNIS_PLAYERS_REGISTRY } from '../data/dataset-loader'

export interface FeatureExtractionOptions {
  historyHorizonDays?: number
  minMatchesForStats?: number
}

export class TennisFeaturePipeline {
  private eloCalculator: TennisEloCalculator

  constructor() {
    this.eloCalculator = new TennisEloCalculator()
  }

  /**
   * Extrae el snapshot estadístico de un jugador antes de una fecha dada.
   */
  public extractPlayerStats(
    playerId: string,
    targetDate: string,
    surface: TennisSurface,
    allMatches: HistoricalMatchRecord[]
  ): PlayerStatsSnapshot {
    const targetTimestamp = new Date(targetDate).getTime()
    
    // 1. Filtrar partidos estrictamente anteriores a targetDate
    const priorMatches = allMatches.filter(
      (m) =>
        new Date(m.date).getTime() < targetTimestamp &&
        (m.winner_id === playerId || m.loser_id === playerId)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // descendente (más recientes primero)

    // 2. Calcular Elo hasta targetDate
    this.eloCalculator.reset()
    const allPriorMatches = allMatches.filter((m) => new Date(m.date).getTime() < targetTimestamp)
    this.eloCalculator.processMatches(allPriorMatches)

    const elo_overall = this.eloCalculator.getOverallElo(playerId)
    const elo_surface = this.eloCalculator.getSurfaceElo(playerId, surface)
    const elo_recency = this.eloCalculator.getRecencyElo(playerId)

    // 3. Forma últimos 5 y 10
    const last5 = priorMatches.slice(0, 5)
    const last10 = priorMatches.slice(0, 10)
    
    const form_5_wins = last5.filter((m) => m.winner_id === playerId).length
    const form_10_wins = last10.filter((m) => m.winner_id === playerId).length
    
    const form_last_5_win_rate = last5.length > 0 ? form_5_wins / last5.length : 0.5
    const form_last_10_win_rate = last10.length > 0 ? form_10_wins / last10.length : 0.5

    // 4. Registro en la superficie específica
    const surfaceMatches = priorMatches.filter((m) => m.surface === surface)
    const surface_wins = surfaceMatches.filter((m) => m.winner_id === playerId).length
    const surface_losses = surfaceMatches.filter((m) => m.loser_id === playerId).length
    const surface_win_rate =
      surfaceMatches.length > 0 ? surface_wins / surfaceMatches.length : 0.5

    // 5. Estadísticas de servicio y devolución
    let totalFirstServeIn = 0
    let totalFirstServeWon = 0
    let totalSecondServeWon = 0
    let totalServePoints = 0
    let totalBpSaved = 0
    let totalBpFaced = 0
    let matchesWithStats = 0

    for (const m of priorMatches.slice(0, 20)) {
      if (m.winner_id === playerId && m.winner_svpt && m.winner_svpt > 0) {
        totalFirstServeIn += m.winner_1st_in || 0
        totalFirstServeWon += m.winner_1st_won || 0
        totalSecondServeWon += m.winner_2nd_won || 0
        totalServePoints += m.winner_svpt || 0
        totalBpSaved += m.winner_bp_saved || 0
        totalBpFaced += m.winner_bp_faced || 0
        matchesWithStats++
      } else if (m.loser_id === playerId && m.loser_svpt && m.loser_svpt > 0) {
        totalFirstServeIn += m.loser_1st_in || 0
        totalFirstServeWon += m.loser_1st_won || 0
        totalSecondServeWon += m.loser_2nd_won || 0
        totalServePoints += m.loser_svpt || 0
        totalBpSaved += m.loser_bp_saved || 0
        totalBpFaced += m.loser_bp_faced || 0
        matchesWithStats++
      }
    }

    const first_serve_pct = totalServePoints > 0 ? totalFirstServeIn / totalServePoints : 0.62
    const first_serve_won_pct = totalFirstServeIn > 0 ? totalFirstServeWon / totalFirstServeIn : 0.72
    const second_serve_pts = totalServePoints - totalFirstServeIn
    const second_serve_won_pct = second_serve_pts > 0 ? totalSecondServeWon / second_serve_pts : 0.51
    const break_points_saved_pct = totalBpFaced > 0 ? totalBpSaved / totalBpFaced : 0.63

    // Hold % y Break % aproximados a partir de ratios de puntos ganados
    const serve_hold_pct = Math.min(0.98, Math.max(0.6, first_serve_won_pct * 0.7 + second_serve_won_pct * 0.5))
    const return_break_pct = Math.min(0.45, Math.max(0.12, (1 - second_serve_won_pct) * 0.45))
    const break_points_converted_pct = 0.42
    const tiebreak_win_pct = 0.55

    // 6. Carga física y fatiga (últimos 7 días)
    const sevenDaysAgoTime = targetTimestamp - 7 * 24 * 60 * 60 * 1000
    const matchesLast7 = priorMatches.filter(
      (m) => new Date(m.date).getTime() >= sevenDaysAgoTime
    )
    const matches_last_7_days = matchesLast7.length
    const minutes_last_7_days = matchesLast7.reduce(
      (acc, m) => acc + (m.duration_minutes || 110),
      0
    )

    // Días de descanso desde el último partido (cap de descanso deportivo: máximo 21 días)
    const lastMatchDate = priorMatches[0]?.date
    const rawRestDays = lastMatchDate
      ? Math.max(1, Math.round((targetTimestamp - new Date(lastMatchDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 7
    const rest_days = Math.min(21, rawRestDays)

    // Edad y tendencia
    const playerObj = TENNIS_PLAYERS_REGISTRY[playerId]
    const age = playerObj?.age || 26
    const recent_trend =
      form_last_5_win_rate >= 0.8
        ? 'up'
        : form_last_5_win_rate <= 0.4
        ? 'down'
        : 'stable'

    return {
      elo_overall,
      elo_surface,
      elo_recency,
      form_last_5_win_rate,
      form_last_10_win_rate,
      surface_wins,
      surface_losses,
      surface_win_rate,
      serve_hold_pct,
      return_break_pct,
      first_serve_pct,
      first_serve_won_pct,
      second_serve_won_pct,
      break_points_saved_pct,
      break_points_converted_pct,
      tiebreak_win_pct,
      matches_last_7_days,
      minutes_last_7_days,
      rest_days,
      age,
      recent_trend,
    }
  }

  /**
   * Construye el vector de características diferencial entre Jugador A y Jugador B.
   */
  public buildFeatureVector(
    playerAId: string,
    playerBId: string,
    targetDate: string,
    surface: TennisSurface,
    tour: TennisTour,
    allMatches: HistoricalMatchRecord[],
    matchId = `feat_${Date.now()}`
  ): MatchFeatureVector {
    const statsA = this.extractPlayerStats(playerAId, targetDate, surface, allMatches)
    const statsB = this.extractPlayerStats(playerBId, targetDate, surface, allMatches)

    // H2H previo
    const targetTimestamp = new Date(targetDate).getTime()
    const priorH2H = allMatches.filter(
      (m) =>
        new Date(m.date).getTime() < targetTimestamp &&
        ((m.winner_id === playerAId && m.loser_id === playerBId) ||
          (m.winner_id === playerBId && m.loser_id === playerAId))
    )
    const h2hMatchesCount = priorH2H.length
    const h2hWinsA = priorH2H.filter((m) => m.winner_id === playerAId).length
    // Bayes / shrinkage si hay pocos enfrentamientos
    const h2h_win_rate_a = (h2hWinsA + 1) / (h2hMatchesCount + 2)

    return {
      match_id: matchId,
      date: targetDate,
      surface,
      tour,
      player_a_id: playerAId,
      player_b_id: playerBId,

      elo_diff: statsA.elo_overall - statsB.elo_overall,
      surface_elo_diff: statsA.elo_surface - statsB.elo_surface,
      recency_elo_diff: statsA.elo_recency - statsB.elo_recency,
      ranking_diff: 0, // Placeholder si no hay tabla de puntos oficial
      form_5_diff: statsA.form_last_5_win_rate - statsB.form_last_5_win_rate,
      form_10_diff: statsA.form_last_10_win_rate - statsB.form_last_10_win_rate,
      surface_win_rate_diff: statsA.surface_win_rate - statsB.surface_win_rate,

      serve_advantage: (statsA.serve_hold_pct + statsA.return_break_pct) - (statsB.serve_hold_pct + statsB.return_break_pct),
      first_serve_diff: statsA.first_serve_pct - statsB.first_serve_pct,
      break_point_resilience_diff: statsA.break_points_saved_pct - statsB.break_points_saved_pct,
      tiebreak_diff: statsA.tiebreak_win_pct - statsB.tiebreak_win_pct,

      rest_days_diff: statsA.rest_days - statsB.rest_days,
      fatigue_minutes_diff: statsB.minutes_last_7_days - statsA.minutes_last_7_days,

      h2h_win_rate_a,
      h2h_matches_count: h2hMatchesCount,
      age_diff: statsB.age - statsA.age,
    }
  }

  /**
   * Genera el conjunto de datos de entrenamiento histórico garantizando cero leakage:
   * Para cada partido en `matches`, sus features se calculan usando solo los partidos anteriores.
   */
  public generateHistoricalDataset(matches: HistoricalMatchRecord[]): MatchFeatureVector[] {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const vectors: MatchFeatureVector[] = []

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i]
      const priorMatches = sorted.slice(0, i)

      // Orientar de forma balanceada (50% donde A es el ganador, 50% donde A es el perdedor)
      const isWinnerA = i % 2 === 0
      const playerA = isWinnerA ? m.winner_id : m.loser_id
      const playerB = isWinnerA ? m.loser_id : m.winner_id

      const feat = this.buildFeatureVector(
        playerA,
        playerB,
        m.date,
        m.surface,
        m.tour,
        priorMatches,
        m.id
      )

      feat.target_winner_a = isWinnerA ? 1 : 0
      vectors.push(feat)
    }

    return vectors
  }
}
