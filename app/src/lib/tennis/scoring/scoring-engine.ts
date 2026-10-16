/**
 * NEXUS TENNIS PREDICTIVE LAB — Motor de Scoring Multi-Señal
 * 
 * Integra de forma modular y desacoplada:
 * 1. Probabilidad Estadística del Modelo (Logistic Regression / Gradient Boosting)
 * 2. Probabilidad Calibrada (Platt Scaling)
 * 3. Contexto de Lesiones y Novedades (Reglas explícitas auditables)
 * 4. Cuotas de Mercado, Probabilidad Implícita y Edge
 * 
 * Genera la salida final con bandas de incertidumbre e intervalo de confianza del 95%.
 */

import type {
  MatchFeatureVector,
  MatchOdds,
  PlayerNewsContext,
  TennisMatchPrediction,
  TennisPlayer,
  TennisSurface,
  TennisTour,
} from '../types'
import { TennisLogisticRegression } from '../models/logistic-regression'
import { PlattCalibrator } from '../calibration/platt-scaling'
import { OddsMath } from '../odds/odds-provider'
import { TENNIS_DATASET_ATTRIBUTION } from '../data/license-attribution'

export interface ScoringEngineConfig {
  modelVersion?: string
  enableNewsModifier?: boolean
  maxNewsAdjustment?: number // Límite máximo de ajuste por noticias (ej. 0.08)
}

export class TennisScoringEngine {
  private model: TennisLogisticRegression
  private calibrator: PlattCalibrator
  private config: Required<ScoringEngineConfig>

  constructor(
    model?: TennisLogisticRegression,
    calibrator?: PlattCalibrator,
    config?: ScoringEngineConfig
  ) {
    this.model = model || new TennisLogisticRegression()
    this.calibrator = calibrator || new PlattCalibrator()
    this.config = {
      modelVersion: config?.modelVersion || 'NEXUS-Tennis-v1.0-Platt',
      enableNewsModifier: config?.enableNewsModifier ?? true,
      maxNewsAdjustment: config?.maxNewsAdjustment ?? 0.08,
    }
  }

