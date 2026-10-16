/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 1: CANONICAL DEDUPLICATION
 * 
 * Deterministic SHA-256 Match Fingerprinting and Multi-Source Reconciliation Engine.
 * Normalizes player names, tournament slugs, and rounds across disparate providers
 * (e.g. Jeff Sackmann match archives, Pinnacle, Bet365, ATP Tour official feeds).
 */

import { createHash } from 'crypto'
import { MatchRound, TennisSurface, TennisTour } from '../types'

export interface RawMatchHeader {
  tour: TennisTour
  tournament_raw: string
  season: number | string
  round_raw: string
  surface: TennisSurface
  date: string // ISO date
  player_a_raw: string
  player_b_raw: string
}

export interface CanonicalMatchIdentifier {
  fingerprint: string
  tour: TennisTour
  canonical_tournament_slug: string
  season: number
  canonical_round: MatchRound
  surface: TennisSurface
  canonical_player_a_slug: string
  canonical_player_b_slug: string
  match_date: string
}

export class MatchDeduplicationEngine {
  // Alias map for canonical tournaments
  private static readonly TOURNAMENT_ALIASES: Record<string, string> = {
    'australian open': 'australian-open',
    'aus open': 'australian-open',
    'ao': 'australian-open',
    'roland garros': 'roland-garros',
    'french open': 'roland-garros',
    'rg': 'roland-garros',
    'wimbledon': 'wimbledon',
    'the championships': 'wimbledon',
    'us open': 'us-open',
    'flushing meadows': 'us-open',
    'bnp paribas open': 'indian-wells',
    'indian wells masters': 'indian-wells',
    'indian wells': 'indian-wells',
    'miami open': 'miami',
    'miami masters': 'miami',
    'monte carlo masters': 'monte-carlo',
    'monte-carlo': 'monte-carlo',
    'madrid open': 'madrid',
    'mutua madrid open': 'madrid',
    'internazionali bnl d italia': 'rome',
    'italian open': 'rome',
    'rome masters': 'rome',
    'cincinnati open': 'cincinnati',
    'western & southern open': 'cincinnati',
    'atp finals': 'atp-finals',
    'nitto atp finals': 'atp-finals',
    'atp finals turin': 'atp-finals',
  }

  // Alias map for common name discrepancies across sportsbooks
  private static readonly PLAYER_ALIASES: Record<string, string> = {
    'sascha zverev': 'alexander-zverev',
    'a. zverev': 'alexander-zverev',
    'zverev a.': 'alexander-zverev',
    'c. alcaraz': 'carlos-alcaraz',
    'alcaraz c.': 'carlos-alcaraz',
    'carlos alcaraz': 'carlos-alcaraz',
    'carlos alcaraz garfia': 'carlos-alcaraz',
    'c. alcaraz garfia': 'carlos-alcaraz',
    'alcaraz garfia c.': 'carlos-alcaraz',
    'j. sinner': 'jannik-sinner',
    'sinner j.': 'jannik-sinner',
    'jannik sinner': 'jannik-sinner',
    'n. djokovic': 'novak-djokovic',
    'djokovic n.': 'novak-djokovic',
    'novak djokovic': 'novak-djokovic',
    'd. medvedev': 'daniil-medvedev',
    'medvedev d.': 'daniil-medvedev',
    'daniil medvedev': 'daniil-medvedev',
    'a. de minaur': 'alex-de-minaur',
    'de minaur a.': 'alex-de-minaur',
    'alex de minaur': 'alex-de-minaur',
    'i. swiatek': 'iga-swiatek',
    'swiatek i.': 'iga-swiatek',
    'iga swiatek': 'iga-swiatek',
    'a. sabalenka': 'aryna-sabalenka',
    'sabalenka a.': 'aryna-sabalenka',
    'aryna sabalenka': 'aryna-sabalenka',
    'c. gauff': 'coco-gauff',
    'gauff c.': 'coco-gauff',
    'coco gauff': 'coco-gauff',
    'e. rybakina': 'elena-rybakina',
    'rybakina e.': 'elena-rybakina',
    'elena rybakina': 'elena-rybakina',
    'j. paolini': 'jasmine-paolini',
    'paolini j.': 'jasmine-paolini',
    'jasmine paolini': 'jasmine-paolini',
    'q. zheng': 'qinwen-zheng',
    'zheng q.': 'qinwen-zheng',
    'qinwen zheng': 'qinwen-zheng',
  }

