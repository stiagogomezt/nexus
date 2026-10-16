/**
 * NEXUS TENNIS PREDICTIVE LAB — Modelo Base: Regresión Logística Regularizada
 * 
 * Implementación matemática con:
 * - Escalador estándar (z-score) ajustado EXCLUSIVAMENTE en el conjunto de entrenamiento.
 * - Descenso de gradiente con regularización L2 (Ridge).
 * - Función sigmoide para salida probabilística continua.
 * - Extracción de factores explicativos e importancia de coeficientes.
 */

import type { MatchFeatureVector, TopFactor } from '../types'

export interface ScalerParams {
  means: number[]
  stds: number[]
  featureNames: string[]
}

export class TennisLogisticRegression {
  private weights: number[] = []
  private bias = 0
  private scaler: ScalerParams | null = null
  private featureNames: string[] = [
    'elo_diff',
    'surface_elo_diff',
    'recency_elo_diff',
    'form_5_diff',
    'form_10_diff',
    'surface_win_rate_diff',
    'serve_advantage',
    'first_serve_diff',
    'break_point_resilience_diff',
    'rest_days_diff',
    'fatigue_minutes_diff',
    'h2h_win_rate_a',
    'age_diff',
  ]

  constructor(weights?: number[], bias?: number) {
    if (weights) {
      this.weights = [...weights]
      this.bias = bias ?? 0
    } else {
      // Coeficientes iniciales priors basados en literatura cuantitativa de tenis
      this.weights = [
        0.0035, // elo_diff
        0.0028, // surface_elo_diff
        0.0018, // recency_elo_diff
        0.45,   // form_5_diff
        0.30,   // form_10_diff
        0.55,   // surface_win_rate_diff
        0.80,   // serve_advantage
        0.25,   // first_serve_diff
        0.20,   // break_point_resilience_diff
        0.04,   // rest_days_diff
        0.0008, // fatigue_minutes_diff
        0.40,   // h2h_win_rate_a
        0.015,  // age_diff
      ]
      this.bias = 0
    }
  }

  public extractRawFeatures(v: MatchFeatureVector): number[] {
    return [
      v.elo_diff,
      v.surface_elo_diff,
      v.recency_elo_diff,
      v.form_5_diff,
      v.form_10_diff,
      v.surface_win_rate_diff,
      v.serve_advantage,
      v.first_serve_diff,
      v.break_point_resilience_diff,
      v.rest_days_diff,
      v.fatigue_minutes_diff,
      v.h2h_win_rate_a,
      v.age_diff,
    ]
  }

  /**
   * Ajusta el escalador sobre los datos de entrenamiento (fit scaler).
   * REGLA: Nunca ajustar sobre datos de prueba o validación.
   */
  public fitScaler(trainVectors: MatchFeatureVector[]): void {
    if (trainVectors.length === 0) return

    const n = trainVectors.length
    const numFeatures = this.featureNames.length
    const means = new Array(numFeatures).fill(0)
    const stds = new Array(numFeatures).fill(0)

    for (const v of trainVectors) {
      const row = this.extractRawFeatures(v)
      for (let j = 0; j < numFeatures; j++) {
        means[j] += row[j]
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      means[j] /= n
    }

    for (const v of trainVectors) {
      const row = this.extractRawFeatures(v)
      for (let j = 0; j < numFeatures; j++) {
        const diff = row[j] - means[j]
        stds[j] += diff * diff
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      stds[j] = Math.sqrt(stds[j] / (n - 1 || 1))
      if (stds[j] < 1e-6) stds[j] = 1.0 // Evitar división por cero
    }

    this.scaler = { means, stds, featureNames: [...this.featureNames] }
  }

  public transform(raw: number[]): number[] {
    if (!this.scaler) return raw
    return raw.map((val, idx) => (val - this.scaler!.means[idx]) / this.scaler!.stds[idx])
  }

  /**
   * Entrena el modelo usando Descenso de Gradiente con Regularización L2
   */
  public train(
    trainVectors: MatchFeatureVector[],
    epochs = 300,
    learningRate = 0.05,
    l2Lambda = 0.01
  ): void {
    if (trainVectors.length === 0) return

    this.fitScaler(trainVectors)

    const X = trainVectors.map((v) => this.transform(this.extractRawFeatures(v)))
    const y = trainVectors.map((v) => v.target_winner_a ?? 1)
    const m = X.length
    const n = this.featureNames.length

    this.weights = new Array(n).fill(0)
    this.bias = 0

    for (let epoch = 0; epoch < epochs; epoch++) {
      const dw = new Array(n).fill(0)
      let db = 0

      for (let i = 0; i < m; i++) {
        let z = this.bias
        for (let j = 0; j < n; j++) {
          z += this.weights[j] * X[i][j]
        }
        const p = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))))
        const err = p - y[i]

        for (let j = 0; j < n; j++) {
          dw[j] += err * X[i][j]
        }
        db += err
      }

