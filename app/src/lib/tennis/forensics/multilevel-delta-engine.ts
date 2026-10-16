/**
 * NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — MULTILEVEL DELTA ENGINE
 * 
 * Computes exact Expected vs Observed vs Delta across 4 hierarchical tiers:
 * - Point level: Serves, Returns, Rally length distributions
 * - Game level: Service hold, Break points conversion & defense
 * - Set level: First set conversion, Deciding sets, Tiebreaks
 * - Match level: Winner outcome, Total games, Ace/Error margins
 */

import {
  NTPFMultilevelDeltas,
  NTPFPointLevelDeltas,
  NTPFGameLevelDeltas,
  NTPFSetLevelDeltas,
  NTPFMatchLevelDeltas,
  NTPFLevelDelta,
} from './types'

export interface ExpectedMatchBaseline {
  p_win_a: number
  expected_total_games: number
  p_first_set_a: number
  p_tiebreak_a: number
  expected_hold_pct_a: number
  expected_break_pct_a: number
  expected_first_serve_in_pct_a: number
  expected_first_serve_win_pct_a: number
  expected_second_serve_win_pct_a: number
}

export interface ObservedMatchStatistics {
  winner_is_a: boolean
  total_games_played: number
  first_set_won_a: boolean
  deciding_set_played: boolean
  deciding_set_won_a?: boolean
  tiebreaks_played: number
  tiebreaks_won_a: number
  first_serve_in_pct_a: number
  first_serve_win_pct_a: number
  second_serve_win_pct_a: number
  return_points_win_pct_a: number
  service_hold_pct_a: number
  break_point_conversion_a: number
  break_points_saved_pct_a: number
  service_games_played: number
  aces_a: number
  aces_b: number
  unforced_errors_a: number
  unforced_errors_b: number
  duration_minutes?: number
  // Rally telemetry (optional / fallback to empirical distribution if unprovided)
  short_rally_win_pct_a?: number  // 1-4 shots
  medium_rally_win_pct_a?: number // 5-8 shots
  long_rally_win_pct_a?: number   // >8 shots
}

export class NTPFMultilevelDeltaEngine {
  /**
   * Computes clean, hierarchical expected vs observed vs delta statistics.
   */
  public static computeDeltas(
    expected: ExpectedMatchBaseline,
    observed: ObservedMatchStatistics
  ): NTPFMultilevelDeltas {
    // 1. Point Level
    const pointLevel: NTPFPointLevelDeltas = {
      first_serve_in_pct_a: this.calcDelta(
        expected.expected_first_serve_in_pct_a,
        observed.first_serve_in_pct_a,
        0.05
      ),
      first_serve_win_pct_a: this.calcDelta(
        expected.expected_first_serve_win_pct_a,
        observed.first_serve_win_pct_a,
        0.06
      ),
      second_serve_win_pct_a: this.calcDelta(
        expected.expected_second_serve_win_pct_a,
        observed.second_serve_win_pct_a,
        0.08
      ),
      return_points_win_pct_a: this.calcDelta(
        expected.expected_break_pct_a + 0.10, // Tour return point baseline proxy
        observed.return_points_win_pct_a,
        0.07
      ),
      short_rally_win_pct_a: this.calcDelta(
        0.52,
        observed.short_rally_win_pct_a ?? 0.52,
        0.06
      ),
      medium_rally_win_pct_a: this.calcDelta(
        0.50,
        observed.medium_rally_win_pct_a ?? 0.50,
        0.07
      ),
      long_rally_win_pct_a: this.calcDelta(
        0.48,
        observed.long_rally_win_pct_a ?? 0.48,
        0.09
      ),
    }

    // 2. Game Level
    const gameLevel: NTPFGameLevelDeltas = {
      service_hold_pct_a: this.calcDelta(
        expected.expected_hold_pct_a,
        observed.service_hold_pct_a,
        0.10
      ),
      break_point_conversion_a: this.calcDelta(
        expected.expected_break_pct_a,
        observed.break_point_conversion_a,
        0.18
      ),
      break_points_saved_pct_a: this.calcDelta(
        0.62, // Tour standard break points saved base rate
        observed.break_points_saved_pct_a,
        0.15
      ),
      service_games_played: observed.service_games_played,
    }

    // 3. Set Level
    const tiebreakExpectedWin = expected.p_tiebreak_a
    const tiebreakObservedWin =
      observed.tiebreaks_played > 0
        ? observed.tiebreaks_won_a / observed.tiebreaks_played
        : tiebreakExpectedWin

    const setLevel: NTPFSetLevelDeltas = {
      first_set_win_a: this.calcDelta(
        expected.p_first_set_a,
        observed.first_set_won_a ? 1.0 : 0.0,
        0.25
      ),
      deciding_set_win_a: this.calcDelta(
        expected.p_win_a,
        observed.deciding_set_played ? (observed.deciding_set_won_a ? 1.0 : 0.0) : expected.p_win_a,
        0.30
      ),
      tiebreak_win_pct_a: this.calcDelta(
        tiebreakExpectedWin,
        tiebreakObservedWin,
        0.20
      ),
      tiebreaks_played: observed.tiebreaks_played,
    }

    // 4. Match Level
    const matchLevel: NTPFMatchLevelDeltas = {
      match_win_a: this.calcDelta(
        expected.p_win_a,
        observed.winner_is_a ? 1.0 : 0.0,
        Math.sqrt(expected.p_win_a * (1.0 - expected.p_win_a))
      ),
      total_games: this.calcDelta(
        expected.expected_total_games,
        observed.total_games_played,
        4.5
      ),
      ace_differential: this.calcDelta(
        0.0,
        observed.aces_a - observed.aces_b,
        4.0
      ),
      unforced_error_differential: this.calcDelta(
        0.0,
        observed.unforced_errors_a - observed.unforced_errors_b,
        6.0
      ),
      duration_minutes: observed.duration_minutes ?? 105,
    }

    return {
      point_level: pointLevel,
      game_level: gameLevel,
      set_level: setLevel,
      match_level: matchLevel,
    }
  }

  private static calcDelta(expected: number, observed: number, stdDev: number): NTPFLevelDelta<number> {
    const delta = Math.round((observed - expected) * 1000) / 1000
    const zScore = stdDev > 0 ? Math.round((delta / stdDev) * 100) / 100 : 0.0

    return {
      expected: Math.round(expected * 1000) / 1000,
      observed: Math.round(observed * 1000) / 1000,
      delta,
      variance_z_score: zScore,
    }
  }
}
