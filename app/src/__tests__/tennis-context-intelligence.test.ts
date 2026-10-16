/**
 * NEXUS TENNIS CONTEXT INTELLIGENCE (NTCI) — TEST SUITE
 * 
 * Verifies all 4 Phases and Non-Negotiable Constraints:
 * 1. Zero Medical Inference Protocol
 * 2. Read-Only Probability Invariant
 * 3. Conflict Preservation (conflict_flag = true, widened epistemic bounds)
 * 4. Zero Psychological Causality (Dynamic Empirical Bayes)
 * 5. Source Quality Tiers & Exponential Freshness Decay
 * 6. Pre-Match and In-Play API Contract Compliance
 */

import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  NTCISourceFreshnessEngine,
  NTCIPreMatchPipeline,
  NTCILiveEmpiricalBayesUpdater,
  NTCIService,
} from '../lib/tennis'
import type {
  NTCIRawEventInput,
  NTCIInPlayMatchState,
} from '../lib/tennis'

describe('NEXUS Tennis Context Intelligence (NTCI) — Suite Cuantitativa', () => {
  // ─── 1. CRITICAL CONSTRAINTS & NON-NEGOTIABLES ───
  describe('1. Directivas Críticas: Cero Inferencia Médica y Probabilidad Read-Only', () => {
    test('1.1. Zero Medical Inference: el extractor rechaza diagnósticos clínicos y garantiza medical_inference_attempted=false', () => {
      const rawEvent: NTCIRawEventInput = {
        publisher: 'PressConference Transcript',
        title: 'Player Q&A: Carlos Alcaraz',
        url: 'https://atptour.com/news/alcaraz-update',
        published_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        retrieved_at: new Date().toISOString(),
        player: 'Carlos Alcaraz',
        raw_text: 'Carlos had a trainer called for right forearm discomfort and finished with tape on arm.',
        topic: 'INJURY',
      }

      const feature = NTCIPreMatchPipeline.extractFeature(rawEvent)
      assert.strictEqual(feature.medical_inference_attempted, false, 'Debe garantizar cero inferencia médica')
      assert.strictEqual(feature.availability_status, 'DOCUMENTED_ISSUE')
      assert.ok(feature.verifiable_fact.includes('strapping') || feature.verifiable_fact.includes('intervention'))
      assert.strictEqual(feature.source_tier, 'OFFICIAL')
    })

    test('1.2. Read-Only Probability for NLP: El pipeline de noticias jamás muta la probabilidad numérica del modelo', () => {
      const baseProbability = 0.725
      const rawEvents: NTCIRawEventInput[] = [
        {
          publisher: 'BBC Sport',
          title: 'Sinner struggling with heavy schedule',
          url: 'https://bbcsport.com/tennis/sinner',
          published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          retrieved_at: new Date().toISOString(),
          player: 'Jannik Sinner',
          raw_text: 'Sinner expressed notable tiredness and fatigue after back-to-back 3-hour matches.',
          topic: 'FATIGUE',
        },
      ]

      const report = NTCIService.generatePreMatchReport({
        baseProbability,
        rawEvents,
      })

      // Invariante estricto: probability del modelo matemático no puede ser alterada
      assert.strictEqual(
        report.probability,
        baseProbability,
        'La probabilidad generada por el modelo debe permanecer inalterada por el módulo NLP'
      )
      assert.strictEqual(report.news_context.length, 1)
      assert.strictEqual(report.news_context[0].topic, 'FATIGUE')
    })

    test('1.3. Conflict Preservation: fuentes contradictorias activan conflict_flag y ensanchan la incertidumbre epistémica', () => {
      const baseProb = 0.650
      const now = Date.now()

      const conflictingEvents: NTCIRawEventInput[] = [
        {
          publisher: 'ATP Tour Official',
          title: 'Sinner confirms ready for finals',
          url: 'https://atptour.com/sinner-ready',
          published_at: new Date(now - 15 * 60 * 1000).toISOString(),
          retrieved_at: new Date().toISOString(),
          player: 'Jannik Sinner',
          raw_text: 'Jannik completed full intense practice and says feeling 100% cleared to play.',
          topic: 'CONTEXT',
        },
        {
          publisher: 'L\'Equipe',
          title: 'Doubt remains over Sinner hip',
          url: 'https://lequipe.fr/sinner-doubt',
          published_at: new Date(now - 20 * 60 * 1000).toISOString(),
          retrieved_at: new Date().toISOString(),
          player: 'Jannik Sinner',
          raw_text: 'Sources close to team indicate questionable physical condition and discomfort.',
          topic: 'INJURY',
        },
      ]

      const report = NTCIService.generatePreMatchReport({
        baseProbability: baseProb,
        rawEvents: conflictingEvents,
      })

      // El conflicto no debe ser promediado ni resuelto
      assert.strictEqual(report.uncertainty.conflict_flag, true, 'Debe activar conflict_flag')
      assert.ok(report.uncertainty.epistemic_variance_multiplier > 1.5, 'Debe ensanchar el multiplicador epistémico')

      const [lower, upper] = report.uncertainty.epistemic_bounds
      assert.ok(lower < baseProb - 0.08, 'El límite inferior debe ensancharse ante el conflicto')
      assert.ok(upper > baseProb + 0.08, 'El límite superior debe ensancharse ante el conflicto')
      assert.ok(report.uncertainty.conflict_summary?.includes('Contradictory reports preserved'))
    })
  })

  // ─── 2. PHASE 2: SOURCE QUALITY & FRESHNESS ENGINE ───
  describe('2. Phase 2: Source Quality Tiers & Exponential Freshness Decay', () => {
    test('2.1. Clasifica fuentes en OFFICIAL, REPUTABLE_MEDIA, SECONDARY y RUMOR con precisión', () => {
      assert.strictEqual(NTCISourceFreshnessEngine.classifySourceTier('ATP Tour', 'https://atptour.com/news/1'), 'OFFICIAL')
      assert.strictEqual(NTCISourceFreshnessEngine.classifySourceTier('BBC Sport', 'https://bbcsport.com/tennis'), 'REPUTABLE_MEDIA')
      assert.strictEqual(NTCISourceFreshnessEngine.classifySourceTier('Reuters News', 'https://reuters.com/sports'), 'REPUTABLE_MEDIA')
      assert.strictEqual(NTCISourceFreshnessEngine.classifySourceTier('Tennis Blogspot', 'https://tennis-insider.blogspot.com'), 'SECONDARY')
      assert.strictEqual(NTCISourceFreshnessEngine.classifySourceTier('X / Twitter Leak', 'https://x.com/tennisguru/status/123'), 'RUMOR')
    })

    test('2.2. Freshness Buckets (<1h, 1-6h, 6-24h, >24h) y Decaimiento Exponencial Continuo', () => {
      const now = new Date()

      // < 1h
      const t30min = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      const f30 = NTCISourceFreshnessEngine.computeFreshness(t30min, now.toISOString())
      assert.strictEqual(f30.bucket, '<1h')
      assert.ok(f30.decayWeight > 0.95, 'Peso menor a 1h debe ser >0.95')

      // 1-6h
      const t3h = new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
      const f3h = NTCISourceFreshnessEngine.computeFreshness(t3h, now.toISOString())
      assert.strictEqual(f3h.bucket, '1-6h')
      assert.ok(f3h.decayWeight > 0.80 && f3h.decayWeight < 0.90)

      // 6-24h
      const t12h = new Date(now.getTime() - 12 * 3600 * 1000).toISOString()
      const f12h = NTCISourceFreshnessEngine.computeFreshness(t12h, now.toISOString())
      assert.strictEqual(f12h.bucket, '6-24h')
      // Media vida de 12h: decayWeight ~ 0.50
      assert.ok(Math.abs(f12h.decayWeight - 0.50) < 0.05, `A 12h de half-life debe ser ~0.50 (obtenido ${f12h.decayWeight})`)

      // > 24h
      const t48h = new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
      const f48h = NTCISourceFreshnessEngine.computeFreshness(t48h, now.toISOString())
      assert.strictEqual(f48h.bucket, '>24h')
      assert.ok(f48h.decayWeight < 0.15)
    })
  })

  // ─── 3. PHASE 3: LIVE FORECAST & DYNAMIC EMPIRICAL BAYES ───
  describe('3. Phase 3: Live In-Play Empirical Bayes Updating (Zero Momentum)', () => {
    test('3.1. Actualiza posterior condicionado por puntos observados y estado del partido (sin psicología)', () => {
      const stateLeading: NTCIInPlayMatchState = {
        set_score: '1-0',
        game_score: '4-1',
        point_score: '40-15',
        server: 'p_sinner',
        receiver: 'p_alcaraz',
        current_set: 2,
        games_in_current_set: [4, 1],
        is_tiebreak: false,
      }

      const inPlayRes = NTCILiveEmpiricalBayesUpdater.updateInPlayForecast({
        pre_match_probability_a: 0.60,
        state: stateLeading,
        format: 'BestOf3',
        player_a_stats: {
          points_served: 28,
          points_served_won: 22, // 78.5% hold rate
          points_returned: 25,
          points_returned_won: 11,
          break_points_faced: 1,
          break_points_saved: 1,
        },
        player_b_stats: {
          points_served: 25,
          points_served_won: 14,
          points_returned: 28,
          points_returned_won: 6,
          break_points_faced: 4,
          break_points_saved: 2,
        },
        recent_points_sequence: ['S', 'S', 'R', 'S', 'S'],
      })

      // Con 1-0 en sets y 4-1 en games en Best of 3, la probabilidad posterior debe superar ampliamente 0.85
      assert.ok(inPlayRes.updated_probability > 0.85, `Posterior debe ser > 0.85 (obtenido ${inPlayRes.updated_probability})`)
      assert.ok(inPlayRes.model_update.delta > 0.20, 'Delta posterior vs prior debe ser positivo sustancial')
      assert.ok(inPlayRes.model_update.bayes_factor > 1.0)
      assert.strictEqual(inPlayRes.recent_evidence.points_evaluated, 5)
      assert.strictEqual(inPlayRes.recent_evidence.server_points_won, 4)
    })

    test('3.2. Degradación estructural del servicio se refleja probabilísticamente sin inventar momentum', () => {
      const stateTied: NTCIInPlayMatchState = {
        set_score: '1-1',
        game_score: '2-3',
        point_score: '15-40',
        server: 'p_sinner',
        receiver: 'p_alcaraz',
        current_set: 3,
        games_in_current_set: [2, 3],
        is_tiebreak: false,
      }

      // Jugador A sirviendo bajo de forma (fatiga real observable en números de servicio)
      const inPlayDegraded = NTCILiveEmpiricalBayesUpdater.updateInPlayForecast({
        pre_match_probability_a: 0.65, // Era favorito pre-partido
        state: stateTied,
        format: 'BestOf3',
        player_a_stats: {
          points_served: 40,
          points_served_won: 20, // Solo 50% de puntos al servicio
          points_returned: 38,
          points_returned_won: 12,
          break_points_faced: 7,
          break_points_saved: 3,
        },
        player_b_stats: {
          points_served: 38,
          points_served_won: 26,
          points_returned: 40,
          points_returned_won: 20,
          break_points_faced: 2,
          break_points_saved: 2,
        },
        recent_points_sequence: ['R', 'R', 'S', 'R'],
      })

      // Con servicio degradado y 15-40 abajo en set decisivo, la posterior debe contraerse por debajo de 0.50
      assert.ok(
        inPlayDegraded.updated_probability < 0.50,
        `Posterior debe reflejar la degradación numérica (obtenido ${inPlayDegraded.updated_probability})`
      )
      assert.ok(inPlayDegraded.model_update.delta < -0.15)
    })
  })

  // ─── 4. PHASE 4: API OUTPUT CONTRACTS CONFORMANCE ───
  describe('4. Phase 4: API Output Contracts Schemas', () => {
    test('4.1. Pre-Match Output Contract se ajusta estrictamente al JSON schema especificado', () => {
      const rawEvents: NTCIRawEventInput[] = [
        {
          publisher: 'Tennis Channel',
          title: 'Djokovic confirms late session',
          url: 'https://tennischannel.com/djokovic',
          published_at: '2026-10-03T12:00:00Z',
          retrieved_at: '2026-10-03T12:30:00Z',
          player: 'Novak Djokovic',
          raw_text: 'Djokovic requested night session due to schedule preference.',
          topic: 'SCHEDULE',
        },
      ]

      const out = NTCIService.generatePreMatchReport({
        baseProbability: 0.710,
        rawEvents,
        referenceTimeISO: '2026-10-03T13:00:00Z',
      })

      // Validar claves exactas del contrato
      assert.strictEqual(typeof out.probability, 'number')
      assert.ok(Array.isArray(out.news_context))
      assert.strictEqual(typeof out.data_freshness, 'string')
      assert.ok(Array.isArray(out.uncertainty.epistemic_bounds))
      assert.strictEqual(out.uncertainty.epistemic_bounds.length, 2)
      assert.strictEqual(typeof out.uncertainty.conflict_flag, 'boolean')
    })

    test('4.2. In-Play Output Contract se ajusta estrictamente al JSON schema especificado', () => {
      const state: NTCIInPlayMatchState = {
        set_score: '0-0',
        game_score: '2-1',
        point_score: '30-15',
        server: 'p_sinner',
        receiver: 'p_medvedev',
        current_set: 1,
        games_in_current_set: [2, 1],
        is_tiebreak: false,
      }

      const out = NTCIService.generateInPlayReport({
        pre_match_probability_a: 0.620,
        state,
        format: 'BestOf3',
        player_a_stats: {
          points_served: 12,
          points_served_won: 9,
          points_returned: 10,
          points_returned_won: 3,
          break_points_faced: 0,
          break_points_saved: 0,
        },
        player_b_stats: {
          points_served: 10,
          points_served_won: 7,
          points_returned: 12,
          points_returned_won: 3,
          break_points_faced: 1,
          break_points_saved: 1,
        },
        recent_points_sequence: ['S', 'R', 'S'],
      })

      // Validar claves exactas del contrato
      assert.strictEqual(typeof out.updated_probability, 'number')
      assert.ok(typeof out.state === 'object' && out.state !== null)
      assert.strictEqual(out.state.set_score, '0-0')
      assert.ok(typeof out.recent_evidence === 'object' && out.recent_evidence !== null)
      assert.strictEqual(typeof out.recent_evidence.points_evaluated, 'number')
      assert.ok(typeof out.model_update === 'object' && out.model_update !== null)
      assert.strictEqual(typeof out.model_update.prior_pre_match, 'number')
      assert.strictEqual(typeof out.model_update.current_posterior, 'number')
      assert.strictEqual(typeof out.model_update.delta, 'number')
    })
  })
})
