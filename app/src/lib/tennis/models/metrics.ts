/**
 * NEXUS TENNIS PREDICTIVE LAB — Métricas Cuantitativas de Evaluación
 * 
 * Implementación de:
 * - Accuracy
 * - Log Loss (Binary Cross-Entropy)
 * - Brier Score
 * - Expected Calibration Error (ECE)
 * - ROC AUC (Área Bajo la Curva ROC)
 */

import type { ModelPerformanceMetrics } from '../types'

export class TennisModelMetrics {
  public static calcAccuracy(yTrue: number[], yProb: number[], threshold = 0.5): number {
    if (yTrue.length === 0) return 0
    let correct = 0
    for (let i = 0; i < yTrue.length; i++) {
      const pred = yProb[i] >= threshold ? 1 : 0
      if (pred === yTrue[i]) correct++
    }
    return correct / yTrue.length
  }

  public static calcLogLoss(yTrue: number[], yProb: number[], eps = 1e-15): number {
    if (yTrue.length === 0) return 0
    let totalLoss = 0
    for (let i = 0; i < yTrue.length; i++) {
      const p = Math.max(eps, Math.min(1 - eps, yProb[i]))
      const y = yTrue[i]
      totalLoss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p))
    }
    return totalLoss / yTrue.length
  }

  public static calcBrierScore(yTrue: number[], yProb: number[]): number {
    if (yTrue.length === 0) return 0
    let sumSquaredDiff = 0
    for (let i = 0; i < yTrue.length; i++) {
      const diff = yProb[i] - yTrue[i]
      sumSquaredDiff += diff * diff
    }
    return sumSquaredDiff / yTrue.length
  }

  /**
   * Expected Calibration Error (ECE) con 10 bins deciles
   */
  public static calcECE(yTrue: number[], yProb: number[], numBins = 10): number {
    if (yTrue.length === 0) return 0
    const binSize = 1 / numBins
    let ece = 0

    for (let b = 0; b < numBins; b++) {
      const binLower = b * binSize
      const binUpper = (b + 1) * binSize

      const binIndices: number[] = []
      for (let i = 0; i < yProb.length; i++) {
        if (yProb[i] >= binLower && (b === numBins - 1 ? yProb[i] <= binUpper : yProb[i] < binUpper)) {
          binIndices.push(i)
        }
      }

      if (binIndices.length > 0) {
        const binConfidence =
          binIndices.reduce((sum, idx) => sum + yProb[idx], 0) / binIndices.length
        const binAccuracy =
          binIndices.reduce((sum, idx) => sum + yTrue[idx], 0) / binIndices.length

        ece += (binIndices.length / yTrue.length) * Math.abs(binAccuracy - binConfidence)
      }
    }

    return ece
  }

  /**
   * Cálculo de ROC AUC mediante suma de rangos de Wilcoxon-Mann-Whitney
   */
  public static calcRocAuc(yTrue: number[], yProb: number[]): number {
    if (yTrue.length === 0) return 0.5
    const posCount = yTrue.filter((y) => y === 1).length
    const negCount = yTrue.length - posCount

    if (posCount === 0 || negCount === 0) return 0.5

    const paired = yProb.map((p, idx) => ({ prob: p, label: yTrue[idx] }))
    paired.sort((a, b) => a.prob - b.prob)

    // Asignar rangos promediados para empates
    let rankSumPos = 0
    let i = 0
    while (i < paired.length) {
      let j = i
      while (j < paired.length && paired[j].prob === paired[i].prob) {
        j++
      }
      const avgRank = (i + 1 + j) / 2
      for (let k = i; k < j; k++) {
        if (paired[k].label === 1) {
          rankSumPos += avgRank
        }
      }
      i = j
    }

    const u = rankSumPos - (posCount * (posCount + 1)) / 2
    return u / (posCount * negCount)
  }

  public static evaluate(yTrue: number[], yProb: number[]): ModelPerformanceMetrics {
    return {
      accuracy: Math.round(this.calcAccuracy(yTrue, yProb) * 1000) / 1000,
      log_loss: Math.round(this.calcLogLoss(yTrue, yProb) * 1000) / 1000,
      brier_score: Math.round(this.calcBrierScore(yTrue, yProb) * 1000) / 1000,
      calibration_error_ece: Math.round(this.calcECE(yTrue, yProb) * 1000) / 1000,
      roc_auc: Math.round(this.calcRocAuc(yTrue, yProb) * 1000) / 1000,
      sample_size: yTrue.length,
    }
  }
}
