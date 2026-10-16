/**
 * NEXUS TENNIS CONTEXT INTELLIGENCE (NTCI) — PHASE 4: API OUTPUT CONTRACTS SERVICE
 * 
 * Strict implementation of NTCI public API endpoints:
 * 1. Pre-Match Endpoint: producePreMatchContextOutput()
 * 2. In-Play Endpoint: produceInPlayForecastOutput()
 */

import {
  NTCIRawEventInput,
  NTCIPreMatchOutput,
  NTCIInPlayOutput,
  NTCIInPlayMatchState,
} from './types'
import { NTCIPreMatchPipeline } from './pre-match-pipeline'
import { NTCILiveEmpiricalBayesUpdater, InPlayObservationInput } from './live-empirical-bayes'

export class NTCIService {
  /**
   * Phase 4 Contract 1: PRE-MATCH OUTPUT
   * Converts unstructured web data into structured features, audits freshness,
   * detects source conflicts, and outputs calibrated epistemic bounds.
   */
  public static generatePreMatchReport(params: {
    baseProbability: number
    rawEvents: NTCIRawEventInput[]
    referenceTimeISO?: string
  }): NTCIPreMatchOutput {
    const { baseProbability, rawEvents, referenceTimeISO } = params

    const processed = NTCIPreMatchPipeline.processPreMatchContext(
      rawEvents,
      baseProbability,
      referenceTimeISO
    )

    return {
      probability: baseProbability,
      news_context: processed.extracted_features,
      data_freshness: processed.latest_timestamp,
      uncertainty: processed.uncertainty,
    }
  }

  /**
   * Phase 4 Contract 2: IN-PLAY OUTPUT
   * Executes low-latency Dynamic Empirical Bayes updating given match score state
   * and observed point sequence, completely free from psychological momentum narratives.
   */
  public static generateInPlayReport(params: InPlayObservationInput): NTCIInPlayOutput {
    return NTCILiveEmpiricalBayesUpdater.updateInPlayForecast(params)
  }
}
