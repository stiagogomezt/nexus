/**
 * NEXUS TENNIS PREDICTIVE LAB — Calculador de Elo General, de Superficie y Reciente
 * 
 * Implementación matemática de Elo adaptada a tenis:
 * - Elo General (K=32)
 * - Elo de Superficie (K=24, por Hard, Clay, Grass, Carpet)
 * - Elo Reciente / Recency Weighted (ponderación exponencial con decaimiento temporal)
 * 
 * REGLA ESTRICTA: Procesa matches en orden cronológico estricto.
 * Nunca utiliza información de partidos posteriores a la fecha del evento a predecir.
 */

import type { HistoricalMatchRecord, TennisSurface } from '../types'

export interface PlayerEloProfile {
  playerId: string
  overallElo: number
  surfaceElo: Record<TennisSurface, number>
  recencyElo: number
  lastActiveDate?: string
  matchesCount: number
}

const DEFAULT_BASE_ELO = 1500
const K_OVERALL = 32
const K_SURFACE = 24
const RECENCY_HALF_LIFE_DAYS = 90

export class TennisEloCalculator {
  private players: Map<string, PlayerEloProfile> = new Map()
  private eloHistory: Array<{
    date: string
    matchId: string
    winnerId: string
    loserId: string
    winnerOverallBefore: number
    winnerOverallAfter: number
    loserOverallBefore: number
    loserOverallAfter: number
    surface: TennisSurface
    winnerSurfaceBefore: number
    winnerSurfaceAfter: number
    loserSurfaceBefore: number
    loserSurfaceAfter: number
  }> = []

  constructor() {
    this.reset()
  }

  public reset(): void {
    this.players.clear()
    this.eloHistory = []
  }

  private getOrCreateProfile(playerId: string): PlayerEloProfile {
    let profile = this.players.get(playerId)
    if (!profile) {
      profile = {
        playerId,
        overallElo: DEFAULT_BASE_ELO,
        surfaceElo: {
          Hard: DEFAULT_BASE_ELO,
          Clay: DEFAULT_BASE_ELO,
          Grass: DEFAULT_BASE_ELO,
          Carpet: DEFAULT_BASE_ELO,
        },
        recencyElo: DEFAULT_BASE_ELO,
        matchesCount: 0,
      }
      this.players.set(playerId, profile)
    }
    return profile
  }

  /**
   * Procesa un conjunto de partidos ordenados cronológicamente hasta una fecha límite opcional.
   */
  public processMatches(matches: HistoricalMatchRecord[], beforeDate?: string): void {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const limitTime = beforeDate ? new Date(beforeDate).getTime() : Infinity

    for (const match of sorted) {
      if (new Date(match.date).getTime() >= limitTime) {
        break
      }
      this.recordMatchOutcome(match)
    }
  }

  /**
   * Actualiza los ratings de ganador y perdedor según fórmulas estándar de Elo.
   */
  public recordMatchOutcome(match: HistoricalMatchRecord): void {
    const winner = this.getOrCreateProfile(match.winner_id)
    const loser = this.getOrCreateProfile(match.loser_id)

    // 1. Elo General (K=32)
    const winnerOverallBefore = winner.overallElo
    const loserOverallBefore = loser.overallElo
    const expectedWinnerOverall = 1 / (1 + Math.pow(10, (loserOverallBefore - winnerOverallBefore) / 400))
    const expectedLoserOverall = 1 - expectedWinnerOverall

    const deltaWinnerOverall = K_OVERALL * (1 - expectedWinnerOverall)
    const deltaLoserOverall = K_OVERALL * (0 - expectedLoserOverall)

    winner.overallElo += deltaWinnerOverall
    loser.overallElo += deltaLoserOverall

    // 2. Elo por Superficie (K=24)
    const surface = match.surface
    const winnerSurfaceBefore = winner.surfaceElo[surface] || DEFAULT_BASE_ELO
    const loserSurfaceBefore = loser.surfaceElo[surface] || DEFAULT_BASE_ELO
    const expectedWinnerSurface = 1 / (1 + Math.pow(10, (loserSurfaceBefore - winnerSurfaceBefore) / 400))
    const expectedLoserSurface = 1 - expectedWinnerSurface

    const deltaWinnerSurface = K_SURFACE * (1 - expectedWinnerSurface)
    const deltaLoserSurface = K_SURFACE * (0 - expectedLoserSurface)

    winner.surfaceElo[surface] = winnerSurfaceBefore + deltaWinnerSurface
    loser.surfaceElo[surface] = loserSurfaceBefore + deltaLoserSurface

    // 3. Elo Reciente con decaimiento temporal
    const matchDate = new Date(match.date)
    const daysSinceWinnerLast = winner.lastActiveDate
      ? Math.max(0, (matchDate.getTime() - new Date(winner.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const daysSinceLoserLast = loser.lastActiveDate
      ? Math.max(0, (matchDate.getTime() - new Date(loser.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const winnerDecay = Math.exp(-daysSinceWinnerLast / (RECENCY_HALF_LIFE_DAYS * 2))
    const loserDecay = Math.exp(-daysSinceLoserLast / (RECENCY_HALF_LIFE_DAYS * 2))

    // Regresión suave hacia la media 1500 si hay inactividad prolongada
    winner.recencyElo = DEFAULT_BASE_ELO + (winner.recencyElo - DEFAULT_BASE_ELO) * winnerDecay
    loser.recencyElo = DEFAULT_BASE_ELO + (loser.recencyElo - DEFAULT_BASE_ELO) * loserDecay

    const expectedWinnerRecency = 1 / (1 + Math.pow(10, (loser.recencyElo - winner.recencyElo) / 400))
    winner.recencyElo += K_OVERALL * (1 - expectedWinnerRecency)
    loser.recencyElo += K_OVERALL * (0 - (1 - expectedWinnerRecency))

    winner.lastActiveDate = match.date
    loser.lastActiveDate = match.date
    winner.matchesCount++
    loser.matchesCount++

    // Guardar histórico auditable
    this.eloHistory.push({
      date: match.date,
      matchId: match.id,
      winnerId: match.winner_id,
      loserId: match.loser_id,
      winnerOverallBefore,
      winnerOverallAfter: winner.overallElo,
      loserOverallBefore,
      loserOverallAfter: loser.overallElo,
      surface,
      winnerSurfaceBefore,
      winnerSurfaceAfter: winner.surfaceElo[surface],
      loserSurfaceBefore,
      loserSurfaceAfter: loser.surfaceElo[surface],
    })
  }

  public getPlayerProfile(playerId: string): PlayerEloProfile {
    return {
      ...this.getOrCreateProfile(playerId),
      surfaceElo: { ...this.getOrCreateProfile(playerId).surfaceElo },
    }
  }

  public getOverallElo(playerId: string): number {
    return Math.round(this.getOrCreateProfile(playerId).overallElo)
  }

  public getSurfaceElo(playerId: string, surface: TennisSurface): number {
    const profile = this.getOrCreateProfile(playerId)
    return Math.round(profile.surfaceElo[surface] || DEFAULT_BASE_ELO)
  }

  public getRecencyElo(playerId: string): number {
    return Math.round(this.getOrCreateProfile(playerId).recencyElo)
  }

  /**
   * Probabilidad teórica basada exclusivamente en diferencia de Elo
   */
  public calcExpectedWinProb(eloA: number, eloB: number): number {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
  }
}