  /**
   * Normalizes an arbitrary player name string into a slug.
   * Strips accents, punctuation, and extra whitespace.
   */
  public static normalizePlayerSlug(rawName: string): string {
    const cleaned = rawName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
      .replace(/[^a-z0-9\s.-]/g, '')
      .replace(/\s+/g, ' ')

    if (this.PLAYER_ALIASES[cleaned]) {
      return this.PLAYER_ALIASES[cleaned]
    }

    // Check if cleaned name contains or is contained by any known alias
    for (const [alias, canonical] of Object.entries(this.PLAYER_ALIASES)) {
      if (cleaned.includes(alias) || alias.includes(cleaned)) {
        return canonical
      }
    }

    // "Lastname, Firstname" format support
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map((p) => p.trim())
      return `${parts[1]}-${parts[0]}`.replace(/[\s.]+/g, '-')
    }

    return cleaned.replace(/[\s.]+/g, '-')
  }

  /**
   * Normalizes a tournament name into its canonical slug.
   */
  public static normalizeTournamentSlug(rawTourney: string): string {
    const cleaned = rawTourney
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\d{4}/g, '') // remove year if appended (e.g. "Wimbledon 2025")
      .trim()

    for (const [alias, canonical] of Object.entries(this.TOURNAMENT_ALIASES)) {
      if (cleaned.includes(alias)) {
        return canonical
      }
    }

    return cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  /**
   * Normalizes round descriptions into the standard MatchRound enum.
   */
  public static normalizeRound(rawRound: string): MatchRound {
    const r = rawRound.trim().toUpperCase()
    if (r === 'F' || r === 'FINAL' || r === 'FINALS') return 'F'
    if (r === 'SF' || r === 'SEMI' || r === 'SEMIFINAL' || r === 'SEMIFINALS') return 'SF'
    if (r === 'QF' || r === 'QUARTER' || r === 'QUARTERFINAL' || r === 'QUARTERFINALS') return 'QF'
    if (r === 'R16' || r === 'ROUND OF 16' || r === '4TH ROUND' || r === '4R') return 'R16'
    if (r === 'R32' || r === 'ROUND OF 32' || r === '3RD ROUND' || r === '3R') return 'R32'
    if (r === 'R64' || r === 'ROUND OF 64' || r === '2ND ROUND' || r === '2R') return 'R64'
    if (r === 'R128' || r === 'ROUND OF 128' || r === '1ST ROUND' || r === '1R') return 'R128'
    return 'RR'
  }

  /**
   * Computes the deterministic SHA-256 match fingerprint.
   * Order-independent with respect to player A vs player B to guarantee cross-source reconciliation.
   */
  public static generateFingerprint(header: RawMatchHeader): CanonicalMatchIdentifier {
    const slugTourney = this.normalizeTournamentSlug(header.tournament_raw)
    const slugPlayerA = this.normalizePlayerSlug(header.player_a_raw)
    const slugPlayerB = this.normalizePlayerSlug(header.player_b_raw)
    const canonRound = this.normalizeRound(header.round_raw)
    const seasonYear = typeof header.season === 'number' ? header.season : parseInt(header.season, 10) || new Date(header.date).getFullYear()

    // Sort player slugs lexicographically so (A vs B) == (B vs A)
    const sortedPlayers = [slugPlayerA, slugPlayerB].sort((a, b) => a.localeCompare(b))
    const firstPlayer = sortedPlayers[0]
    const secondPlayer = sortedPlayers[1]

    // Payload: TOUR:TOURNAMENT:SEASON:ROUND:PLAYER_1:PLAYER_2
    const payload = `${header.tour}:${slugTourney}:${seasonYear}:${canonRound}:${firstPlayer}:${secondPlayer}`
    const fingerprint = createHash('sha256').update(payload).digest('hex')

    return {
      fingerprint,
      tour: header.tour,
      canonical_tournament_slug: slugTourney,
      season: seasonYear,
      canonical_round: canonRound,
      surface: header.surface,
      canonical_player_a_slug: slugPlayerA,
      canonical_player_b_slug: slugPlayerB,
      match_date: header.date,
    }
  }
}
