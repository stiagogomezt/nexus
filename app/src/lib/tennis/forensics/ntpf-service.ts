/**
 * NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — MASTER SERVICE
 * 
 * Public API for running post-match autopsies, computing multilevel deltas,
 * executing diagnostic classification, sensitivity counterfactuals, and telemetry tracking.
 */

import {
  NTPFForensicRecord,
  NTPFModelTelemetry,
  NTPFShadowCandidate,
} from './types'
import {
  NTPFMultilevelDeltaEngine,
  ExpectedMatchBaseline,
  ObservedMatchStatistics,
} from './multilevel-delta-engine'
import { NTPFDiagnosticClassifier } from './diagnostic-classifier'
import { NTPFCounterfactualEngine } from './counterfactual-engine'
import { NTPFShadowPipelineGovernance } from './shadow-pipeline-governance'
import { TennisSurface, TennisTour } from '../types'
import { FeatureShapAttribution } from '../engine/residual-ml-model'

export interface PostMatchAutopsyInput {
  match_id: string
  match_fingerprint: string
  match_date: string
  player_a_name: string
  player_b_name: string
  tournament: string
  surface: TennisSurface
  tour: TennisTour
  model_version: string
  model_sha256: string
  expected_baseline: ExpectedMatchBaseline
  observed_stats: ObservedMatchStatistics
  shap_attributions: FeatureShapAttribution[]
  feature_vector: Record<string, number>
  market_fair_p_a?: number
  insider_trading_z?: number
  news_conflict_flag?: boolean
  medical_intervention_observed?: boolean
  workload_ewma_a?: number
  data_quality_tier?: string
}

export class NTPFService {
  /**
   * Executes a complete post-match autopsy complying with all 5 NTPF constraints.
   */
  public static runPostMatchAutopsy(input: PostMatchAutopsyInput): NTPFForensicRecord {
    const {
      match_id,
      match_fingerprint,
      match_date,
      player_a_name,
      player_b_name,
      tournament,
      surface,
      tour,
      model_version,
      model_sha256,
      expected_baseline,
      observed_stats,
      shap_attributions,
      feature_vector,
      market_fair_p_a,
      insider_trading_z,
      news_conflict_flag,
      medical_intervention_observed,
      workload_ewma_a,
      data_quality_tier,
    } = input

    // 1. Multilevel Performance Deltas (Point, Game, Set, Match)
    const deltas = NTPFMultilevelDeltaEngine.computeDeltas(expected_baseline, observed_stats)

    // 2. Diagnostic Classifier (Tree typology & separation of court analytics vs model attribution)
    const { algorithmic_diagnostics, court_analytics } = NTPFDiagnosticClassifier.diagnose({
      predicted_p_a: expected_baseline.p_win_a,
      winner_is_a: observed_stats.winner_is_a,
      market_fair_p_a,
      insider_trading_z,
      deltas,
      shap_attributions,
      news_conflict_flag,
      medical_intervention_observed,
      workload_ewma_a,
      data_quality_tier,
    })

    // 3. Counterfactual Sensitivity Audit (audits model elasticity without alternate realities)
    const counterfactual_audit = NTPFCounterfactualEngine.auditSensitivity({
      predicted_p_a: expected_baseline.p_win_a,
      winner_is_a: observed_stats.winner_is_a,
      shap_attributions,
      feature_vector,
    })

    const forensic_id = `ntpf_${match_id}_${Date.now()}`

    return {
      forensic_id,
      match_id,
      match_fingerprint,
      match_date,
      player_a_name,
      player_b_name,
      tournament,
      surface,
      tour,
      model_version,
      model_sha256,
      algorithmic_diagnostics,
      court_analytics,
      multilevel_deltas: deltas,
      counterfactual_audit,
      created_at: new Date().toISOString(),
    }
  }

  /**
   * Records a slice telemetry evaluation in the continuous learning pipeline.
   */
  public static recordSliceTelemetry(params: {
    modelVersion: string
    sliceType: NTPFModelTelemetry['slice_type']
    predictions: number[]
    actualOutcomes: number[]
  }): NTPFModelTelemetry {
    return NTPFShadowPipelineGovernance.recordTelemetry(params)
  }

  /**
   * Registers a shadow candidate model.
   */
  public static registerShadowCandidate(candidate: {
    candidateVersion: string
    sha256Hash: string
    benchmarkBrier: number
    benchmarkLogLoss: number
    walkForwardFolds: number
    betaCalibration: { a: number; b: number; c: number }
  }): NTPFShadowCandidate {
    return NTPFShadowPipelineGovernance.registerShadowCandidate(candidate)
  }

  /**
   * Promotes a shadow candidate if benchmark superiority is proven.
   */
  public static promoteShadowCandidate(
    candidateVersion: string,
    activeBaselineBrier: number,
    justification: string
  ): NTPFShadowCandidate {
    return NTPFShadowPipelineGovernance.promoteShadowCandidate(candidateVersion, activeBaselineBrier, justification)
  }

  /**
   * Retrieves telemetry history.
   */
  public static getTelemetryHistory(): NTPFModelTelemetry[] {
    return NTPFShadowPipelineGovernance.getTelemetryHistory()
  }

  /**
   * Retrieves shadow candidate history.
   */
  public static getShadowCandidates(): NTPFShadowCandidate[] {
    return NTPFShadowPipelineGovernance.getShadowCandidates()
  }
}
