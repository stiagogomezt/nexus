/**
 * NEXUS TENNIS PREDICTIVE LAB — Walk-Forward Backtester y Evaluación por Segmentos
 * 
 * Cumplimiento estricto:
 * 1. Cero data leakage: No random train/test split.
 * 2. Ventanas temporales en avance (Walk-Forward):
 *    Train: periodos pasados
 *    Validation: periodo intermedio (para calibración de Platt)
 *    Test: periodo posterior (evaluación fuera de muestra)
 * 3. Desglose slice-based: ATP vs WTA y por superficies (Hard, Clay, Grass).
 */

import type {
  HistoricalMatchRecord,
  MatchFeatureVector,
  SliceEvaluationReport,
  WalkForwardWindowResult,
} from '../types'
import { TennisFeaturePipeline } from '../features/feature-pipeline'
import { TennisLogisticRegression } from '../models/logistic-regression'
import { PlattCalibrator } from '../calibration/platt-scaling'
import { TennisModelMetrics } from '../models/metrics'

export class WalkForwardBacktester {
  private pipeline: TennisFeaturePipeline

  constructor() {
    this.pipeline = new TennisFeaturePipeline()
  }

  /**
   * Ejecuta el backtest walk-forward sobre la serie temporal histórica
   */
  public runWalkForwardBacktest(
    matches: HistoricalMatchRecord[],
    numWindows = 3
  ): {
    windows: WalkForwardWindowResult[]
    overallReport: SliceEvaluationReport
    testPredictions: Array<{
      matchId: string
      date: string
      surface: string
      tour: string
      yTrue: number
      rawProb: number
      calibratedProb: number
    }>
  } {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const featureVectors = this.pipeline.generateHistoricalDataset(sorted)
    const n = featureVectors.length

    if (n < 6) {
      throw new Error(`Dataset histórico insuficiente para walk-forward (mínimo 6 registros, recibidos: ${n})`)
    }

    const windowSize = Math.floor(n / (numWindows + 1))
    const windowResults: WalkForwardWindowResult[] = []
    const allTestPredictions: Array<{
      matchId: string
      date: string
      surface: string
      tour: string
      yTrue: number
      rawProb: number
      calibratedProb: number
    }> = []

    for (let w = 0; w < numWindows; w++) {
      const trainEndIdx = Math.max(3, (w + 1) * windowSize)
      const valEndIdx = Math.min(n - 1, trainEndIdx + Math.max(2, Math.floor(windowSize / 2)))
      const testEndIdx = Math.min(n, valEndIdx + Math.max(2, windowSize))

      if (valEndIdx >= testEndIdx || trainEndIdx >= valEndIdx) continue

      const trainSlice = featureVectors.slice(0, trainEndIdx)
      const valSlice = featureVectors.slice(trainEndIdx, valEndIdx)
      const testSlice = featureVectors.slice(valEndIdx, testEndIdx)

      // 1. Entrenar regresión logística en Train
      const model = new TennisLogisticRegression()
      model.train(trainSlice, 200, 0.05, 0.01)

      // 2. Calibrar Platt en Validation
      const valRawProbs = valSlice.map((v) => model.predictProbability(v))
      const valLabels = valSlice.map((v) => v.target_winner_a ?? 1)
      const calibrator = new PlattCalibrator()
      calibrator.fit(valRawProbs, valLabels)

      // 3. Evaluar en Test (estrictamente fuera de muestra)
      const testRawProbs = testSlice.map((v) => model.predictProbability(v))
      const testCalibratedProbs = testRawProbs.map((p) => calibrator.calibrate(p))
      const testLabels = testSlice.map((v) => v.target_winner_a ?? 1)

      const rawBrier = TennisModelMetrics.calcBrierScore(testLabels, testRawProbs)
      const calBrier = TennisModelMetrics.calcBrierScore(testLabels, testCalibratedProbs)
      const acc = TennisModelMetrics.calcAccuracy(testLabels, testCalibratedProbs)
      const logLoss = TennisModelMetrics.calcLogLoss(testLabels, testCalibratedProbs)

      for (let i = 0; i < testSlice.length; i++) {
        allTestPredictions.push({
          matchId: testSlice[i].match_id,
          date: testSlice[i].date,
          surface: testSlice[i].surface,
          tour: testSlice[i].tour,
          yTrue: testLabels[i],
          rawProb: testRawProbs[i],
          calibratedProb: testCalibratedProbs[i],
        })
      }

      windowResults.push({
        window_index: w + 1,
        train_period: {
          start: trainSlice[0]?.date || '',
          end: trainSlice[trainSlice.length - 1]?.date || '',
          count: trainSlice.length,
        },
        validation_period: {
          start: valSlice[0]?.date || '',
          end: valSlice[valSlice.length - 1]?.date || '',
          count: valSlice.length,
        },
        test_period: {
          start: testSlice[0]?.date || '',
          end: testSlice[testSlice.length - 1]?.date || '',
          count: testSlice.length,
        },
        raw_brier_score: Math.round(rawBrier * 1000) / 1000,
        calibrated_brier_score: Math.round(calBrier * 1000) / 1000,
        accuracy: Math.round(acc * 1000) / 1000,
        log_loss: Math.round(logLoss * 1000) / 1000,
      })
    }

    // Segmentación por slices (ATP/WTA y Superficies)
    const overallReport = this.buildSliceReport(allTestPredictions)

    return {
      windows: windowResults,
      overallReport,
      testPredictions: allTestPredictions,
    }
  }

  private buildSliceReport(
    preds: Array<{
      matchId: string
      date: string
      surface: string
      tour: string
      yTrue: number
      rawProb: number
      calibratedProb: number
    }>
  ): SliceEvaluationReport {
    const yAll = preds.map((p) => p.yTrue)
    const probAll = preds.map((p) => p.calibratedProb)

    const atpPreds = preds.filter((p) => p.tour === 'ATP')
    const wtaPreds = preds.filter((p) => p.tour === 'WTA')

    const hardPreds = preds.filter((p) => p.surface === 'Hard')
    const clayPreds = preds.filter((p) => p.surface === 'Clay')
    const grassPreds = preds.filter((p) => p.surface === 'Grass')

    return {
      overall: TennisModelMetrics.evaluate(yAll, probAll),
      by_tour: {
        ATP: TennisModelMetrics.evaluate(
          atpPreds.map((p) => p.yTrue),
          atpPreds.map((p) => p.calibratedProb)
        ),
        WTA: TennisModelMetrics.evaluate(
          wtaPreds.map((p) => p.yTrue),
          wtaPreds.map((p) => p.calibratedProb)
        ),
      },
      by_surface: {
        Hard: TennisModelMetrics.evaluate(
          hardPreds.map((p) => p.yTrue),
          hardPreds.map((p) => p.calibratedProb)
        ),
        Clay: TennisModelMetrics.evaluate(
          clayPreds.map((p) => p.yTrue),
          clayPreds.map((p) => p.calibratedProb)
        ),
        Grass: TennisModelMetrics.evaluate(
          grassPreds.map((p) => p.yTrue),
          grassPreds.map((p) => p.calibratedProb)
        ),
      },
    }
  }
}
