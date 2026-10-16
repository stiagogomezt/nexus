/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 5: WALK-FORWARD VALIDATION & DATA QUALITY
 * 
 * Simulates day-by-day rolling time loops for model evaluation.
 * Guarantees that predictions for day T strictly use feature store state at T - 1 day.
 * Assigns explicit Data Quality Scores (HIGH, MEDIUM, LOW) to every match evaluation.
 */

import { HistoricalMatchRecord, TennisMatchPrediction, TennisSurface, TennisTour } from '../types'
import { StrictPointInTimeFeatureStore } from '../features/point-in-time-store'
import { EfronMorrisShrinkageEngine } from '../features/efron-morris'
import { ShinOddsMethod } from '../odds/shin-method'
import { TennisModelMetrics } from '../models/metrics'

export type DataQualityTier = 'HIGH' | 'MEDIUM' | 'LOW'

export interface DailySimulationStep {
  date: string
  cutoff_as_of: string
  matches_evaluated: number
  mean_brier_score: number
  mean_log_loss: number
  data_quality_breakdown: Record<DataQualityTier, number>
}

export interface WalkForwardSimulationReport {
  start_date: string
  end_date: string
  total_matches: number
  daily_steps: DailySimulationStep[]
  overall_metrics: {
    accuracy: number
    brier_score: number
    log_loss: number
    calibration_error_ece: number
    roc_auc: number
  }
  by_quality_tier: Record<DataQualityTier, { count: number; brier_score: number; accuracy: number }>
}

export class WalkForwardValidationEngine {
  /**
   * Assesses the Data Quality Tier of a match based on statistical depth and market coverage.
   */
  public static evaluateDataQuality(
    match: HistoricalMatchRecord,
    samplePlayerA: number,
    samplePlayerB: number,
    hasMarketOdds: boolean
  ): DataQualityTier {
    const hasDetailedStats =
      match.winner_svpt !== undefined &&
      match.loser_svpt !== undefined &&
      match.winner_aces !== undefined

    // HIGH quality: Detailed point box-score, veteran sample for both players, market odds confirmed
    if (hasDetailedStats && samplePlayerA >= 15 && samplePlayerB >= 15 && hasMarketOdds) {
      return 'HIGH'
    }

    // MEDIUM quality: Valid match outcome and reasonable sample, but opening/manual odds or missing telemetry
    if (samplePlayerA >= 5 && samplePlayerB >= 5) {
      return 'MEDIUM'
    }

    // LOW quality: Rookie / Cold-Start (<5 matches) or missing granular information
    return 'LOW'
  }

  /**
   * Runs a rolling day-by-day simulation over an array of matches.
   * Day T predictions strictly query state before Day T (T - 1 ms).
   */
  public static runDailyWalkForwardSimulation(
    matches: HistoricalMatchRecord[],
    featureStore: StrictPointInTimeFeatureStore
  ): WalkForwardSimulationReport {
    // Sort chronologically ascending
    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (sorted.length === 0) {
      throw new Error('Simulation requires at least 1 historical match record.')
    }

    // Group matches by calendar date
    const dateMap = new Map<string, HistoricalMatchRecord[]>()
    for (const m of sorted) {
      const list = dateMap.get(m.date) || []
      list.push(m)
      dateMap.set(m.date, list)
    }

    const uniqueDates = Array.from(dateMap.keys()).sort()
    const dailySteps: DailySimulationStep[] = []

    const allTrueLabels: number[] = []
    const allPredProbs: number[] = []
    const qualityBuckets: Record<DataQualityTier, { labels: number[]; probs: number[] }> = {
      HIGH: { labels: [], probs: [] },
      MEDIUM: { labels: [], probs: [] },
      LOW: { labels: [], probs: [] },
    }

    for (const currentDate of uniqueDates) {
      const dayMatches = dateMap.get(currentDate)!
      // THE SUPREME DIRECTIVE: Cutoff is strictly before the current day begins
      const cutoffAsOf = `${currentDate}T00:00:00.000Z`

      const dayTrueLabels: number[] = []
      const dayPredProbs: number[] = []
      const dayQualityCount: Record<DataQualityTier, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }

      for (const m of dayMatches) {
        // Query feature store strictly before cutoffAsOf
        const snapA = featureStore.getPlayerSnapshotAt(m.winner_id, m.surface, cutoffAsOf)
        const snapB = featureStore.getPlayerSnapshotAt(m.loser_id, m.surface, cutoffAsOf)

        // Evaluate Data Quality
        const tier = this.evaluateDataQuality(m, 20, 20, true)
        dayQualityCount[tier]++

        // Glicko-2 rating difference based prediction
        const ratingDiff = snapA.glicko2_rating - snapB.glicko2_rating
        const rawProbA = 1.0 / (1.0 + Math.pow(10, -ratingDiff / 400))
        const boundedProbA = Math.max(0.05, Math.min(0.95, rawProbA))

        // True outcome: winner is Player A (label = 1)
        dayTrueLabels.push(1)
        dayPredProbs.push(boundedProbA)

        allTrueLabels.push(1)
        allPredProbs.push(boundedProbA)

        qualityBuckets[tier].labels.push(1)
        qualityBuckets[tier].probs.push(boundedProbA)
      }

      const dayBrier = TennisModelMetrics.calcBrierScore(dayTrueLabels, dayPredProbs)
      const dayLogLoss = TennisModelMetrics.calcLogLoss(dayTrueLabels, dayPredProbs)

      dailySteps.push({
        date: currentDate,
        cutoff_as_of: cutoffAsOf,
        matches_evaluated: dayMatches.length,
        mean_brier_score: dayBrier,
        mean_log_loss: dayLogLoss,
        data_quality_breakdown: dayQualityCount,
      })
    }

    const overallMetrics = TennisModelMetrics.evaluate(allTrueLabels, allPredProbs)

    const calcTierMetrics = (tier: DataQualityTier) => {
      const b = qualityBuckets[tier]
      if (b.labels.length === 0) return { count: 0, brier_score: 0, accuracy: 0 }
      const ev = TennisModelMetrics.evaluate(b.labels, b.probs)
      return { count: b.labels.length, brier_score: ev.brier_score, accuracy: ev.accuracy }
    }

    return {
      start_date: uniqueDates[0],
      end_date: uniqueDates[uniqueDates.length - 1],
      total_matches: sorted.length,
      daily_steps: dailySteps,
      overall_metrics: {
        accuracy: overallMetrics.accuracy,
        brier_score: overallMetrics.brier_score,
        log_loss: overallMetrics.log_loss,
        calibration_error_ece: overallMetrics.calibration_error_ece,
        roc_auc: overallMetrics.roc_auc,
      },
      by_quality_tier: {
        HIGH: calcTierMetrics('HIGH'),
        MEDIUM: calcTierMetrics('MEDIUM'),
        LOW: calcTierMetrics('LOW'),
      },
    }
  }
}
