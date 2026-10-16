/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 1: DATA PIPELINE & FEATURE STORE
 * 
 * Strict Point-in-Time Feature Store with zero data leakage guarantees.
 * Integrates Jeff Sackmann (ATP/WTA) data provenance under CC BY-NC-SA 4.0.
 * Implements Empirical Surface Speed (ESI) as a transparent proxy for Hawk-Eye CPI.
 */

import { HistoricalMatchRecord, TennisSurface, TennisTour } from '../types'
import { TENNIS_DATASET_ATTRIBUTION } from './license-attribution'

export interface TournamentSpeedProxy {
  tournament_name: string
  surface: TennisSurface
  tour: TennisTour
  sample_matches: number
  historical_ace_pct: number
  historical_hold_pct: number
  empirical_speed_index: number // Proxy CPI normalized [15, 65]
  speed_category: 'Very Slow' | 'Slow' | 'Medium' | 'Fast' | 'Very Fast'
  cutoff_timestamp: string
}

export interface PlayerPointInTimeStats {
  player_id: string
  player_name: string
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  surface_matches: number
  surface_wins: number
  surface_losses: number
  surface_win_rate: number
  
  // Service metrics
  aces_total: number
  dfs_total: number
  first_serve_in_pct: number
  first_serve_won_pct: number
  second_serve_won_pct: number
  service_hold_pct: number
  break_points_saved_pct: number
  
  // Return metrics
  break_points_converted_pct: number
  return_break_pct: number
  
  // EWMA workload metrics (replaces pseudoscience ACWR)
  ewma_workload_minutes: number
  last_match_date?: string
  days_since_last_match: number
  
  cutoff_timestamp: string
}

export class PointInTimeFeatureStore {
  private matches: HistoricalMatchRecord[] = []
  private readonly sourceProvenance = {
    provider: 'Jeff Sackmann / Tennis Abstract',
    license: TENNIS_DATASET_ATTRIBUTION.license,
    attribution: TENNIS_DATASET_ATTRIBUTION.attribution_statement,
    provenance_url: TENNIS_DATASET_ATTRIBUTION.license_url,
  }

