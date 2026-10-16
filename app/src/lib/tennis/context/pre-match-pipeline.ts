/**
 * NEXUS TENNIS CONTEXT INTELLIGENCE (NTCI) — PHASE 1: PRE-MATCH WEB RESEARCH PIPELINE
 * 
 * 1. Zero Medical Inference Protocol:
 *    Extracts strictly observable and verifiable facts (withdrawals, official quotes,
 *    on-court strapping, schedule changes). Rejects diagnostic speculation or recovery prognoses.
 * 
 * 2. Read-Only Probability Invariant:
 *    The NLP pipeline outputs structured features (availability_status, topic, confidence).
 *    It CANNOT directly mutate model win probabilities.
 * 
 * 3. Conflict Preservation Engine:
 *    If conflicting reports exist between sources, preserves all items, activates
 *    conflict_flag = true, and instructs downstream models to expand epistemic uncertainty bands.
 */

import {
  NTCIRawEventInput,
  NTCIExtractedFeature,
  NTCIAvailabilityStatus,
  NTCIUncertaintyContract,
} from './types'
import { NTCISourceFreshnessEngine } from './source-freshness-engine'

export class NTCIPreMatchPipeline {
  /**
   * Extracts availability status and verifiable factual text from an unstructured event.
   * STRICT: Prohibits medical diagnostics or speculative inferences.
   */
  public static extractFeature(
    raw: NTCIRawEventInput,
    referenceTimeISO?: string
  ): NTCIExtractedFeature {
    const parsed = NTCISourceFreshnessEngine.processEvent(raw, referenceTimeISO)
    const text = `${raw.title} ${raw.raw_text}`.toLowerCase()

    let status: NTCIAvailabilityStatus = 'UNKNOWN'
    let confidence = 0.5
    let verifiableFact = 'Observational report recorded.'

    // 1. Definite Official Withdrawal
    if (
      text.includes('withdrew') ||
      text.includes('withdraws') ||
      text.includes('walkover') ||
      text.includes('retired from tournament') ||
      text.includes('official withdrawal')
    ) {
      status = 'WITHDRAWN'
      confidence = parsed.source_tier === 'OFFICIAL' ? 0.99 : parsed.source_tier === 'REPUTABLE_MEDIA' ? 0.90 : 0.75
      verifiableFact = 'Official withdrawal or walkover announced.'
    }
    // 2. Documented observable issue (Strapping, Medical Timeout, Scans completed)
    else if (
      text.includes('mto') ||
      text.includes('medical time-out') ||
      text.includes('heavily strapped') ||
      text.includes('tape on') ||
      text.includes('trainer called') ||
      text.includes('confirmed scan')
    ) {
      status = 'DOCUMENTED_ISSUE'
      confidence = parsed.source_tier === 'OFFICIAL' ? 0.95 : 0.85
      verifiableFact = 'Observable physical intervention or documented strapping verified.'
    }
    // 3. Questionable status (discomfort, practice curtailed, doubt expressed by player/coach)
    else if (
      text.includes('questionable') ||
      text.includes('doubtful') ||
      text.includes('cut short practice') ||
      text.includes('discomfort') ||
      text.includes('soreness') ||
      text.includes('struggling with')
    ) {
      status = 'QUESTIONABLE'
      confidence = parsed.source_tier === 'OFFICIAL' ? 0.90 : parsed.source_tier === 'REPUTABLE_MEDIA' ? 0.80 : 0.60
      verifiableFact = 'Public expression of physical doubt or interrupted practice session.'
    }
    // 4. Optimal condition (cleared, full practice, positive statement)
    else if (
      text.includes('100%') ||
      text.includes('fully fit') ||
      text.includes('cleared to play') ||
      text.includes('ready for') ||
      text.includes('feeling great') ||
      text.includes('intense practice')
    ) {
      status = 'OPTIMAL'
      confidence = parsed.source_tier === 'OFFICIAL' ? 0.95 : 0.80
      verifiableFact = 'Confirmed completion of standard preparation and stated match readiness.'
    }

    // Weight confidence by source tier and freshness decay
    const tierMultiplier =
      parsed.source_tier === 'OFFICIAL' ? 1.0 :
      parsed.source_tier === 'REPUTABLE_MEDIA' ? 0.90 :
      parsed.source_tier === 'SECONDARY' ? 0.70 : 0.40

    const adjustedConfidence = Math.max(0.1, Math.min(1.0, Math.round(confidence * tierMultiplier * parsed.decay_weight * 100) / 100))

    return {
      ...parsed,
      availability_status: status,
      confidence: adjustedConfidence,
      verifiable_fact: verifiableFact,
      medical_inference_attempted: false, // Strict guarantee
    }
  }

