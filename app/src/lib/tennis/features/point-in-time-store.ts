/**
 * NEXUS TENNIS PREDICTIVE LAB (NTPL) — PHASE 2: POINT-IN-TIME FEATURE STORE
 * 
 * Strict temporal feature store enforcing zero data leakage.
 * All feature formulas are explicitly versioned and partitioned by entity_id, feature_group, and as_of_timestamp.
 */

import { TennisSurface, TennisTour } from '../types'

export type FeatureGroup = 'BASELINE_RATING' | 'FATIGUE_EWMA' | 'CONTEXTUAL_SURFACE' | 'MARKET_SHIN'

export interface MaterializedFeature {
  id: string
  entity_id: string // Player slug or match fingerprint
  feature_group: FeatureGroup
  feature_name: string
  feature_version: string
  as_of_timestamp: string // ISO timestamp
  feature_value: number
  metadata?: Record<string, unknown>
}

export interface PlayerFeatureSnapshot {
  entity_id: string
  as_of_timestamp: string
  // Baseline ratings
  glicko2_rating: number
  glicko2_rd: number
  elo_surface: number
  
  // Fatigue EWMA
  ewma_workload_7d: number
  days_rest: number
  
  // Contextual surface & environment
  empirical_cpi: number
  altitude_m: number
  
  // Market Shin if available at as_of
  shin_implied_prob?: number
  shin_insider_z?: number
}

export class StrictPointInTimeFeatureStore {
  private records: MaterializedFeature[] = []

  constructor(initialRecords: MaterializedFeature[] = []) {
    this.records = [...initialRecords]
  }

  /**
   * Append new feature observations into the immutable store.
   */
  public recordFeature(feature: Omit<MaterializedFeature, 'id'>): MaterializedFeature {
    const id = `feat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const record: MaterializedFeature = { ...feature, id }
    this.records.push(record)
    return record
  }

  /**
   * Batch append features.
   */
  public recordFeaturesBatch(features: Array<Omit<MaterializedFeature, 'id'>>): void {
    for (const f of features) {
      this.recordFeature(f)
    }
  }

  /**
   * Strict Last Observation Carried Forward (LOCF) for a specific feature before cutoff timestamp.
   * Absolute mathematical ban on data leakage (as_of_timestamp < cutoffTimestamp).
   */
  public getFeatureLOCF(
    entityId: string,
    featureName: string,
    featureVersion: string,
    cutoffTimestamp: string
  ): MaterializedFeature | null {
    const cutoffMs = new Date(cutoffTimestamp).getTime()

    const eligible = this.records.filter(
      (r) =>
        r.entity_id === entityId &&
        r.feature_name === featureName &&
        r.feature_version === featureVersion &&
        new Date(r.as_of_timestamp).getTime() < cutoffMs
    )

    if (eligible.length === 0) return null

    // Sort descending to get the most recent observation strictly before cutoff
    eligible.sort(
      (a, b) => new Date(b.as_of_timestamp).getTime() - new Date(a.as_of_timestamp).getTime()
    )

    return eligible[0]
  }

  /**
   * Assembles a point-in-time PlayerFeatureSnapshot at cutoff T_match.
   * Degrades gracefully to default priors if certain features have not yet been observed.
   */
  public getPlayerSnapshotAt(
    playerSlug: string,
    surface: TennisSurface,
    cutoffTimestamp: string,
    defaultPriorRating: number = 1500,
    defaultPriorRD: number = 350
  ): PlayerFeatureSnapshot {
    // 1. Baseline Ratings
    const glicko = this.getFeatureLOCF(playerSlug, 'glicko2_rating', 'v1_glicko_global', cutoffTimestamp)
    const glickoRd = this.getFeatureLOCF(playerSlug, 'glicko2_rd', 'v1_glicko_global', cutoffTimestamp)
    const eloSurf = this.getFeatureLOCF(playerSlug, `elo_${surface.toLowerCase()}`, 'v1_elo_surface', cutoffTimestamp)

    // 2. Fatigue EWMA
    const ewma = this.getFeatureLOCF(playerSlug, 'ewma_workload_7d', 'v1_ewma_workload', cutoffTimestamp)
    const rest = this.getFeatureLOCF(playerSlug, 'days_rest', 'v1_rest_tracker', cutoffTimestamp)

    // 3. Contextual Surface
    const cpi = this.getFeatureLOCF(`tourney_${surface.toLowerCase()}`, 'empirical_cpi', 'v1_surface_speed', cutoffTimestamp)
    const alt = this.getFeatureLOCF(playerSlug, 'altitude_meters', 'v1_venue_context', cutoffTimestamp)

    // 4. Market Shin
    const shinProb = this.getFeatureLOCF(playerSlug, 'shin_implied_prob', 'v1_shin_odds', cutoffTimestamp)
    const shinZ = this.getFeatureLOCF(playerSlug, 'shin_insider_z', 'v1_shin_odds', cutoffTimestamp)

    return {
      entity_id: playerSlug,
      as_of_timestamp: cutoffTimestamp,
      glicko2_rating: glicko ? glicko.feature_value : defaultPriorRating,
      glicko2_rd: glickoRd ? glickoRd.feature_value : defaultPriorRD,
      elo_surface: eloSurf ? eloSurf.feature_value : defaultPriorRating,
      ewma_workload_7d: ewma ? ewma.feature_value : 0,
      days_rest: rest ? rest.feature_value : 14,
      empirical_cpi: cpi ? cpi.feature_value : 35.0,
      altitude_m: alt ? alt.feature_value : 0,
      shin_implied_prob: shinProb ? shinProb.feature_value : undefined,
      shin_insider_z: shinZ ? shinZ.feature_value : undefined,
    }
  }

  public getTotalRecordsCount(): number {
    return this.records.length
  }
}
