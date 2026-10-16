/**
 * NEXUS TENNIS PREDICTIVE LAB — Proveedor Abstracto de Cuotas y Conversión de Mercado
 * 
 * Reglas de cálculo cuantitativo:
 * - implied_probability = 1 / odds
 * - edge = model_probability - implied_probability
 * - EV (Expected Value) = (model_probability * odds) - 1
 * 
 * REGLA ESTRICTA:
 * Nunca inventar cuotas. Si no hay proveedor disponible, permitir entrada manual
 * con marca de tiempo o mostrar DATA UNAVAILABLE.
 * Nunca presentar un edge como garantía de ganancia.
 */

import type { MatchOdds } from '../types'

export interface OddsQueryFilter {
  matchId?: string
  playerA?: string
  playerB?: string
  date?: string
}

export abstract class OddsProvider {
  public abstract readonly providerName: string
  public abstract isAvailable(): boolean
  public abstract getOdds(filter: OddsQueryFilter): Promise<MatchOdds | null>
}

export class OddsMath {
  /**
   * Probabilidad implícita a partir de cuota decimal: p = 1 / cuota
   */
  public static calcImpliedProbability(decimalOdds: number): number {
    if (!decimalOdds || decimalOdds <= 1.0) return 0
    return Math.round((1 / decimalOdds) * 1000) / 1000
  }

  /**
   * Margen de valor (Edge) = Probabilidad del modelo - Probabilidad implícita
   */
  public static calcEdge(modelProb: number, impliedProb: number): number {
    return Math.round((modelProb - impliedProb) * 1000) / 1000
  }

  /**
   * Valor Esperado (Expected Value EV): EV = (p * cuota) - 1
   */
  public static calcExpectedValue(modelProb: number, decimalOdds: number): number {
    if (!decimalOdds || decimalOdds <= 1.0) return 0
    return Math.round((modelProb * decimalOdds - 1) * 1000) / 1000
  }

  /**
   * Cuota justa (fair odds) teórica: fair_odds = 1 / model_prob
   */
  public static calcFairOdds(modelProb: number): number {
    if (modelProb <= 0) return 99.0
    return Math.round((1 / modelProb) * 100) / 100
  }

  /**
   * Desglose del overround / margen de la casa de apuestas
   */
  public static calcBookmakerMargin(oddsA: number, oddsB: number): number {
    if (oddsA <= 1 || oddsB <= 1) return 0
    const margin = 1 / oddsA + 1 / oddsB - 1
    return Math.round(margin * 1000) / 10
  }
}

/**
 * Proveedor en memoria para cuotas ingresadas manualmente por el analista
 */
export class ManualOddsProvider extends OddsProvider {
  public readonly providerName = 'Manual Entry'
  private storedOdds: Map<string, MatchOdds> = new Map()

  public isAvailable(): boolean {
    return true
  }

  public setManualOdds(
    matchId: string,
    oddsA: number,
    oddsB: number
  ): MatchOdds {
    const implied_prob_a = OddsMath.calcImpliedProbability(oddsA)
    const implied_prob_b = OddsMath.calcImpliedProbability(oddsB)
    const margin_pct = OddsMath.calcBookmakerMargin(oddsA, oddsB)

    const record: MatchOdds = {
      match_id: matchId,
      provider: 'Manual Entry',
      timestamp: new Date().toISOString(),
      is_manual: true,
      odds_a: oddsA,
      odds_b: oddsB,
      implied_prob_a,
      implied_prob_b,
      margin_pct,
    }

    this.storedOdds.set(matchId, record)
    return record
  }

  public async getOdds(filter: OddsQueryFilter): Promise<MatchOdds | null> {
    if (filter.matchId && this.storedOdds.has(filter.matchId)) {
      return this.storedOdds.get(filter.matchId) || null
    }
    return null
  }
}

/**
 * Proveedor para API de Tenis (Tennis-API / Pinnacle consensus)
 * Si no hay API KEY configurada en el entorno, reporta estado UNAVAILABLE.
 */
export class TennisApiOddsProvider extends OddsProvider {
  public readonly providerName = 'Tennis-API'

  public isAvailable(): boolean {
    if (typeof process === 'undefined' || !process.env) return false
    return Boolean(process.env.TENNIS_API_KEY && process.env.TENNIS_API_KEY.trim().length > 0)
  }

  public async getOdds(_filter: OddsQueryFilter): Promise<MatchOdds | null> {
    if (!this.isAvailable()) {
      return null
    }
    // Integración API externa cuando existan credenciales válidas
    return null
  }
}