  constructor(initialMatches: HistoricalMatchRecord[] = []) {
    // Sort strictly chronological ascending at ingestion
    this.matches = [...initialMatches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  /**
   * Ingest matches ensuring chronological order.
   */
  public ingestMatches(records: HistoricalMatchRecord[]): void {
    const existingIds = new Set(this.matches.map((m) => m.id))
    const fresh = records.filter((r) => !existingIds.has(r.id))
    this.matches.push(...fresh)
    this.matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * Get all matches strictly before the cutoff timestamp (t < T_match).
   * Absolute data leakage prevention guarantee.
   */
  public getMatchesBefore(cutoffTimestamp: string): HistoricalMatchRecord[] {
    const cutoffMs = new Date(cutoffTimestamp).getTime()
    return this.matches.filter((m) => new Date(m.date).getTime() < cutoffMs)
  }

  /**
   * Calculates Empirical Surface Speed Proxies (Hold% and Ace% per tournament and surface).
   * Used since proprietary Hawk-Eye Court Pace Index (CPI) is unavailable publicly.
   */
  public getEmpiricalSurfaceSpeed(
    tournamentName: string,
    surface: TennisSurface,
    tour: TennisTour,
    cutoffTimestamp: string
  ): TournamentSpeedProxy {
    const eligibleMatches = this.getMatchesBefore(cutoffTimestamp).filter(
      (m) =>
        m.surface === surface &&
        m.tour === tour &&
        m.tournament_name.toLowerCase().trim() === tournamentName.toLowerCase().trim()
    )

    // Fallback baseline values by surface if sample is too small (< 3 matches)
    const surfaceDefaults: Record<TennisSurface, { hold: number; ace: number; cpi: number }> = {
      Clay:   { hold: 0.72, ace: 0.045, cpi: 23.5 },
      Hard:   { hold: 0.79, ace: 0.082, cpi: 37.0 },
      Grass:  { hold: 0.84, ace: 0.105, cpi: 46.5 },
      Carpet: { hold: 0.85, ace: 0.115, cpi: 48.0 },
    }

    if (eligibleMatches.length < 3) {
      const def = surfaceDefaults[surface] || surfaceDefaults.Hard
      return {
        tournament_name: tournamentName,
        surface,
        tour,
        sample_matches: eligibleMatches.length,
        historical_ace_pct: def.ace,
        historical_hold_pct: def.hold,
        empirical_speed_index: def.cpi,
        speed_category: this.classifySpeed(def.cpi),
        cutoff_timestamp: cutoffTimestamp,
      }
    }

    let totalPointsServed = 0
    let totalAces = 0
    let totalServeGames = 0
    let totalBreaks = 0

    for (const m of eligibleMatches) {
      const wSvpt = m.winner_svpt || 65
      const lSvpt = m.loser_svpt || 60
      const wAces = m.winner_aces || 4
      const lAces = m.loser_aces || 3

      totalPointsServed += wSvpt + lSvpt
      totalAces += wAces + lAces

      // Estimate games from score or duration if detailed counts absent
      const wBpFaced = m.winner_bp_faced || 4
      const wBpSaved = m.winner_bp_saved || 3
      const lBpFaced = m.loser_bp_faced || 6
      const lBpSaved = m.loser_bp_saved || 3

      const wBreaksSuffered = Math.max(0, wBpFaced - wBpSaved)
      const lBreaksSuffered = Math.max(0, lBpFaced - lBpSaved)

      const approxGames = Math.max(16, (m.duration_minutes || 90) / 4)
      const approxServeGames = approxGames
      totalServeGames += approxServeGames
      totalBreaks += wBreaksSuffered + lBreaksSuffered
    }

    const acePct = totalPointsServed > 0 ? totalAces / totalPointsServed : surfaceDefaults[surface].ace
    const holdPct = totalServeGames > 0 ? Math.max(0.55, Math.min(0.95, (totalServeGames - totalBreaks) / totalServeGames)) : surfaceDefaults[surface].hold

    // Empirical Speed Index formula with Bayesian shrinkage towards surface prior
    const holdComponent = ((holdPct - 0.65) / 0.25) * 40 + 15
    const aceComponent = ((acePct - 0.03) / 0.12) * 40 + 15
    const rawCpi = 0.60 * holdComponent + 0.40 * aceComponent

    const n = eligibleMatches.length
    const priorWeight = 4
    const surfaceDef = surfaceDefaults[surface] || surfaceDefaults.Hard
    const shrunkCpi = (n * rawCpi + priorWeight * surfaceDef.cpi) / (n + priorWeight)
    const boundedCpi = Math.round(Math.max(15, Math.min(65, shrunkCpi)) * 10) / 10

    return {
      tournament_name: tournamentName,
      surface,
      tour,
      sample_matches: eligibleMatches.length,
      historical_ace_pct: Math.round(acePct * 1000) / 1000,
      historical_hold_pct: Math.round(holdPct * 1000) / 1000,
      empirical_speed_index: boundedCpi,
      speed_category: this.classifySpeed(boundedCpi),
      cutoff_timestamp: cutoffTimestamp,
    }
  }

  private classifySpeed(cpi: number): TournamentSpeedProxy['speed_category'] {
    if (cpi < 26) return 'Very Slow'
    if (cpi < 33) return 'Slow'
    if (cpi < 42) return 'Medium'
    if (cpi < 50) return 'Fast'
    return 'Very Fast'
  }

  /**
   * Computes point-in-time player statistics strictly using matches before cutoff.
   * Incorporates standard EWMA workload decay (rejection of pseudoscience ACWR).
   */
  public getPlayerPointInTimeStats(
    playerId: string,
    surface: TennisSurface,
    cutoffTimestamp: string,
    ewmaHalfLifeDays: number = 7
  ): PlayerPointInTimeStats {
    const historical = this.getMatchesBefore(cutoffTimestamp).filter(
      (m) => m.winner_id === playerId || m.loser_id === playerId
    )

    let wins = 0
    let losses = 0
    let surfaceWins = 0
    let surfaceLosses = 0

    let acesTotal = 0
    let dfsTotal = 0
    let firstInTotal = 0
    let firstWonTotal = 0
    let secondWonTotal = 0
    let svptTotal = 0
    let bpSavedTotal = 0
    let bpFacedTotal = 0
    let bpConvTotal = 0
    let retGamesTotal = 0

    let playerName = playerId
    const cutoffDate = new Date(cutoffTimestamp)
    let lastMatchDate: string | undefined = undefined
    let ewmaWorkload = 0

    const lambda = Math.LN2 / ewmaHalfLifeDays // Decay constant for EWMA

    for (const m of historical) {
      const isWinner = m.winner_id === playerId
      if (isWinner) {
        wins++
        playerName = m.winner_name
        if (m.surface === surface) surfaceWins++
      } else {
        losses++
        playerName = m.loser_name
        if (m.surface === surface) surfaceLosses++
      }

      // Point stats
      const aces = isWinner ? m.winner_aces || 0 : m.loser_aces || 0
      const dfs = isWinner ? m.winner_dfs || 0 : m.loser_dfs || 0
      const firstIn = isWinner ? m.winner_1st_in || 0 : m.loser_1st_in || 0
      const firstWon = isWinner ? m.winner_1st_won || 0 : m.loser_1st_won || 0
      const secondWon = isWinner ? m.winner_2nd_won || 0 : m.loser_2nd_won || 0
      const svpt = isWinner ? m.winner_svpt || 0 : m.loser_svpt || 0
      const bpSaved = isWinner ? m.winner_bp_saved || 0 : m.loser_bp_saved || 0
      const bpFaced = isWinner ? m.winner_bp_faced || 0 : m.loser_bp_faced || 0

      // Opponent break stats (return)
      const oppBpFaced = isWinner ? m.loser_bp_faced || 0 : m.winner_bp_faced || 0
      const oppBpSaved = isWinner ? m.loser_bp_saved || 0 : m.winner_bp_saved || 0
      const bpConverted = Math.max(0, oppBpFaced - oppBpSaved)

      acesTotal += aces
      dfsTotal += dfs
      firstInTotal += firstIn
      firstWonTotal += firstWon
      secondWonTotal += secondWon
      svptTotal += svpt
      bpSavedTotal += bpSaved
      bpFacedTotal += bpFaced
      bpConvTotal += bpConverted
      retGamesTotal += Math.max(8, (m.duration_minutes || 90) / 8)

      // Workload EWMA: exponential decay based on days elapsed from match to cutoff
      const matchDate = new Date(m.date)
      lastMatchDate = m.date
      const daysDiff = Math.max(0, (cutoffDate.getTime() - matchDate.getTime()) / (1000 * 3600 * 24))
      const matchMinutes = m.duration_minutes || 95
      const weight = Math.exp(-lambda * daysDiff)
      ewmaWorkload += matchMinutes * weight
    }

    const matchesPlayed = wins + losses
    const surfaceMatches = surfaceWins + surfaceLosses

    const daysSinceLastMatch = lastMatchDate
      ? Math.max(0, Math.floor((cutoffDate.getTime() - new Date(lastMatchDate).getTime()) / (1000 * 3600 * 24)))
      : 30

    return {
      player_id: playerId,
      player_name: playerName,
      matches_played: matchesPlayed,
      wins,
      losses,
      win_rate: matchesPlayed > 0 ? wins / matchesPlayed : 0.5,
      surface_matches: surfaceMatches,
      surface_wins: surfaceWins,
      surface_losses: surfaceLosses,
      surface_win_rate: surfaceMatches > 0 ? surfaceWins / surfaceMatches : 0.5,
      
      aces_total: acesTotal,
      dfs_total: dfsTotal,
      first_serve_in_pct: svptTotal > 0 ? firstInTotal / svptTotal : 0.62,
      first_serve_won_pct: firstInTotal > 0 ? firstWonTotal / firstInTotal : 0.71,
      second_serve_won_pct: (svptTotal - firstInTotal) > 0 ? secondWonTotal / (svptTotal - firstInTotal) : 0.51,
      service_hold_pct: bpFacedTotal > 0 ? Math.max(0.60, 1 - (bpFacedTotal - bpSavedTotal) / 10) : 0.78,
      break_points_saved_pct: bpFacedTotal > 0 ? bpSavedTotal / bpFacedTotal : 0.60,
      break_points_converted_pct: bpConvTotal > 0 ? Math.min(0.65, bpConvTotal / 10) : 0.40,
      return_break_pct: retGamesTotal > 0 ? Math.min(0.45, bpConvTotal / retGamesTotal) : 0.22,
      
      ewma_workload_minutes: Math.round(ewmaWorkload * 10) / 10,
      last_match_date: lastMatchDate,
      days_since_last_match: daysSinceLastMatch,
      cutoff_timestamp: cutoffTimestamp,
    }
  }

  public getProvenanceInfo() {
    return { ...this.sourceProvenance, total_matches_indexed: this.matches.length }
  }
}