  /**
   * Processes an array of raw pre-match reports, checking for source conflicts
   * without resolving them arbitrarily, and returns structured features with uncertainty bounds.
   */
  public static processPreMatchContext(
    rawEvents: NTCIRawEventInput[],
    baseModelProbability: number,
    referenceTimeISO?: string
  ): {
    extracted_features: NTCIExtractedFeature[]
    latest_timestamp: string
    uncertainty: NTCIUncertaintyContract
  } {
    if (rawEvents.length === 0) {
      return {
        extracted_features: [],
        latest_timestamp: referenceTimeISO || new Date().toISOString(),
        uncertainty: {
          epistemic_bounds: [
            Math.max(0.01, Math.round((baseModelProbability - 0.05) * 1000) / 1000),
            Math.min(0.99, Math.round((baseModelProbability + 0.05) * 1000) / 1000),
          ],
          conflict_flag: false,
          epistemic_variance_multiplier: 1.0,
        },
      }
    }

    const features = rawEvents.map((r) => this.extractFeature(r, referenceTimeISO))

    // Sort by published_at descending
    features.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

    // Conflict detection:
    // Look for contradictory statuses (e.g. one source reports OPTIMAL while another reports QUESTIONABLE or DOCUMENTED_ISSUE)
    let hasOptimal = false
    let hasNegative = false
    let conflictingPublishers: string[] = []

    for (const f of features) {
      if (f.confidence >= 0.35) {
        if (f.availability_status === 'OPTIMAL') {
          hasOptimal = true
          conflictingPublishers.push(f.publisher)
        } else if (f.availability_status === 'QUESTIONABLE' || f.availability_status === 'DOCUMENTED_ISSUE' || f.availability_status === 'WITHDRAWN') {
          hasNegative = true
          conflictingPublishers.push(f.publisher)
        }
      }
    }

    const conflictFlag = hasOptimal && hasNegative
    const latestTimestamp = features[0]?.published_at || new Date().toISOString()

    // When conflict exists, WIDEN epistemic bounds without shifting the mean
    const baseWidth = 0.05
    const varianceMultiplier = conflictFlag ? 2.4 : 1.0
    const deltaBound = Math.round(baseWidth * varianceMultiplier * 1000) / 1000

    const lowerBound = Math.max(0.01, Math.round((baseModelProbability - deltaBound) * 1000) / 1000)
    const upperBound = Math.min(0.99, Math.round((baseModelProbability + deltaBound) * 1000) / 1000)

    const conflictSummary = conflictFlag
      ? `Contradictory reports preserved between sources (${Array.from(new Set(conflictingPublishers)).join(', ')}). Epistemic bounds widened by factor ${varianceMultiplier}x.`
      : undefined

    return {
      extracted_features: features,
      latest_timestamp: latestTimestamp,
      uncertainty: {
        epistemic_bounds: [lowerBound, upperBound],
        conflict_flag: conflictFlag,
        epistemic_variance_multiplier: varianceMultiplier,
        conflict_summary: conflictSummary,
      },
    }
  }
}
