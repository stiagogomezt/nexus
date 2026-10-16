/**
 * NEXUS TENNIS CONTEXT INTELLIGENCE (NTCI) — DOMAIN TYPES & SCHEMAS
 * 
 * Strict contracts for NLP feature extraction, source evaluation,
 * conflict preservation, and dynamic in-play Empirical Bayes forecasting.
 */

export type NTCIAvailabilityStatus =
  | 'OPTIMAL'
  | 'QUESTIONABLE'
  | 'DOCUMENTED_ISSUE'
  | 'WITHDRAWN'
  | 'UNKNOWN'

export type NTCITopic =
  | 'INJURY'
  | 'FATIGUE'
  | 'ENVIRONMENT'
  | 'SCHEDULE'
  | 'CONTEXT'

export type NTCISourceTier =
  | 'OFFICIAL'          // ATPTour.com, WTATennis.com, Grand Slam tournaments, official press releases
  | 'REPUTABLE_MEDIA'   // BBC Sport, L'Equipe, Tennis Channel, ESPN, Reuters
  | 'SECONDARY'         // Regional sports portals, syndicated blogs
  | 'RUMOR'             // Social media unverified leaks, forum commentary
  | 'UNKNOWN'

export type NTCIFreshnessBucket =
  | '<1h'
  | '1-6h'
  | '6-24h'
  | '>24h'

export interface NTCIRawEventInput {
  publisher: string
  title: string
  url: string
  published_at: string   // ISO 8601
  retrieved_at: string   // ISO 8601
  player: string         // Player ID or canonical name
  raw_text: string
  topic?: NTCITopic
}

export interface NTCIParsedEvent {
  publisher: string
  title: string
  url: string
  published_at: string
  retrieved_at: string
  player: string
  topic: NTCITopic
  source_tier: NTCISourceTier
  freshness_bucket: NTCIFreshnessBucket
  decay_weight: number   // Exponential decay factor in (0.0, 1.0]
}

export interface NTCIExtractedFeature extends NTCIParsedEvent {
  availability_status: NTCIAvailabilityStatus
  confidence: number     // Float [0.0 - 1.0]
  verifiable_fact: string
  medical_inference_attempted: false // Strict governance guarantee
}

export interface NTCIUncertaintyContract {
  epistemic_bounds: [number, number] // [Lower, Upper] Credible bounds
  conflict_flag: boolean             // True if contradictory reports preserved
  epistemic_variance_multiplier: number
  conflict_summary?: string
}

export interface NTCIPreMatchOutput {
  probability: number                // Float (Model generated calibrated win prob)
  news_context: NTCIExtractedFeature[]
  data_freshness: string             // Timestamp of most recent critical feature
  uncertainty: NTCIUncertaintyContract
}

export interface NTCIInPlayMatchState {
  set_score: string                  // e.g. "1-0" or "0-0"
  game_score: string                 // e.g. "4-3"
  point_score: string                // e.g. "40-30", "AD-40", "15-15"
  server: string                     // Player ID
  receiver: string                   // Player ID
  current_set: number                // 1, 2, 3, 4, 5
  games_in_current_set: [number, number]
  is_tiebreak: boolean
}

export interface NTCIRecentEvidence {
  points_evaluated: number
  server_points_won: number
  receiver_points_won: number
  service_hold_rate_observed: number
  break_points_faced: number
  break_points_saved: number
  last_n_points_sequence: ('S' | 'R')[] // S: Server won, R: Receiver won
}

export interface NTCIInPlayOutput {
  updated_probability: number        // Float (Empirical Bayes Posterior)
  state: NTCIInPlayMatchState
  recent_evidence: NTCIRecentEvidence
  model_update: {
    prior_pre_match: number
    current_posterior: number
    delta: number                    // Posterior - Prior
    bayes_factor: number
  }
}