      for (let j = 0; j < n; j++) {
        // Actualización con regularización L2
        this.weights[j] -= learningRate * (dw[j] / m + l2Lambda * this.weights[j])
      }
      this.bias -= learningRate * (db / m)
    }
  }

  /**
   * Predice la probabilidad cruda p(A gana)
   */
  public predictProbability(vector: MatchFeatureVector): number {
    const raw = this.extractRawFeatures(vector)
    const normalized = this.transform(raw)

    let z = this.bias
    for (let j = 0; j < this.weights.length; j++) {
      z += this.weights[j] * (normalized[j] || 0)
    }

    // Sigmoide estable
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))))
  }

  /**
   * Descompone los factores clave que determinan la probabilidad calculada
   */
  public explainFactors(vector: MatchFeatureVector): {
    topFactors: TopFactor[]
    negativeFactors: TopFactor[]
  } {
    const raw = this.extractRawFeatures(vector)
    const normalized = this.transform(raw)

    const contributions = this.featureNames.map((name, i) => {
      const impactVal = (this.weights[i] || 0) * (normalized[i] || 0)
      return {
        name,
        raw: raw[i],
        impactVal,
      }
    })

    contributions.sort((a, b) => Math.abs(b.impactVal) - Math.abs(a.impactVal))

    const topFactors: TopFactor[] = []
    const negativeFactors: TopFactor[] = []

    for (const c of contributions) {
      const friendlyName = this.formatFeatureName(c.name)
      const desc = this.formatFactorDescription(c.name, c.raw)

      if (c.impactVal >= 0.05) {
        topFactors.push({
          factor_name: friendlyName,
          impact: 'positive',
          weight: Math.round(c.impactVal * 100) / 100,
          description: desc,
        })
      } else if (c.impactVal <= -0.05) {
        negativeFactors.push({
          factor_name: friendlyName,
          impact: 'negative',
          weight: Math.round(Math.abs(c.impactVal) * 100) / 100,
          description: desc,
        })
      }
    }

    return { topFactors: topFactors.slice(0, 4), negativeFactors: negativeFactors.slice(0, 4) }
  }

  private formatFeatureName(feat: string): string {
    const map: Record<string, string> = {
      elo_diff: 'Diferencial Elo General',
      surface_elo_diff: 'Diferencial Elo Superficie',
      recency_elo_diff: 'Momento Competitivo Reciente',
      form_5_diff: 'Forma últimos 5 partidos',
      form_10_diff: 'Consistencia últimos 10',
      surface_win_rate_diff: 'Efectividad en la Superficie',
      serve_advantage: 'Eficiencia Servicio/Devolución',
      first_serve_diff: 'Porcentaje de 1er Servicio',
      break_point_resilience_diff: 'Resiliencia en Puntos de Quiebre',
      rest_days_diff: 'Diferencial de Descanso',
      fatigue_minutes_diff: 'Carga de Minutos en Cancha',
      h2h_win_rate_a: 'Historial Directo (H2H)',
      age_diff: 'Factor Generacional / Físico',
    }
    return map[feat] || feat
  }

  private formatFactorDescription(feat: string, val: number): string {
    if (feat === 'elo_diff') return `Ventaja de ${Math.round(val)} puntos en rating Elo base.`
    if (feat === 'surface_elo_diff') return `Superioridad de ${Math.round(val)} pts en esta superficie.`
    if (feat === 'form_5_diff') return `Diferencial de ${(val * 100).toFixed(0)}% en victorias recientes.`
    if (feat === 'serve_advantage') return `Mayor retención de saque y presión al resto.`
    if (feat === 'h2h_win_rate_a') return `Tasa de éxito de ${(val * 100).toFixed(0)}% en duelos directos.`
    if (feat === 'rest_days_diff') return `Margen de ${Math.round(val)} días de recuperación física.`
    return `Ventaja competitiva diferencial (${val.toFixed(2)}).`
  }
}
