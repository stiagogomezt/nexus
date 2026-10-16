/**
 * NEXUS TENNIS PREDICTIVE LAB — Modelo Avanzado: Gradient Boosted Trees Ensemble
 * 
 * Implementación de ensamble de árboles de decisión sobre residuos del gradiente negativo
 * de la entropía cruzada binaria (Log Loss).
 * - Algoritmo con shrinkage (tasa de aprendizaje eta = 0.1)
 * - Criterio de split de mejor ganancia de varianza/entropía
 * - Predicción probabilística vía enlace logit
 */

import type { MatchFeatureVector } from '../types'
import { TennisLogisticRegression } from './logistic-regression'

interface DecisionTreeStump {
  featureIndex: number
  threshold: number
  leftValue: number
  rightValue: number
}

export class TennisGradientBoostingModel {
  private trees: DecisionTreeStump[] = []
  private baseScore = 0
  private learningRate = 0.1
  private numTrees = 25
  private featureExtractor = new TennisLogisticRegression()

  constructor(learningRate = 0.1, numTrees = 25) {
    this.learningRate = learningRate
    this.numTrees = numTrees
  }

  public train(trainVectors: MatchFeatureVector[]): void {
    if (trainVectors.length === 0) return

    const X = trainVectors.map((v) => this.featureExtractor.extractRawFeatures(v))
    const y = trainVectors.map((v) => v.target_winner_a ?? 1)
    const m = X.length
    const numFeatures = X[0].length

    // Log-odds inicial basado en proporción de clases
    const posCount = y.filter((val) => val === 1).length
    const p0 = Math.max(0.01, Math.min(0.99, posCount / m))
    this.baseScore = Math.log(p0 / (1 - p0))

    // Predicciones acumuladas F(x)
    const F = new Array(m).fill(this.baseScore)
    this.trees = []

    for (let t = 0; t < this.numTrees; t++) {
      // 1. Calcular pseudoresiduos r_i = y_i - p_i
      const residuals = new Array(m).fill(0)
      for (let i = 0; i < m; i++) {
        const p = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, F[i]))))
        residuals[i] = y[i] - p
      }

      // 2. Encontrar el mejor split (árbol / stump) que minimice el error cuadrático con los residuos
      let bestFeature = 0
      let bestThreshold = 0
      let bestLeftVal = 0
      let bestRightVal = 0
      let bestLoss = Infinity

      for (let j = 0; j < numFeatures; j++) {
        // Muestrear umbrales a partir de cuantiles de la feature j
        const values = X.map((row) => row[j]).sort((a, b) => a - b)
        const step = Math.max(1, Math.floor(values.length / 10))
        const candidateThresholds: number[] = []
        for (let idx = 0; idx < values.length; idx += step) {
          candidateThresholds.push(values[idx])
        }

        for (const thresh of candidateThresholds) {
          const leftIdx: number[] = []
          const rightIdx: number[] = []

          for (let i = 0; i < m; i++) {
            if (X[i][j] <= thresh) {
              leftIdx.push(i)
            } else {
              rightIdx.push(i)
            }
          }

          if (leftIdx.length === 0 || rightIdx.length === 0) continue

          const leftMean = leftIdx.reduce((s, i) => s + residuals[i], 0) / leftIdx.length
          const rightMean = rightIdx.reduce((s, i) => s + residuals[i], 0) / rightIdx.length

          let splitLoss = 0
          for (const i of leftIdx) {
            const err = residuals[i] - leftMean
            splitLoss += err * err
          }
          for (const i of rightIdx) {
            const err = residuals[i] - rightMean
            splitLoss += err * err
          }

          if (splitLoss < bestLoss) {
            bestLoss = splitLoss
            bestFeature = j
            bestThreshold = thresh
            bestLeftVal = leftMean
            bestRightVal = rightMean
          }
        }
      }

      // 3. Agregar el árbol al ensamble
      const tree: DecisionTreeStump = {
        featureIndex: bestFeature,
        threshold: bestThreshold,
        leftValue: bestLeftVal,
        rightValue: bestRightVal,
      }
      this.trees.push(tree)

      // 4. Actualizar predicciones acumuladas con shrinkage
      for (let i = 0; i < m; i++) {
        const val = X[i][bestFeature] <= bestThreshold ? bestLeftVal : bestRightVal
        F[i] += this.learningRate * val
      }
    }
  }

  public predictRawScore(vector: MatchFeatureVector): number {
    const raw = this.featureExtractor.extractRawFeatures(vector)
    let score = this.baseScore

    for (const tree of this.trees) {
      const step = raw[tree.featureIndex] <= tree.threshold ? tree.leftValue : tree.rightValue
      score += this.learningRate * step
    }

    return score
  }

  public predictProbability(vector: MatchFeatureVector): number {
    const score = this.predictRawScore(vector)
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, score))))
  }
}