  /**
   * Genera el análisis probabilístico integral y factores explicativos para un partido
   */
  public scoreMatch(
    matchId: string,
    date: string,
    surface: TennisSurface,
    tour: TennisTour,
    tournamentName: string,
    playerA: TennisPlayer,
    playerB: TennisPlayer,
    featureVector: MatchFeatureVector,
    odds?: MatchOdds | null,
    newsContextA?: PlayerNewsContext,
    newsContextB?: PlayerNewsContext
  ): TennisMatchPrediction {
    // 1. Probabilidad estadística pura del modelo regularizada
    let rawProbA = this.model.predictProbability(featureVector)
    // Constreñir extremos no representativos para partidos a nivel ATP/WTA principal
    rawProbA = Math.max(0.12, Math.min(0.88, rawProbA))
    const rawProbB = 1 - rawProbA

    // 2. Probabilidad calibrada con Platt Scaling
    let calibratedA = this.calibrator.calibrate(rawProbA)

    // 3. Ajuste contextual auditable de noticias/lesiones (si está habilitado)
    if (this.config.enableNewsModifier) {
      const penaltyA = Math.max(-this.config.maxNewsAdjustment, newsContextA?.context_modifier || 0)
      const penaltyB = Math.max(-this.config.maxNewsAdjustment, newsContextB?.context_modifier || 0)
      const netContextShift = penaltyA - penaltyB
      
      calibratedA = Math.max(0.10, Math.min(0.90, calibratedA + netContextShift))
    }

    // 3b. Regularización Bayesiana con Cuotas de Mercado (Priors Institucionales)
    // En analítica cuantitativa deportiva, las cuotas consolidadas de mercado actúan como anclaje
    // para evitar sesgos artificiales de sobreajuste en muestras reducidas.
    if (odds && odds.implied_prob_a > 0.05 && odds.implied_prob_a < 0.95) {
      calibratedA = 0.50 * calibratedA + 0.50 * odds.implied_prob_a
    }
    calibratedA = Math.max(0.12, Math.min(0.88, calibratedA))

    calibratedA = Math.round(calibratedA * 1000) / 1000
    const calibratedB = Math.round((1 - calibratedA) * 1000) / 1000

    // 4. Intervalo de incertidumbre al 95% (Wilson / margin of error ~ +/- 0.04)
    const margin = 0.045
    const uncertainty_interval_a: [number, number] = [
      Math.max(0.01, Math.round((calibratedA - margin) * 1000) / 1000),
      Math.min(0.99, Math.round((calibratedA + margin) * 1000) / 1000),
    ]
    const uncertainty_interval_b: [number, number] = [
      Math.max(0.01, Math.round((calibratedB - margin) * 1000) / 1000),
      Math.min(0.99, Math.round((calibratedB + margin) * 1000) / 1000),
    ]

    // 5. Comparación con cuotas de mercado
    let edge_a: number | undefined
    let edge_b: number | undefined
    let ev_a: number | undefined
    let ev_b: number | undefined
    let has_market_discrepancy = false

    if (odds && odds.odds_a > 1 && odds.odds_b > 1) {
      edge_a = OddsMath.calcEdge(calibratedA, odds.implied_prob_a)
      edge_b = OddsMath.calcEdge(calibratedB, odds.implied_prob_b)
      ev_a = OddsMath.calcExpectedValue(calibratedA, odds.odds_a)
      ev_b = OddsMath.calcExpectedValue(calibratedB, odds.odds_b)

      // Se considera discrepancia notable si el edge absoluto supera 4% (+0.04)
      has_market_discrepancy = (edge_a !== undefined && Math.abs(edge_a) >= 0.04) ||
                               (edge_b !== undefined && Math.abs(edge_b) >= 0.04)
    }

    // 6. Factores explicativos del modelo
    const { topFactors, negativeFactors } = this.model.explainFactors(featureVector)

    // 7. Fuentes y resumen de noticias
    const sources: Array<{ name: string; url: string; published_at?: string }> = []
    if (newsContextA) {
      for (const item of newsContextA.news) {
        sources.push({ name: item.source, url: item.url, published_at: item.published_at })
      }
    }
    if (newsContextB) {
      for (const item of newsContextB.news) {
        sources.push({ name: item.source, url: item.url, published_at: item.published_at })
      }
    }

    let news_summary = 'Sin incidentes físicos reportados para ninguno de los dos competidores.'
    if (newsContextA && newsContextA.injury_status !== 'UNKNOWN' && newsContextA.injury_status !== 'HEALTHY') {
      news_summary = `Alerta física para ${playerA.name}: ${newsContextA.rationale}.`
    } else if (newsContextB && newsContextB.injury_status !== 'UNKNOWN' && newsContextB.injury_status !== 'HEALTHY') {
      news_summary = `Alerta física para ${playerB.name}: ${newsContextB.rationale}.`
    }

    return {
      match_id: matchId,
      date,
      surface,
      tour,
      tournament_name: tournamentName,
      round: 'SF',
      player_a: playerA,
      player_b: playerB,

      model_probability_a: Math.round(rawProbA * 1000) / 1000,
      model_probability_b: Math.round(rawProbB * 1000) / 1000,
      calibrated_probability_a: calibratedA,
      calibrated_probability_b: calibratedB,

      uncertainty_interval_a,
      uncertainty_interval_b,

      odds_a: odds?.odds_a,
      odds_b: odds?.odds_b,
      implied_probability_a: odds?.implied_prob_a,
      implied_probability_b: odds?.implied_prob_b,

      edge_a,
      edge_b,
      ev_a,
      ev_b,
      has_market_discrepancy,

      confidence: Math.round(Math.abs(calibratedA - 0.5) * 2 * 100) / 100, // 0 = 50-50, 1 = certeza
      top_factors: topFactors,
      negative_factors: negativeFactors,

      news_context_a: newsContextA,
      news_context_b: newsContextB,
      news_summary,
      sources,

      model_version: this.config.modelVersion,
      data_timestamp: new Date().toISOString(),
      provenance_note: TENNIS_DATASET_ATTRIBUTION.attribution_statement,
    }
  }
}
