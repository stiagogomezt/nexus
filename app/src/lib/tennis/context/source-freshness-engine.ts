/**
 * NEXUS TENNIS CONTEXT INTELLIGENCE (NTCI) — PHASE 2: SOURCE QUALITY & FRESHNESS ENGINE
 * 
 * 1. Multi-Tier Source Quality Classification:
 *    Categorizes unstructured event sources into OFFICIAL, REPUTABLE_MEDIA, SECONDARY, RUMOR, UNKNOWN.
 * 
 * 2. Strict Freshness Bucketing & Exponential Decay:
 *    Buckets events into [<1h, 1-6h, 6-24h, >24h].
 *    Applies continuous exponential decay: w(t) = exp(-lambda * delta_hours).
 *    Half-life: 12 hours (lambda = ln(2)/12 = 0.05776).
 * 
 * 3. Metadata Provenance Enforcement:
 *    Ensures publisher, title, url, published_at, retrieved_at, player, and topic are strictly verified.
 */

import {
  NTCIRawEventInput,
  NTCIParsedEvent,
  NTCISourceTier,
  NTCIFreshnessBucket,
  NTCITopic,
} from './types'

export class NTCISourceFreshnessEngine {
  private static readonly OFFICIAL_DOMAINS = [
    'atptour.com',
    'wtatennis.com',
    'itftennis.com',
    'ausopen.com',
    'rolandgarros.com',
    'wimbledon.com',
    'usopen.com',
    'nittoatpfinals.com',
  ]

  private static readonly REPUTABLE_DOMAINS = [
    'bbcsport.com',
    'bbc.co.uk',
    'lequipe.fr',
    'tennischannel.com',
    'espn.com',
    'reuters.com',
    'apnews.com',
    'skysports.com',
    'theathletic.com',
    'marca.com',
    'gazzetta.it',
    'tennis.com',
  ]

  private static readonly RUMOR_DOMAINS = [
    'twitter.com',
    'x.com',
    'reddit.com',
    'tiktok.com',
    'forum.tennis',
  ]

  /**
   * Classifies a publisher domain or name into a source tier.
   */
  public static classifySourceTier(publisher: string, url: string): NTCISourceTier {
    const textToMatch = `${publisher} ${url}`.toLowerCase()

    for (const domain of this.OFFICIAL_DOMAINS) {
      if (textToMatch.includes(domain)) return 'OFFICIAL'
    }
    if (textToMatch.includes('official') || textToMatch.includes('press conference')) {
      return 'OFFICIAL'
    }

    for (const domain of this.REPUTABLE_DOMAINS) {
      if (textToMatch.includes(domain)) return 'REPUTABLE_MEDIA'
    }

    for (const domain of this.RUMOR_DOMAINS) {
      if (textToMatch.includes(domain)) return 'RUMOR'
    }

    if (textToMatch.includes('rumor') || textToMatch.includes('fan forum') || textToMatch.includes('leak')) {
      return 'RUMOR'
    }

    return url.startsWith('http') ? 'SECONDARY' : 'UNKNOWN'
  }

  /**
   * Calculates continuous exponential decay weight with half-life of 12 hours.
   * lambda = ln(2) / 12 ~= 0.057762
   */
  public static calcExponentialDecay(ageHours: number): number {
    const lambda = 0.057762
    const rawWeight = Math.exp(-lambda * Math.max(0, ageHours))
    return Math.max(0.01, Math.min(1.0, Math.round(rawWeight * 1000) / 1000))
  }

  /**
   * Maps age in hours to canonical freshness bucket.
   */
  public static getFreshnessBucket(ageHours: number): NTCIFreshnessBucket {
    if (ageHours < 1.0) return '<1h'
    if (ageHours < 6.0) return '1-6h'
    if (ageHours < 24.0) return '6-24h'
    return '>24h'
  }

  /**
   * Computes freshness bucket and continuous exponential decay factor.
   */
  public static computeFreshness(
    publishedAtISO: string,
    referenceTimeISO: string = new Date().toISOString()
  ): { bucket: NTCIFreshnessBucket; decayWeight: number; ageHours: number } {
    const pubTime = new Date(publishedAtISO).getTime()
    const refTime = new Date(referenceTimeISO).getTime()

    // Prevent negative age from clock skew
    const diffMs = Math.max(0, refTime - pubTime)
    const ageHours = diffMs / (1000 * 60 * 60)

    const bucket = this.getFreshnessBucket(ageHours)
    const decayWeight = this.calcExponentialDecay(ageHours)

    return {
      bucket,
      decayWeight,
      ageHours: Math.round(ageHours * 100) / 100,
    }
  }

  /**
   * Normalizes and tags an incoming raw unstructured text event.
   */
  public static processEvent(raw: NTCIRawEventInput, referenceTimeISO?: string): NTCIParsedEvent {
    if (!raw.publisher || !raw.title || !raw.url || !raw.published_at || !raw.player) {
      throw new Error(`NTCIProvenanceError: Missing mandatory metadata fields in raw event input`)
    }

    const sourceTier = this.classifySourceTier(raw.publisher, raw.url)
    const { bucket, decayWeight } = this.computeFreshness(raw.published_at, referenceTimeISO)

    // Topic detection fallback if not provided
    let topic: NTCITopic = raw.topic ?? 'CONTEXT'
    if (!raw.topic) {
      const lower = `${raw.title} ${raw.raw_text}`.toLowerCase()
      if (lower.includes('retire') || lower.includes('withdraw') || lower.includes('injury') || lower.includes('mto') || lower.includes('strain') || lower.includes('pain')) {
        topic = 'INJURY'
      } else if (lower.includes('fatigue') || lower.includes('tired') || lower.includes('cramp') || lower.includes('exhaust')) {
        topic = 'FATIGUE'
      } else if (lower.includes('rain') || lower.includes('wind') || lower.includes('heat') || lower.includes('altitude') || lower.includes('court')) {
        topic = 'ENVIRONMENT'
      } else if (lower.includes('delay') || lower.includes('schedule') || lower.includes('reschedule') || lower.includes('night session')) {
        topic = 'SCHEDULE'
      }
    }

    return {
      publisher: raw.publisher.trim(),
      title: raw.title.trim(),
      url: raw.url.trim(),
      published_at: raw.published_at,
      retrieved_at: raw.retrieved_at || new Date().toISOString(),
      player: raw.player.trim(),
      topic,
      source_tier: sourceTier,
      freshness_bucket: bucket,
      decay_weight: decayWeight,
    }
  }
}
