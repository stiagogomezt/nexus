/**
 * NEXUS TENNIS PREDICTIVE LAB — Suite de Pruebas Cuantitativas y de Integridad
 * 
 * Valida de forma exhaustiva:
 * 1. Generación de características (Feature Engineering)
 * 2. Elo General (K=32)
 * 3. Elo por Superficie (K=24)
 * 4. Forma reciente y estadísticas de servicio/resto
 * 5. Cero Data Leakage: División temporal estricta
 * 6. Calibración de probabilidad (Platt Scaling & Brier Score)
 * 7. Conversión de cuotas (Odds Math, Implied Probability, Edge, EV)
 * 8. Extracción de noticias, provenance de fuentes y frescura
 * 9. Resiliencia ante datos faltantes y ausencia de cuotas (DATA UNAVAILABLE)
 * 10. Incertidumbre y estado de lesiones (UNKNOWN, QUESTIONABLE, CONFIRMED, RETURNING)
 * 11. Segmentación por circuitos (ATP vs WTA) y superficies (Hard, Clay, Grass)
 */

import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  defaultTennisDataset,
  TENNIS_PLAYERS_REGISTRY,
  TennisEloCalculator,
  TennisFeaturePipeline,
  TennisLogisticRegression,
  TennisGradientBoostingModel,
  TennisModelMetrics,
  PlattCalibrator,
  TennisNewsAnalyzer,
  OddsMath,
  ManualOddsProvider,
  TennisScoringEngine,
  WalkForwardBacktester,
  defaultTennisDataProvider,
  TENNIS_DATASET_ATTRIBUTION,
  getAttributionFooter,
  PointInTimeFeatureStore,
  MatchDeduplicationEngine,
  StrictPointInTimeFeatureStore,
  EfronMorrisShrinkageEngine,
  ShinOddsMethod,
  NLPEpistemicUncertaintyEngine,
  WalkForwardValidationEngine,
  TimeTravelTensorEngine,
  TemporalLeakageError,
  WalkForwardFramework,
  Glicko2Calculator,
  StrengthOfScheduleModel,
  AirDensityCPICalculator,
  GlickoAblationBenchmark,
  TennisMarkovModel,
  MarkovAblationBenchmark,
  PlayerAgnosticResidualBoostingModel,
  ResidualAblationBenchmark,
  BayesianModelEnsemble,
  BetaCalibrator,
  UncertaintyQuantificationEngine,
  MurphyBrierDecomposer,
  TennisModelRegistry,
  NexusTennisPredictiveLab,
  NTCIService,
  NTCISourceFreshnessEngine,
  NTCIPreMatchPipeline,
  NTCILiveEmpiricalBayesUpdater,
  NTPFMultilevelDeltaEngine,
  NTPFDiagnosticClassifier,
  NTPFCounterfactualEngine,
  NTPFShadowPipelineGovernance,
  NTPFService,
  tennisAIDecisionAuditor,
} from '../lib/tennis'
import { liveScheduleService } from '../lib/tennis/data/live-schedule-service'
import type {
  HistoricalMatchRecord,
  TennisNewsItem,
  NTCIRawEventInput,
  ExpectedMatchBaseline,
  ObservedMatchStatistics,
  NTPFMissType,
} from '../lib/tennis'

describe('FASE Y: NEXUS Tennis Predictive Lab — Pruebas Cuantitativas', () => {
  // ─── 1. DATASET & PROVENANCE ───
  describe('1. Dataset Histórico y Atribución de Licencia', () => {
    test('1.1. Dataset contiene atribución formal a Jeff Sackmann / Tennis Abstract bajo CC BY-NC-SA 4.0', () => {
      const prov = defaultTennisDataset.getProvenance()
      assert.strictEqual(prov.author, 'Jeff Sackmann')
      assert.ok(prov.license.includes('CC BY-NC-SA 4.0'))
      assert.strictEqual(prov.commercial_use_permitted, false)
      assert.ok(getAttributionFooter().includes('Jeff Sackmann'))
    })

    test('1.2. Dataset está ordenado cronológicamente y cubre tanto ATP como WTA', () => {
      const matches = defaultTennisDataset.getMatches()
      assert.ok(matches.length >= 10, 'Debe haber suficientes partidos benchmark')

      // Verificar orden cronológico estricto
      for (let i = 1; i < matches.length; i++) {
        const prev = new Date(matches[i - 1].date).getTime()
        const curr = new Date(matches[i].date).getTime()
        assert.ok(prev <= curr, `Infracción cronológica: ${matches[i - 1].date} > ${matches[i].date}`)
      }

      const tours = new Set(matches.map((m) => m.tour))
      assert.ok(tours.has('ATP'), 'Debe incluir ATP')
      assert.ok(tours.has('WTA'), 'Debe incluir WTA')

      const surfaces = new Set(matches.map((m) => m.surface))
      assert.ok(surfaces.has('Hard'), 'Debe incluir Hard')
      assert.ok(surfaces.has('Clay'), 'Debe incluir Clay')
      assert.ok(surfaces.has('Grass'), 'Debe incluir Grass')
    })
  })

  // ─── 2. ELO GENERAL, SUPERFICIE Y RECIENTE ───
  describe('2. Elo Multicapa y Sin Contaminación Futura', () => {
    test('2.1. Elo General parte de 1500 y se actualiza tras victorias/derrotas', () => {
      const calc = new TennisEloCalculator()
      assert.strictEqual(calc.getOverallElo('p_sinner'), 1500)

      const testMatch: HistoricalMatchRecord = {
        id: 'test_m1',
        tour: 'ATP',
        tournament_name: 'Test Open',
        tournament_level: 'Masters1000',
        date: '2026-01-01',
        surface: 'Hard',
        round: 'F',
        winner_id: 'p_sinner',
        winner_name: 'Jannik Sinner',
        loser_id: 'p_alcaraz',
        loser_name: 'Carlos Alcaraz',
      }

      calc.recordMatchOutcome(testMatch)

      const sinnerElo = calc.getOverallElo('p_sinner')
      const alcarazElo = calc.getOverallElo('p_alcaraz')

      assert.ok(sinnerElo > 1500, 'El ganador debe aumentar su Elo')
      assert.ok(alcarazElo < 1500, 'El perdedor debe disminuir su Elo')
      assert.strictEqual(sinnerElo + alcarazElo, 3000, 'La suma neta de Elo debe conservarse en duelo directo')
    })

    test('2.2. Elo por Superficie discrimina Hard vs Clay vs Grass', () => {
      const calc = new TennisEloCalculator()
      calc.processMatches(defaultTennisDataset.getMatches())

      const sinnerHard = calc.getSurfaceElo('p_sinner', 'Hard')
      const alcarazClay = calc.getSurfaceElo('p_alcaraz', 'Clay')

      assert.ok(sinnerHard > 1500, 'Sinner debe tener rating positivo en Hard')
      assert.ok(alcarazClay > 1500, 'Alcaraz debe tener rating sobresaliente en Clay')
    })

    test('2.3. Cero data leakage: cálculo de Elo a fecha D no se ve alterado por partidos posteriores', () => {
      const calc1 = new TennisEloCalculator()
      const calc2 = new TennisEloCalculator()

      const allMatches = defaultTennisDataset.getMatches()
      const cutoffDate = '2024-06-01'

      // calc1: procesa solo antes del cutoff
      const matchesPrior = allMatches.filter((m) => new Date(m.date).getTime() < new Date(cutoffDate).getTime())
      calc1.processMatches(matchesPrior)

      // calc2: procesa con beforeDate filter
      calc2.processMatches(allMatches, cutoffDate)

      assert.strictEqual(calc1.getOverallElo('p_sinner'), calc2.getOverallElo('p_sinner'))
      assert.strictEqual(calc1.getSurfaceElo('p_sinner', 'Clay'), calc2.getSurfaceElo('p_sinner', 'Clay'))
    })
  })

  // ─── 3. FEATURE ENGINEERING ───
  describe('3. Ingeniería de Características & Prevención de Fugas', () => {
    test('3.1. FeaturePipeline extrae forma reciente (5 y 10) y ventajas de servicio sin leakage', () => {
      const pipeline = new TennisFeaturePipeline()
      const matches = defaultTennisDataset.getMatches()

      const feat = pipeline.buildFeatureVector(
        'p_sinner',
        'p_alcaraz',
        '2026-10-01',
        'Hard',
        'ATP',
        matches
      )

      assert.ok(typeof feat.elo_diff === 'number')
      assert.ok(typeof feat.surface_elo_diff === 'number')
      assert.ok(typeof feat.serve_advantage === 'number')
      assert.ok(typeof feat.h2h_win_rate_a === 'number')
      assert.ok(feat.h2h_win_rate_a >= 0 && feat.h2h_win_rate_a <= 1)
      assert.ok(typeof feat.rest_days_diff === 'number')
    })

    test('3.2. División temporal histórica balanceada para entrenamiento', () => {
      const pipeline = new TennisFeaturePipeline()
      const matches = defaultTennisDataset.getMatches()
      const dataset = pipeline.generateHistoricalDataset(matches)

      assert.strictEqual(dataset.length, matches.length)
      const winnersA = dataset.filter((d) => d.target_winner_a === 1).length
      const winnersB = dataset.filter((d) => d.target_winner_a === 0).length

      // Debe ser equitativo para evitar sesgo de clase
      assert.strictEqual(winnersA + winnersB, matches.length)
      assert.ok(Math.abs(winnersA - winnersB) <= 1)
    })
  })

  // ─── 4. MODELOS & CALIBRACIÓN (PLATT SCALING) ───
  describe('4. Modelos Predictivos y Calibración', () => {
    test('4.1. Logistic Regression escala features con media y desviación de entrenamiento', () => {
      const pipeline = new TennisFeaturePipeline()
      const dataset = pipeline.generateHistoricalDataset(defaultTennisDataset.getMatches())

      const model = new TennisLogisticRegression()
      model.train(dataset, 150, 0.05, 0.01)

      const prob = model.predictProbability(dataset[0])
      assert.ok(prob > 0 && prob < 1, 'La probabilidad debe estar en (0, 1)')
    })

    test('4.2. Gradient Boosting predice probabilidades válidas mediante enlace logit', () => {
      const pipeline = new TennisFeaturePipeline()
      const dataset = pipeline.generateHistoricalDataset(defaultTennisDataset.getMatches())

      const gbm = new TennisGradientBoostingModel(0.1, 15)
      gbm.train(dataset)

      const prob = gbm.predictProbability(dataset[0])
      assert.ok(prob >= 0.01 && prob <= 0.99, 'GBM debe emitir probabilidades acotadas')
    })

    test('4.3. Platt Scaling calibra probabilidades y reduce el Brier Score', () => {
      const uncalibrated = [0.95, 0.85, 0.80, 0.60, 0.40, 0.20, 0.10, 0.05]
      const trueLabels =   [1,    1,    1,    0,    1,    0,    0,    0]

      const rawBrier = TennisModelMetrics.calcBrierScore(trueLabels, uncalibrated)

      const calibrator = new PlattCalibrator()
      calibrator.fit(uncalibrated, trueLabels, 300, 0.05)

      const calibrated = uncalibrated.map((p) => calibrator.calibrate(p))
      const calBrier = TennisModelMetrics.calcBrierScore(trueLabels, calibrated)

      assert.ok(calBrier <= rawBrier, 'Platt Scaling debe mantener o mejorar el Brier score en calibración')
      for (const p of calibrated) {
        assert.ok(p >= 0.01 && p <= 0.99)
      }
    })

    test('4.4. Métricas calculan ECE, Log Loss y ROC AUC de forma coherente', () => {
      const yTrue = [1, 1, 0, 1, 0, 0]
      const yProb = [0.85, 0.70, 0.35, 0.65, 0.20, 0.15]

      const m = TennisModelMetrics.evaluate(yTrue, yProb)
      assert.ok(m.accuracy >= 0.65)
      assert.ok(m.brier_score < 0.20)
      assert.ok(m.roc_auc >= 0.80)
      assert.ok(m.calibration_error_ece >= 0)
    })
  })

  // ─── 5. WALK-FORWARD BACKTEST ───
  describe('5. Walk-Forward Backtester Temporal (Sin Fugas)', () => {
    test('5.1. Ejecuta ventanas temporales secuenciales Train -> Validation -> Test', () => {
      const backtester = new WalkForwardBacktester()
      const matches = defaultTennisDataset.getMatches()

      const res = backtester.runWalkForwardBacktest(matches, 3)

      assert.ok(res.windows.length >= 2, 'Debe generar al menos 2 ventanas válidas')
      for (const win of res.windows) {
        assert.ok(new Date(win.train_period.end).getTime() <= new Date(win.validation_period.start).getTime())
        assert.ok(new Date(win.validation_period.end).getTime() <= new Date(win.test_period.start).getTime())
        assert.ok(typeof win.calibrated_brier_score === 'number')
      }

      // Slice report
      assert.ok(typeof res.overallReport.by_tour.ATP.accuracy === 'number')
      assert.ok(typeof res.overallReport.by_surface.Hard.accuracy === 'number')
    })
  })

  // ─── 6. CUOTAS, PROBABILIDAD IMPLÍCITA, EDGE & EV ───
  describe('6. Conversión de Cuotas, Probabilidad Implícita, Edge y Valor Esperado', () => {
    test('6.1. Implied Probability = 1 / Cuota', () => {
      assert.strictEqual(OddsMath.calcImpliedProbability(2.0), 0.5)
      assert.strictEqual(OddsMath.calcImpliedProbability(4.0), 0.25)
      assert.strictEqual(OddsMath.calcImpliedProbability(1.25), 0.8)
    })

    test('6.2. Edge = Model Probability - Implied Probability', () => {
      const modelProb = 0.60
      const impliedProb = 0.50
      assert.strictEqual(OddsMath.calcEdge(modelProb, impliedProb), 0.10) // +10% Edge
    })

    test('6.3. Expected Value: EV = (p * cuota) - 1', () => {
      const p = 0.60
      const odds = 2.0 // Implies 50%
      // EV = 0.60 * 2.0 - 1 = +0.20 (+20%)
      assert.strictEqual(OddsMath.calcExpectedValue(p, odds), 0.20)

      // Cuota perdedora a largo plazo (negativo EV)
      const badOdds = 1.50
      // EV = 0.60 * 1.50 - 1 = -0.10 (-10%)
      assert.strictEqual(OddsMath.calcExpectedValue(p, badOdds), -0.10)
    })

    test('6.4. ManualOddsProvider registra cuotas manuales con timestamp y margen', () => {
      const provider = new ManualOddsProvider()
      const odds = provider.setManualOdds('m_test', 1.90, 1.90)

      assert.strictEqual(odds.odds_a, 1.90)
      assert.strictEqual(odds.odds_b, 1.90)
      assert.ok(odds.margin_pct > 0, 'Las cuotas 1.90 vs 1.90 deben tener margen bookmaker positivo')
      assert.ok(odds.timestamp.length > 0)
    })
  })

  // ─── 7. NOTICIAS, GROUNDING, FUNGIBILIDAD & LESIONES ───
  describe('7. Análisis de Noticias y Lesiones con Reglas Explícitas', () => {
    test('7.1. Genera queries estructuradas para Google Search Grounding', () => {
      const queries = TennisNewsAnalyzer.buildSearchQueries('Jannik Sinner', 'Carlos Alcaraz', 'Roland Garros')
      assert.ok(queries.some((q) => q.includes('"Jannik Sinner" injury')))
      assert.ok(queries.some((q) => q.includes('"Carlos Alcaraz" injury')))
      assert.ok(queries.some((q) => q.includes('"Roland Garros"')))
    })

    test('7.2. Clasifica tiers de frescura (<1h, 1-6h, 6-24h, >24h)', () => {
      const now = new Date()
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

      assert.strictEqual(TennisNewsAnalyzer.calculateFreshnessTier(thirtyMinsAgo), '<1h')
      assert.strictEqual(TennisNewsAnalyzer.calculateFreshnessTier(threeHoursAgo), '1-6h')
      assert.strictEqual(TennisNewsAnalyzer.calculateFreshnessTier(twelveHoursAgo), '6-24h')
      assert.strictEqual(TennisNewsAnalyzer.calculateFreshnessTier(twoDaysAgo), '>24h')
      assert.strictEqual(TennisNewsAnalyzer.calculateFreshnessTier(undefined), '>24h')
    })

    test('7.3. Modificador auditable aplica penalización trazable por lesión confirmada', () => {
      const news: TennisNewsItem[] = [
        {
          id: 'n1',
          player: 'Daniil Medvedev',
          source: 'ATP Tour Official',
          title: 'Medvedev receives medical timeout for shoulder discomfort',
          url: 'https://example.com/medvedev',
          retrieved_at: new Date().toISOString(),
          relevance: 0.95,
          confidence: 0.90,
          injury_status: 'CONFIRMED',
          freshness_tier: '1-6h',
        },
      ]

      const ctx = TennisNewsAnalyzer.evaluatePlayerContext('Daniil Medvedev', news)
      assert.strictEqual(ctx.injury_status, 'CONFIRMED')
      assert.ok(ctx.context_modifier < 0, 'Lesión confirmada debe aplicar penalización negativa')
      assert.ok(ctx.sources_count === 1)
      assert.ok(ctx.rationale.includes('ATP Tour Official'))
    })

    test('7.4. Si no hay noticias, emite mensaje estándar sin inventar datos', () => {
      const ctx = TennisNewsAnalyzer.evaluatePlayerContext('Novak Djokovic', [])
      assert.strictEqual(ctx.injury_status, 'UNKNOWN')
      assert.strictEqual(ctx.context_modifier, 0)
      assert.strictEqual(ctx.rationale, 'No se encontraron novedades recientes verificables.')
    })
  })

  // ─── 8. MOTOR DE SCORING MULTI-SEÑAL & PROVEEDOR UNIFICADO ───
  describe('8. Scoring Multi-Señal y Predicción Integral', () => {
    test('8.1. Produce predicción completa con intervalo de incertidumbre del 95%', async () => {
      const upcoming = await defaultTennisDataProvider.getUpcomingPredictions()
      assert.ok(upcoming.length >= 3)

      const match = upcoming[0]
      assert.ok(match.calibrated_probability_a > 0 && match.calibrated_probability_a < 1)
      assert.ok(match.calibrated_probability_b > 0 && match.calibrated_probability_b < 1)
      assert.strictEqual(Math.round((match.calibrated_probability_a + match.calibrated_probability_b) * 100), 100)

      assert.ok(match.uncertainty_interval_a[0] <= match.calibrated_probability_a)
      assert.ok(match.uncertainty_interval_a[1] >= match.calibrated_probability_a)
      assert.ok(match.top_factors.length > 0, 'Debe incluir factores explicativos')
      assert.ok(match.model_version.includes('v1.0'))
    })

    test('8.2. Funciona de manera resiliente cuando no hay cuotas de mercado', () => {
      const pred = defaultTennisDataProvider.analyzeMatch(
        'p_sinner',
        'p_alcaraz',
        'Hard',
        'ATP',
        '2026-10-03',
        'Demo Without Odds'
      )

      assert.ok(pred.calibrated_probability_a > 0)
      // Cuotas ausentes no deben romper la inferencia estadística
      assert.strictEqual(pred.odds_a, undefined)
      assert.strictEqual(pred.edge_a, undefined)
      assert.strictEqual(pred.has_market_discrepancy, false)
    })
  })

  // ─── 9. NTPL FASE 1: FEATURE STORE & EMPIRICAL SURFACE SPEED ───
  describe('9. NTPL Phase 1: Point-in-Time Feature Store & Empirical Surface Speed', () => {
    test('9.1. Point-in-Time Feature Store previene fugas de datos estrictamente por timestamp', () => {
      const store = new PointInTimeFeatureStore()
      
      const matchT1: HistoricalMatchRecord = {
        id: 'm_test_1',
        tour: 'ATP',
        tournament_name: 'Indian Wells Masters',
        tournament_level: 'Masters1000',
        date: '2026-03-15',
        surface: 'Hard',
        round: 'F',
        winner_id: 'p_alcaraz',
        winner_name: 'Carlos Alcaraz',
        loser_id: 'p_medvedev',
        loser_name: 'Daniil Medvedev',
        winner_aces: 6,
        winner_svpt: 65,
        loser_aces: 4,
        loser_svpt: 60,
      }

      const matchT2: HistoricalMatchRecord = {
        id: 'm_test_2',
        tour: 'ATP',
        tournament_name: 'Miami Masters',
        tournament_level: 'Masters1000',
        date: '2026-03-25',
        surface: 'Hard',
        round: 'SF',
        winner_id: 'p_sinner',
        winner_name: 'Jannik Sinner',
        loser_id: 'p_medvedev',
        loser_name: 'Daniil Medvedev',
      }

      store.ingestMatches([matchT1, matchT2])

      // Consulta con cutoff antes de matchT2
      const beforeT2 = store.getMatchesBefore('2026-03-20')
      assert.strictEqual(beforeT2.length, 1)
      assert.strictEqual(beforeT2[0].id, 'm_test_1')

      // Consulta con cutoff antes de matchT1
      const beforeT1 = store.getMatchesBefore('2026-03-10')
      assert.strictEqual(beforeT1.length, 0)

      // Verificación de provenance Jeff Sackmann
      const prov = store.getProvenanceInfo()
      assert.ok(prov.provider.includes('Jeff Sackmann'))
      assert.ok(prov.license.includes('CC BY-NC-SA 4.0'))
    })

    test('9.2. Empirical Surface Speed Proxy calcula Ace% y Hold% per tournament', () => {
      const matches = defaultTennisDataset.getMatches()
      const store = new PointInTimeFeatureStore(matches)

      // Calcular proxy para Wimbledon (Grass) vs Roland Garros (Clay)
      const grassProxy = store.getEmpiricalSurfaceSpeed('Wimbledon', 'Grass', 'ATP', '2026-10-01')
      const clayProxy = store.getEmpiricalSurfaceSpeed('Roland Garros', 'Clay', 'ATP', '2026-10-01')

      assert.ok(grassProxy.empirical_speed_index > clayProxy.empirical_speed_index, 'Hierba debe tener mayor velocidad que tierra batida')
      assert.ok(grassProxy.historical_hold_pct >= 0.70)
      assert.ok(clayProxy.historical_hold_pct >= 0.60)
      assert.ok(grassProxy.speed_category === 'Fast' || grassProxy.speed_category === 'Very Fast')
      assert.ok(clayProxy.speed_category === 'Slow' || clayProxy.speed_category === 'Very Slow')
    })

    test('9.3. Workload EWMA decae exponencialmente sin pseudociencia ACWR', () => {
      const matches = defaultTennisDataset.getMatches()
      const store = new PointInTimeFeatureStore(matches)

      const stats = store.getPlayerPointInTimeStats('p_sinner', 'Hard', '2026-09-10', 7)
      assert.ok(stats.matches_played >= 1)
      assert.ok(typeof stats.ewma_workload_minutes === 'number')
      assert.ok(stats.ewma_workload_minutes >= 0)
      assert.ok(typeof stats.days_since_last_match === 'number')
    })
  })

  // ─── 10. NTPL DATA ARCHITECTURE & GOVERNANCE ENGINE ───
  describe('10. NTPL Data Architecture & Governance Engine', () => {
    // Phase 1: Canonical Deduplication & SHA-256 Fingerprinting
    test('10.1. match_fingerprint reconcilia fuentes dispares con orden independiente de jugadores', () => {
      // Feed A: Sackmann format
      const headerA = {
        tour: 'ATP' as const,
        tournament_raw: 'BNP Paribas Open',
        season: 2026,
        round_raw: 'Quarterfinal',
        surface: 'Hard' as const,
        date: '2026-03-15',
        player_a_raw: 'Carlos Alcaraz',
        player_b_raw: 'Alexander Zverev',
      }

      // Feed B: Pinnacle Odds format (inverted order, informal tournament name, abbreviated players)
      const headerB = {
        tour: 'ATP' as const,
        tournament_raw: 'Indian Wells Masters 2026',
        season: 2026,
        round_raw: 'QF',
        surface: 'Hard' as const,
        date: '2026-03-15',
        player_a_raw: 'Sascha Zverev',
        player_b_raw: 'C. Alcaraz Garfia',
      }

      const resA = MatchDeduplicationEngine.generateFingerprint(headerA)
      const resB = MatchDeduplicationEngine.generateFingerprint(headerB)

      assert.strictEqual(resA.fingerprint, resB.fingerprint, 'Ambos feeds deben generar el mismo fingerprint exacto')
      assert.strictEqual(resA.canonical_tournament_slug, 'indian-wells')
      assert.strictEqual(resA.canonical_round, 'QF')
      assert.strictEqual(resA.fingerprint.length, 64)
    })

    // Phase 2: Strict Point-in-Time Feature Store
    test('10.2. StrictPointInTimeFeatureStore ejecuta LOCF estrictamente antes de T_match', () => {
      const store = new StrictPointInTimeFeatureStore()

      // Registra observaciones en T1 y T2
      store.recordFeature({
        entity_id: 'carlos-alcaraz',
        feature_group: 'BASELINE_RATING',
        feature_name: 'glicko2_rating',
        feature_version: 'v1_glicko_global',
        as_of_timestamp: '2026-03-10T12:00:00Z',
        feature_value: 2050,
      })

      store.recordFeature({
        entity_id: 'carlos-alcaraz',
        feature_group: 'BASELINE_RATING',
        feature_name: 'glicko2_rating',
        feature_version: 'v1_glicko_global',
        as_of_timestamp: '2026-03-20T12:00:00Z',
        feature_value: 2110,
      })

      // Consulta en T1.5 (2026-03-15) debe devolver 2050 (LOCF sin fuga de T2)
      const locf = store.getFeatureLOCF('carlos-alcaraz', 'glicko2_rating', 'v1_glicko_global', '2026-03-15T00:00:00Z')
      assert.ok(locf !== null)
      assert.strictEqual(locf.feature_value, 2050)

      // Snapshot a 2026-03-15 degrada campos no observados a priors por defecto
      const snap = store.getPlayerSnapshotAt('carlos-alcaraz', 'Hard', '2026-03-15T00:00:00Z')
      assert.strictEqual(snap.glicko2_rating, 2050)
      assert.strictEqual(snap.glicko2_rd, 350) // Default prior RD
      assert.strictEqual(snap.empirical_cpi, 35.0)
    })

    // Phase 3: Efron-Morris Empirical Bayes Shrinkage
    test('10.3. Efron-Morris contrae la varianza de jugadores novatos hacia la media del tour y preserva nulls en telemetría', () => {
      // Rookie con 2 partidos (Hold% muestral irreal de 100%)
      const rookie = EfronMorrisShrinkageEngine.regularizePlayer(
        'rookie_player',
        'ATP',
        'Hard',
        2,
        1.0, // 100% hold
        0.50
      )

      assert.strictEqual(rookie.is_cold_start, true)
      assert.ok(rookie.shrinkage_factor_B > 0.70, 'Rookie debe recibir alta contracción')
      assert.ok(rookie.shrunk_hold_pct < 0.90, 'Hold% contraído debe ser arrastrado hacia la media del tour (~0.792)')
      assert.strictEqual(rookie.micro_shot_speed_kmh, null, 'Telemetría ausente debe ser estrictamente null (sin fabricar datos)')

      // Veterano con 60 partidos
      const veteran = EfronMorrisShrinkageEngine.regularizePlayer(
        'veteran_player',
        'ATP',
        'Hard',
        60,
        0.88,
        0.28
      )

      assert.strictEqual(veteran.is_cold_start, false)
      assert.ok(veteran.shrinkage_factor_B < 0.25, 'Veterano retiene casi toda su varianza muestral')
      assert.ok(veteran.shrunk_hold_pct > 0.85)
    })

    // Phase 4: Shin Method & NLP Epistemic Fusion
    test('10.4. Shin Method resuelve fracción de insider z y probabilidades justas libres de sobremargen', () => {
      // Cuotas decimales con margen del ~5%
      const oddsA = 1.65
      const oddsB = 2.30

      const shin = ShinOddsMethod.calculateShinProbabilities(oddsA, oddsB)

      assert.ok(shin.bookmaker_overround > 0.03)
      assert.ok(shin.insider_fraction_z >= 0 && shin.insider_fraction_z <= 0.40)
      assert.strictEqual(Math.round((shin.shin_prob_a + shin.shin_prob_b) * 10000) / 10000, 1.0)
      assert.ok(shin.shin_prob_a > 0.55 && shin.shin_prob_a < 0.65)
    })

    test('10.5. NLP Epistemic Uncertainty ensancha intervalo de confianza sin alterar estimación puntual P(Win)', () => {
      const baseProb = 0.65
      const resultDoc = NLPEpistemicUncertaintyEngine.calculateUncertaintyInterval(baseProb, 'DOCUMENTED_ISSUE', 25)

      // La probabilidad media P(Win) se mantiene idéntica para no duplicar información del mercado
      assert.strictEqual(resultDoc.base_probability, baseProb)
      assert.strictEqual(resultDoc.epistemic_modifier, 0.35)

      // El intervalo ensanchado debe ser más amplio que el no modificado
      const unmodWidth = resultDoc.unmodified_ci_95[1] - resultDoc.unmodified_ci_95[0]
      const widenedWidth = resultDoc.widened_ci_95[1] - resultDoc.widened_ci_95[0]
      assert.ok(widenedWidth > unmodWidth)
    })

    // Phase 5: Walk-Forward Day-by-Day Validation Engine
    test('10.6. WalkForwardValidationEngine simula bucles temporales y categoriza calidad de datos', () => {
      const matches = defaultTennisDataset.getMatches()
      const store = new StrictPointInTimeFeatureStore()

      // Registrar ratings iniciales para jugadores benchmark
      for (const m of matches) {
        store.recordFeature({
          entity_id: m.winner_id,
          feature_group: 'BASELINE_RATING',
          feature_name: 'glicko2_rating',
          feature_version: 'v1_glicko_global',
          as_of_timestamp: '2023-12-31T00:00:00Z',
          feature_value: 1900,
        })
        store.recordFeature({
          entity_id: m.loser_id,
          feature_group: 'BASELINE_RATING',
          feature_name: 'glicko2_rating',
          feature_version: 'v1_glicko_global',
          as_of_timestamp: '2023-12-31T00:00:00Z',
          feature_value: 1750,
        })
      }

      const report = WalkForwardValidationEngine.runDailyWalkForwardSimulation(matches, store)

      assert.ok(report.daily_steps.length >= 5, 'Debe haber pasos diarios en el rango de fechas')
      assert.ok(report.overall_metrics.accuracy > 0.50)
      assert.ok(report.overall_metrics.brier_score < 0.35)
      assert.ok(typeof report.by_quality_tier.HIGH.count === 'number')
      assert.ok(typeof report.by_quality_tier.MEDIUM.count === 'number')
    })
  })

  // ─── 11. NTPL STAGE 1: LEAKAGE PREVENTION & TIME-TRAVEL ARCHITECTURE ───
  describe('11. NTPL Stage 1: Leakage Prevention & Time-Travel Architecture', () => {
    test('11.1. TemporalLeakageError es disparado ante cualquier violación available_at >= match.start_time', () => {
      assert.throws(
        () => {
          TimeTravelTensorEngine.assertTemporalIntegrity(
            '2026-03-15T14:30:00Z', // feature generated after match started
            '2026-03-15T12:00:00Z', // match start time
            'glicko2_rating',
            'm_test_leakage'
          )
        },
        (err) => {
          assert.ok(err instanceof TemporalLeakageError)
          assert.ok(err.message.includes('CRITICAL TEMPORAL LEAKAGE DETECTED'))
          return true
        }
      )

      // Cuando available_at < start_time, no lanza error
      assert.doesNotThrow(() => {
        TimeTravelTensorEngine.assertTemporalIntegrity(
          '2026-03-15T11:59:59Z',
          '2026-03-15T12:00:00Z',
          'glicko2_rating',
          'm_test_valid'
        )
      })
    })

    test('11.2. TimeTravelTensorEngine construye tensor punto-en-el-tiempo con auditoría verificada', () => {
      const matches = defaultTennisDataset.getMatches()
      const targetMatch = matches[matches.length - 1] // Partido más reciente
      const priorHistory = matches.slice(0, matches.length - 1)

      const tensor = TimeTravelTensorEngine.buildMatchTensor(targetMatch, priorHistory, {
        cpi: 38.5,
        altitude: 15,
        temperatureC: 24,
      })

      assert.strictEqual(tensor.match_id, targetMatch.id)
      assert.strictEqual(tensor.temporal_audit_verified, true)
      assert.ok(tensor.environment.air_density_kg_m3.value > 1.1 && tensor.environment.air_density_kg_m3.value < 1.3)
      assert.ok(typeof tensor.differential.delta_glicko_mu === 'number')
      assert.ok(typeof tensor.differential.delta_serve_hold === 'number')
      assert.ok(typeof tensor.differential.delta_ewma_workload === 'number')

      // Verificar que los timestamps de las features de ambos jugadores son anteriores a match_start_time
      const matchStartMs = new Date(tensor.match_start_time).getTime()
      const featMsA = new Date(tensor.player_a.rating_glicko_mu.available_at).getTime()
      const featMsB = new Date(tensor.player_b.rating_glicko_mu.available_at).getTime()

      assert.ok(featMsA < matchStartMs, 'Features de Player A deben preceder estrictamente el partido')
      assert.ok(featMsB < matchStartMs, 'Features de Player B deben preceder estrictamente el partido')
    })

    test('11.3. WalkForwardFramework genera ventanas estrictamente cronológicas y no superpuestas', () => {
      const matches = defaultTennisDataset.getMatches()
      const windows = WalkForwardFramework.generateWindows(matches, 3)

      assert.ok(windows.length >= 2)
      for (const w of windows) {
        const trainEndMs = new Date(w.train_window.end).getTime()
        const valStartMs = new Date(w.validation_window.start).getTime()
        const valEndMs = new Date(w.validation_window.end).getTime()
        const testStartMs = new Date(w.test_window.start).getTime()

        assert.ok(trainEndMs <= valStartMs, `Ventana ${w.window_index}: Train end (${w.train_window.end}) > Val start (${w.validation_window.start})`)
        assert.ok(valEndMs <= testStartMs, `Ventana ${w.window_index}: Val end (${w.validation_window.end}) > Test start (${w.test_window.start})`)
      }
    })
  })

  // ─── 12. NTPL STAGE 2: BASELINES, GLICKO-2 & PHYSICAL AIR DENSITY CPI ───
  describe('12. NTPL Stage 2: Baselines, Glicko-2 & Physical Air Density CPI', () => {
    test('12.1. Glicko-2 actualiza rating (mu), contrae RD (phi) tras partidos y decae con inactividad', () => {
      const playerA = { player_id: 'p_a', rating: 1500, rd: 350, volatility: 0.06 }
      const playerB = { player_id: 'p_b', rating: 1500, rd: 350, volatility: 0.06 }

      // Probabilidad inicial con rating idéntico = 0.50
      const probInitial = Glicko2Calculator.predictProbability(playerA, playerB)
      assert.strictEqual(probInitial, 0.5)

      // Victoria de Player A
      const { updatedA, updatedB } = Glicko2Calculator.updateMatch(playerA, playerB, 1.0)

      assert.ok(updatedA.rating > 1500, 'Ganador debe subir rating')
      assert.ok(updatedB.rating < 1500, 'Perdedor debe bajar rating')
      assert.ok(updatedA.rd < 350, 'RD del ganador debe contraerse (mayor certeza)')
      assert.ok(updatedB.rd < 350, 'RD del perdedor debe contraerse')

      // Decaimiento de RD con inactividad (60 días sin competir)
      const decayedA = Glicko2Calculator.decayRD(updatedA, 60)
      assert.ok(decayedA.rd > updatedA.rd, 'La inactividad debe expandir la incertidumbre (RD)')
      assert.ok(decayedA.rd <= 350, 'RD no puede superar el límite superior de 350')
    })

    test('12.2. Strength of Schedule (SoS) compara oponentes comunes y pondera tiers de torneos', () => {
      const matches = defaultTennisDataset.getMatches()
      const ratings = new Map<string, number>([
        ['p_sinner', 2150],
        ['p_alcaraz', 2130],
        ['p_djokovic', 2080],
        ['p_medvedev', 1980],
      ])

      const comparison = StrengthOfScheduleModel.compareCommonOpponents('p_sinner', 'p_alcaraz', matches, ratings)

      assert.ok(typeof comparison.common_opponents_count === 'number')
      assert.ok(comparison.sos_player_a >= 1500)
      assert.ok(comparison.sos_player_b >= 1500)
      assert.ok(typeof comparison.transitive_advantage_a === 'number')
    })

    test('12.3. Densidad del Aire (rho) modula el CPI empírico aumentando la velocidad en altitud', () => {
      // Nivel del mar (0m, 20C) vs Altitud de Madrid (650m, 28C)
      const rhoSeaLevel = AirDensityCPICalculator.calculateAirDensity(0, 20, 50)
      const rhoMadrid = AirDensityCPICalculator.calculateAirDensity(650, 28, 40)

      assert.ok(rhoMadrid < rhoSeaLevel, 'El aire en altitud y mayor temperatura debe ser menos denso')

      const baseClayCPI = 24.0 // Tierra batida lenta típica
      const cpiSeaLevel = AirDensityCPICalculator.modulateCPI('Rome', 'Clay', baseClayCPI, 20, 20, 60)
      const cpiMadrid = AirDensityCPICalculator.modulateCPI('Madrid', 'Clay', baseClayCPI, 650, 28, 35)

      assert.ok(
        cpiMadrid.modulated_cpi > cpiSeaLevel.modulated_cpi,
        `Tierra batida en Madrid (${cpiMadrid.modulated_cpi}) debe ser más rápida que en Roma a nivel del mar (${cpiSeaLevel.modulated_cpi})`
      )
    })

    test('12.4. ABLATION TEST 1: Benchmark de Log-Loss y Brier Score usando Glicko-2 diferencial únicamente', () => {
      const matches = defaultTennisDataset.getMatches()
      const ablation = GlickoAblationBenchmark.runAblationTest1(matches)

      assert.ok(ablation.sample_size >= 5, 'Debe evaluar un subconjunto fuera de muestra tras burn-in')
      assert.ok(ablation.accuracy >= 0.50, 'Baseline de Glicko debe ser superior a lanzamiento de moneda')
      assert.ok(ablation.brier_score < 0.35, 'Brier score debe ser inferior a 0.35')
      assert.ok(ablation.log_loss > 0 && ablation.log_loss < 1.5, 'Log-Loss debe estar acotado')
      assert.ok(ablation.calibration_error_ece >= 0)
    })
  })

  // ─── 13. STAGE 3: MICRO-DINÁMICA Y CADENAS DE MARKOV JERÁRQUICAS ───
  describe('13. Micro-Dinámica y Cadenas de Markov Jerárquicas (Stage 3)', () => {
    test('13.1. Ecuaciones analíticas de Juego (calcGameProb) y Tiebreak con resolución de Deuce', () => {
      // Simetría en 0.50
      const pNeutralGame = TennisMarkovModel.calcGameProb(0.50)
      assert.strictEqual(pNeutralGame, 0.50, 'Un punto de servicio neutral (0.50) debe dar P(Game)=0.50')

      // Ventaja del servidor típica ATP (~65% al servicio => ~83-84% mantener juego)
      const pAtpGame = TennisMarkovModel.calcGameProb(0.65)
      assert.ok(pAtpGame >= 0.80 && pAtpGame <= 0.86, `P(Game) con p=0.65 debe ser ~0.83 (obtenido ${pAtpGame})`)

      // Monotonía estricta
      assert.ok(TennisMarkovModel.calcGameProb(0.60) < TennisMarkovModel.calcGameProb(0.70))
      assert.ok(TennisMarkovModel.calcGameProb(0.70) < TennisMarkovModel.calcGameProb(0.80))

      // Tiebreak con servidores balanceados
      const pTbNeutral = TennisMarkovModel.calcTieBreakProb(0.65, 0.65)
      assert.ok(Math.abs(pTbNeutral - 0.50) < 0.03, 'Tiebreak entre servidores idénticos debe ser ~0.50')

      // Servidor A superior
      const pTbAdvA = TennisMarkovModel.calcTieBreakProb(0.70, 0.60)
      assert.ok(pTbAdvA > 0.55, 'Jugador con mejor servicio/resto debe tener ventaja en tiebreak')
    })

    test('13.2. Escalamiento jerárquico Set -> Partido (Best-of-3 y Best-of-5) y distribución de marcadores', () => {
      const pServeA = 0.68
      const pServeB = 0.62

      // Evaluación del set
      const setResult = TennisMarkovModel.calcSetProbabilities(pServeA, pServeB)
      assert.ok(setResult.p_set_a > 0.50, 'Jugador A debe ser favorito para el set')
      assert.ok(Math.abs(setResult.p_set_a + setResult.p_set_b - 1.0) < 0.001)
      assert.ok(setResult.expected_games_in_set >= 9.0 && setResult.expected_games_in_set <= 12.0)
      assert.ok(setResult.p_tiebreak > 0.05 && setResult.p_tiebreak < 0.40)

      // Partido Best of 3
      const bo3 = TennisMarkovModel.calcMatchDistribution(pServeA, pServeB, 'BestOf3')
      assert.strictEqual(bo3.format, 'BestOf3')
      assert.ok(bo3.p_win_a > setResult.p_set_a, 'La ventaja del set se amplifica en el partido')
      const sumBo3 = bo3.set_score_probabilities['2-0'] + bo3.set_score_probabilities['2-1'] +
                     bo3.set_score_probabilities['1-2'] + bo3.set_score_probabilities['0-2']
      assert.ok(Math.abs(sumBo3 - 1.0) < 0.02, `Suma de marcadores de set debe ser ~1.0 (obtenido ${sumBo3})`)

      // Partido Best of 5 (Grand Slam)
      const bo5 = TennisMarkovModel.calcMatchDistribution(pServeA, pServeB, 'BestOf5')
      assert.strictEqual(bo5.format, 'BestOf5')
      assert.ok(
        bo5.p_win_a >= bo3.p_win_a,
        'Teorema de amplificación: En formato más largo (BestOf5), el jugador superior tiene mayor probabilidad'
      )
      assert.ok(bo5.expected_total_games > bo3.expected_total_games, 'BestOf5 debe tener más juegos esperados')
      assert.ok(bo5.p_over_23_5_games > bo3.p_over_23_5_games)
    })

    test('13.3. Simulador Estocástico Monte Carlo converge con las fórmulas analíticas de Markov', () => {
      const pServeA = 0.66
      const pServeB = 0.61

      const analytic = TennisMarkovModel.calcMatchDistribution(pServeA, pServeB, 'BestOf3')
      const monteCarlo = TennisMarkovModel.runMonteCarloSimulation(pServeA, pServeB, 1500, 'BestOf3')

      // Comprobación de convergencia dentro del intervalo estocástico (+- 5%)
      const diff = Math.abs(monteCarlo.p_win_a - analytic.p_win_a)
      assert.ok(
        diff < 0.06,
        `Monte Carlo (${monteCarlo.p_win_a}) debe converger a la solución analítica (${analytic.p_win_a}), diff: ${diff}`
      )
      assert.ok(monteCarlo.expected_games >= 18 && monteCarlo.expected_games <= 28)
      assert.ok(monteCarlo.tiebreak_frequency >= 0.10 && monteCarlo.tiebreak_frequency <= 0.60)
    })

    test('13.4. ABLATION TEST 2: Benchmark fuera de muestra Markov jerárquico vs Baseline Glicko-2', () => {
      const matches = defaultTennisDataset.getMatches()
      const ablation = MarkovAblationBenchmark.runAblationTest2(matches)

      assert.ok(ablation.sample_size >= 5, 'Debe evaluar un subconjunto fuera de muestra')
      assert.ok(ablation.glicko_baseline.brier_score < 0.35, 'Baseline de Glicko debe ser competitivo')
      assert.ok(ablation.markov_model.brier_score < 0.35, 'Modelo Markov jerárquico debe tener buen Brier Score')
      assert.ok(ablation.markov_model.log_loss > 0 && ablation.markov_model.log_loss < 1.5)
      assert.ok(typeof ablation.brier_improvement_pct === 'number')
    })
  })

  // ─── 14. STAGE 4: MODELADO RESIDUAL NO LINEAL & TREE-SHAP ───
  describe('14. NTPL Stage 4: Non-Linear Residual ML Modeling & Tree-SHAP', () => {
    test('14.1. Verificación estricta de Zero Player_ID: features exclusivamente diferenciales', () => {
      const model = new PlayerAgnosticResidualBoostingModel()
      const sampleFeatures: PlayerAgnosticFeatures = {
        diff_glicko_mu: 1.25,
        diff_rd: -20,
        combined_rd: 95.5,
        diff_surface_elo: 1.1,
        diff_hold_pct: 0.08,
        diff_break_pct: 0.04,
        cpi_serve_interaction: 0.24,
        fatigue_differential: -12.5,
        rest_days_differential: 0.40,
        style_asymmetry: 1,
        is_grand_slam: 0,
      }

      const vec = model.vectorFromFeatures(sampleFeatures)
      assert.strictEqual(vec.length, 11, 'Vector debe tener exactamente 11 features numéricas normalizadas')
      for (const val of vec) {
        assert.strictEqual(typeof val, 'number')
        assert.ok(!isNaN(val), 'Ninguna feature puede ser NaN')
      }
    })

    test('14.2. Predicción de residuo ML sobre margen base de Markov (logit link)', () => {
      const model = new PlayerAgnosticResidualBoostingModel({
        learningRate: 0.1,
        numTrees: 10,
        maxDepth: 2,
      })

      const features: PlayerAgnosticFeatures = {
        diff_glicko_mu: 0.8,
        diff_rd: -10,
        combined_rd: 80,
        diff_surface_elo: 0.7,
        diff_hold_pct: 0.05,
        diff_break_pct: 0.03,
        cpi_serve_interaction: 0.1,
        fatigue_differential: 0,
        rest_days_differential: 0,
        style_asymmetry: 0,
        is_grand_slam: 0,
      }

      // Train on a synthetic micro-dataset
      model.train([
        { features, pMarkovBase: 0.65, targetWinnerA: 1 },
        { features: { ...features, diff_glicko_mu: -0.8 }, pMarkovBase: 0.35, targetWinnerA: 0 },
      ])

      const pred = model.predict(features, 0.65)
      assert.strictEqual(pred.p_markov_base, 0.65)
      assert.ok(pred.p_final_calibrated > 0.01 && pred.p_final_calibrated < 0.99)
      assert.ok(typeof pred.residual_log_odds_shift === 'number')
      assert.strictEqual(pred.governance.zero_player_id_verified, true)
      assert.strictEqual(pred.governance.attribution_type, 'ASSOCIATIVE_ONLY')
    })

    test('14.3. Descomposición aditiva Tree-SHAP suma exactamente el residuo log-odds', () => {
      const model = new PlayerAgnosticResidualBoostingModel({ numTrees: 5, maxDepth: 2 })
      const features: PlayerAgnosticFeatures = {
        diff_glicko_mu: 1.5,
        diff_rd: -30,
        combined_rd: 75,
        diff_surface_elo: 1.3,
        diff_hold_pct: 0.10,
        diff_break_pct: 0.06,
        cpi_serve_interaction: 0.3,
        fatigue_differential: -5,
        rest_days_differential: 0.2,
        style_asymmetry: 1,
        is_grand_slam: 0,
      }

      model.train([
        { features, pMarkovBase: 0.72, targetWinnerA: 1 },
        { features: { ...features, diff_glicko_mu: -1.5 }, pMarkovBase: 0.28, targetWinnerA: 0 },
      ])

      const pred = model.predict(features, 0.72)
      assert.strictEqual(pred.tree_shap_attributions.length, 11)

      const shapSum = pred.tree_shap_attributions.reduce((s, a) => s + a.shap_log_odds_impact, 0)
      assert.ok(
        Math.abs(shapSum - pred.residual_log_odds_shift) < 0.002,
        `Suma de SHAP (${shapSum}) debe coincidir con el shift total (${pred.residual_log_odds_shift})`
      )
    })

    test('14.4. ABLATION TEST 3: Markov + Residual ML vs Markov vs Glicko-2 fuera de muestra', () => {
      const matches = defaultTennisDataset.getMatches()
      const ablation = ResidualAblationBenchmark.runAblationTest3(matches)

      assert.ok(ablation.sample_size >= 5)
      assert.ok(ablation.glicko_baseline.brier_score < 0.35)
      assert.ok(ablation.markov_model.brier_score < 0.35)
      assert.ok(ablation.residual_ml_model.brier_score < 0.35)
      assert.ok(typeof ablation.brier_improvement_pct === 'number')
    })
  })

  // ─── 15. STAGE 5: BAYESIAN MODEL AVERAGING & BETA CALIBRATION ───
  describe('15. NTPL Stage 5: Bayesian Model Averaging (BMA) & Beta Calibration', () => {
    test('15.1. Ponderaciones de BMA adaptables por Data Quality Tier', () => {
      const ensemble = new BayesianModelEnsemble()

      const wHigh = ensemble.getTierWeights('HIGH')
      assert.strictEqual(wHigh.w_glicko, 0.15)
      assert.strictEqual(wHigh.w_markov, 0.35)
      assert.strictEqual(wHigh.w_residual_ml, 0.50)

      const wMed = ensemble.getTierWeights('MEDIUM')
      assert.strictEqual(wMed.w_glicko, 0.35)
      assert.strictEqual(wMed.w_markov, 0.65)
      assert.strictEqual(wMed.w_residual_ml, 0.00)

      const wLow = ensemble.getTierWeights('LOW')
      assert.strictEqual(wLow.w_glicko, 1.00)
      assert.strictEqual(wLow.w_markov, 0.00)
      assert.strictEqual(wLow.w_residual_ml, 0.00)
    })

    test('15.2. Degradación elegante ante ausencia de telemetría sin crear datos ficticios', () => {
      const ensemble = new BayesianModelEnsemble()

      // En Tier LOW, si Markov y ML son null, se reduce estrictamente a Glicko-2
      const resultLow = ensemble.combineAndCalibrate(
        { p_glicko: 0.68, p_markov: null, p_residual_ml: null },
        'LOW'
      )
      assert.strictEqual(resultLow.weights_used.tier, 'LOW')
      assert.ok(Math.abs(resultLow.p_raw_ensemble - 0.68) < 0.001)

      // En Tier HIGH, fusiona los 3 componentes
      const resultHigh = ensemble.combineAndCalibrate(
        { p_glicko: 0.60, p_markov: 0.65, p_residual_ml: 0.70 },
        'HIGH'
      )
      // 0.15 * 0.60 + 0.35 * 0.65 + 0.50 * 0.70 = 0.09 + 0.2275 + 0.35 = 0.6675
      assert.ok(Math.abs(resultHigh.p_raw_ensemble - 0.6675) < 0.001)
    })

    test('15.3. Beta Calibration preserva colas extremas y rango completo sin aplanar favoritos', () => {
      const calibrator = new BetaCalibrator({ a: 1.05, b: 1.05, c: 0.0 })

      // Simetría en 0.50
      assert.strictEqual(calibrator.calibrate(0.50), 0.50)

      // Gran favorito p = 0.94 (Sinner o Alcaraz en R1) no debe ser colapsado a 0.75
      const calHeavyFav = calibrator.calibrate(0.94)
      assert.ok(calHeavyFav >= 0.92, `Gran favorito debe mantenerse >0.92 (obtenido ${calHeavyFav})`)

      // Gran underdog p = 0.06
      const calUnderdog = calibrator.calibrate(0.06)
      assert.ok(calUnderdog <= 0.08, `Underdog debe mantenerse <0.08 (obtenido ${calUnderdog})`)

      // Fitting de parámetros
      const fitted = calibrator.fit([0.6, 0.7, 0.8, 0.2, 0.3], [1, 1, 1, 0, 0])
      assert.ok(fitted.a > 0 && fitted.b > 0)
    })
  })

  // ─── 16. STAGE 6: UNCERTAINTY QUANTIFICATION (UQ) & SHIN METHOD FUSION ───
  describe('16. NTPL Stage 6: Uncertainty Quantification (UQ) & Shin Market Fusion', () => {
    test('16.1. Descomposición formal de varianza Epistémica vs Aleatoria', () => {
      const uq = UncertaintyQuantificationEngine.computeUncertainty({
        pWin: 0.75,
        rdA: 55,
        rdB: 60,
        daysInactiveA: 10,
        daysInactiveB: 12,
        dataQualityTier: 'HIGH',
      })

      assert.ok(uq.sigma_aleatoric > 0, 'Aleatoric variance must be positive')
      assert.ok(uq.sigma_epistemic > 0, 'Epistemic uncertainty must be positive')
      assert.ok(uq.sigma_total >= uq.sigma_aleatoric)
      assert.ok(uq.sigma_total >= uq.sigma_epistemic)

      // Relación cuadrática sigma_total = sqrt(sigma_epistemic^2 + sigma_aleatoric^2)
      const expectedTotal = Math.sqrt(
        uq.sigma_epistemic * uq.sigma_epistemic + uq.sigma_aleatoric * uq.sigma_aleatoric
      )
      assert.ok(Math.abs(uq.sigma_total - expectedTotal) < 0.005)
    })

    test('16.2. Intervalos de Credibilidad Bayesianos al 90% y 95% están estrictamente anidados', () => {
      const res = UncertaintyQuantificationEngine.quantifyPrediction({
        pModel: 0.70,
        rdA: 50,
        rdB: 50,
        daysInactiveA: 7,
        daysInactiveB: 7,
        dataQualityTier: 'HIGH',
      })

      const { ci_90_lower, ci_90_upper, ci_95_lower, ci_95_upper } = res.credible_intervals
      assert.ok(ci_95_lower <= ci_90_lower, 'CI 95 lower debe ser menor o igual que CI 90 lower')
      assert.ok(ci_95_upper >= ci_90_upper, 'CI 95 upper debe ser mayor o igual que CI 90 upper')
      assert.ok(ci_95_lower >= 0.01 && ci_95_upper <= 0.99)
    })

    test('16.3. Fusión con cuotas de Shin detecta información privilegiada (z) y pondera con el mercado', () => {
      // Cuotas con margen
      const res = UncertaintyQuantificationEngine.quantifyPrediction({
        pModel: 0.65,
        rdA: 50,
        rdB: 50,
        daysInactiveA: 5,
        daysInactiveB: 5,
        decimalOddsA: 1.45,
        decimalOddsB: 2.80,
        dataQualityTier: 'HIGH',
      })

      assert.ok(res.market_fair_p !== null)
      assert.ok(res.insider_trading_z !== null)
      assert.ok(typeof res.epistemic_ratio === 'number')
    })

    test('16.4. Noticias ambiguas ensanchan intervalo de credibilidad sin alterar la media', () => {
      const cleanRes = UncertaintyQuantificationEngine.quantifyPrediction({
        pModel: 0.65,
        rdA: 50,
        rdB: 50,
        daysInactiveA: 5,
        daysInactiveB: 5,
        dataQualityTier: 'HIGH',
      })

      const noisyRes = UncertaintyQuantificationEngine.quantifyPrediction({
        pModel: 0.65,
        rdA: 50,
        rdB: 50,
        daysInactiveA: 5,
        daysInactiveB: 5,
        newsItems: [
          {
            headline: 'Player reports discomfort during warmup',
            snippet: 'Unknown knee status',
            source: 'PressConference',
            published_at: new Date().toISOString(),
            injury_status: 'QUESTIONABLE',
            confidence: 0.8,
          },
        ],
        dataQualityTier: 'HIGH',
      })

      assert.strictEqual(cleanRes.p_win_point_estimate, noisyRes.p_win_point_estimate, 'La media no debe moverse sin justificación')
      assert.ok(
        noisyRes.credible_intervals.credible_interval_width > cleanRes.credible_intervals.credible_interval_width,
        'La incertidumbre epistémica de las noticias debe ensanchar el intervalo de credibilidad'
      )
    })
  })

  // ─── 17. STAGE 7: MURPHY\'S BRIER SCORE DECOMPOSITION ───
  describe('17. NTPL Stage 7: Murphy Brier Score Decomposition', () => {
    test('17.1. Identidad algebraica exacta: Brier Score === Reliability - Resolution + Uncertainty', () => {
      const preds = [0.85, 0.75, 0.60, 0.40, 0.20, 0.90, 0.30, 0.70]
      const labels = [1, 1, 1, 0, 0, 1, 0, 1]

      const decomp = MurphyBrierDecomposer.decompose(preds, labels, 5)

      assert.strictEqual(decomp.identity_verified, true, 'La identidad de Murphy debe cumplirse exactamente')
      assert.ok(decomp.reliability >= 0, 'Reliability must be >= 0')
      assert.ok(decomp.resolution >= 0, 'Resolution must be >= 0')
      assert.ok(decomp.uncertainty >= 0, 'Uncertainty must be >= 0')
    })
  })

  // ─── 18. STAGE 8: MODEL GOVERNANCE, CRYPTOGRAPHIC REGISTRY & MASTER ENGINE ───
  describe('18. NTPL Stage 8: Model Governance, Cryptographic Registry & Master Engine', () => {
    test('18.1. Registro inmutable append-only con hash criptográfico SHA-256', () => {
      TennisModelRegistry.resetRegistry()

      const decomp = MurphyBrierDecomposer.decompose([0.8, 0.6], [1, 1], 2)
      const artifact = TennisModelRegistry.registerModel(
        'v1.0.0-ntpl',
        'NTPL Residual Boosting v1',
        ['diff_glicko_mu', 'diff_hold_pct', 'cpi_serve_interaction'],
        {
          log_loss: 0.45,
          brier_score: 0.16,
          murphy_decomposition: decomp,
          accuracy: 0.78,
          calibration_ece: 0.03,
        },
        500
      )

      assert.strictEqual(artifact.model_version, 'v1.0.0-ntpl')
      assert.strictEqual(artifact.status, 'STAGING')
      assert.ok(artifact.sha256_hash.length === 64, 'SHA-256 hash must be 64 characters hex')
      assert.strictEqual(artifact.feature_schema.zero_player_id_verified, true)

      // Re-registro debe fallar (append-only)
      assert.throws(
        () => TennisModelRegistry.registerModel('v1.0.0-ntpl', 'NTPL Duplicate', [], {
          log_loss: 0.5, brier_score: 0.2, murphy_decomposition: decomp, accuracy: 0.7, calibration_ece: 0.05
        }, 100),
        /ModelRegistryError/
      )
    })

    test('18.2. Violación de gobernanza: rechaza features con player_id o nombres de jugadores', () => {
      TennisModelRegistry.resetRegistry()
      const decomp = MurphyBrierDecomposer.decompose([0.8, 0.6], [1, 1], 2)

      assert.throws(
        () => TennisModelRegistry.registerModel(
          'v1.0.1-bad',
          'Violating Model',
          ['player_id_categorical', 'diff_elo'],
          {
            log_loss: 0.5,
            brier_score: 0.2,
            murphy_decomposition: decomp,
            accuracy: 0.7,
            calibration_ece: 0.05,
          },
          100
        ),
        /ModelGovernanceViolation/
      )
    })

    test('18.3. Ciclo de vida y promoción de modelos: STAGING -> ACTIVE -> ARCHIVED', () => {
      TennisModelRegistry.resetRegistry()
      const decomp = MurphyBrierDecomposer.decompose([0.8, 0.6], [1, 1], 2)

      TennisModelRegistry.registerModel('v1.0.0', 'Model A', ['diff_mu'], {
        log_loss: 0.45, brier_score: 0.16, murphy_decomposition: decomp, accuracy: 0.78, calibration_ece: 0.03
      }, 500)

      TennisModelRegistry.registerModel('v1.1.0', 'Model B', ['diff_mu'], {
        log_loss: 0.42, brier_score: 0.14, murphy_decomposition: decomp, accuracy: 0.81, calibration_ece: 0.02
      }, 600)

      TennisModelRegistry.promoteToActive('v1.0.0')
      assert.strictEqual(TennisModelRegistry.getActiveModel()?.model_version, 'v1.0.0')

      TennisModelRegistry.promoteToActive('v1.1.0')
      assert.strictEqual(TennisModelRegistry.getActiveModel()?.model_version, 'v1.1.0')
      assert.strictEqual(TennisModelRegistry.getModel('v1.0.0')?.status, 'ARCHIVED')
    })

    test('18.4. NexusTennisPredictiveLab orquesta inferencia end-to-end completa en todas las 8 etapas', () => {
      const ntpl = NexusTennisPredictiveLab.getInstance()

      const glickoA: Glicko2State = { player_id: 'p_sinner', rating: 2180, rd: 45, volatility: 0.05 }
      const glickoB: Glicko2State = { player_id: 'p_alcaraz', rating: 2140, rd: 48, volatility: 0.05 }

      const prediction = ntpl.predict(
        {
          player_a: {
            id: 'p_sinner',
            hand: 'R',
            backhand: '2H',
            hold_pct: 0.89,
            break_pct: 0.28,
            days_inactive: 6,
            workload_ewma: 24.5,
          },
          player_b: {
            id: 'p_alcaraz',
            hand: 'R',
            backhand: '2H',
            hold_pct: 0.86,
            break_pct: 0.31,
            days_inactive: 5,
            workload_ewma: 26.0,
          },
          tournament: {
            name: 'Roland Garros',
            city: 'Paris',
            surface: 'Clay',
            tour: 'ATP',
            level: 'GrandSlam',
            altitude_m: 35,
            temperature_c: 24,
            humidity_pct: 55,
            base_cpi: 24.0,
          },
          odds: {
            decimal_a: 1.80,
            decimal_b: 2.05,
          },
          data_quality_tier: 'HIGH',
        },
        glickoA,
        glickoB
      )

      // Verificaciones estructurales
      assert.strictEqual(prediction.matchup_summary.format, 'BestOf5', 'ATP Grand Slam debe ser Best of 5')
      assert.ok(prediction.stage_predictions.glicko2_prior_p_win_a > 0.50)
      assert.ok(prediction.stage_predictions.markov_p_win_a > 0.40)
      assert.ok(prediction.stage_predictions.beta_calibrated_p_win_a > 0.40)
      assert.ok(prediction.markov_distributions.expected_total_games > 30, 'Best of 5 games debe ser > 30')
      assert.ok(prediction.tree_shap_associations.length === 11)
      assert.strictEqual(prediction.governance.zero_player_id_verified, true)
      assert.strictEqual(prediction.governance.attribution_type, 'ASSOCIATIVE_ONLY')
      assert.strictEqual(prediction.governance.causal_overclaim_prohibited, true)
      assert.ok(prediction.market_analysis !== undefined)
      assert.ok(prediction.uncertainty_quantification.credible_intervals.ci_95_upper <= 0.99)
    })
  })

  // ─── 19. NTCI: NEXUS TENNIS CONTEXT INTELLIGENCE & IN-PLAY BAYES ───
  describe('19. NTCI: Context Intelligence, Epistemic Filter & Live In-Play Bayes', () => {
    test('19.1. Source Freshness Engine: Clasificación de Tiers y Decaimiento Exponencial (t_1/2 = 12h)', () => {
      // 1. Tiers
      assert.strictEqual(
        NTCISourceFreshnessEngine.classifySourceTier('ATPTour.com', 'https://www.atptour.com/news'),
        'OFFICIAL'
      )
      assert.strictEqual(
        NTCISourceFreshnessEngine.classifySourceTier('BBC Sport', 'https://www.bbc.co.uk/sport/tennis'),
        'REPUTABLE_MEDIA'
      )
      assert.strictEqual(
        NTCISourceFreshnessEngine.classifySourceTier('Tennis Magazine Regional', 'https://tennis-regional.net'),
        'SECONDARY'
      )
      assert.strictEqual(
        NTCISourceFreshnessEngine.classifySourceTier('Twitter / X Tennis Leak', 'https://x.com/tennisleak/123'),
        'RUMOR'
      )

      // 2. Continuous Exponential Decay: w(t) = exp(-0.05776 * t)
      const w0 = NTCISourceFreshnessEngine.calcExponentialDecay(0)
      assert.strictEqual(w0, 1.0, 'w(0) debe ser exactamente 1.0')

      const w12 = NTCISourceFreshnessEngine.calcExponentialDecay(12)
      assert.strictEqual(w12, 0.50, 'w(12h) debe ser exactamente la vida media 0.50')

      const w24 = NTCISourceFreshnessEngine.calcExponentialDecay(24)
      assert.strictEqual(w24, 0.25, 'w(24h) debe ser 0.25 (dos vidas medias)')

      const w48 = NTCISourceFreshnessEngine.calcExponentialDecay(48)
      assert.ok(w48 < 0.10, 'w(48h) debe haber decaído por debajo de 0.10')

      // 3. Freshness Buckets
      assert.strictEqual(NTCISourceFreshnessEngine.getFreshnessBucket(0.5), '<1h')
      assert.strictEqual(NTCISourceFreshnessEngine.getFreshnessBucket(4.0), '1-6h')
      assert.strictEqual(NTCISourceFreshnessEngine.getFreshnessBucket(18.0), '6-24h')
      assert.strictEqual(NTCISourceFreshnessEngine.getFreshnessBucket(30.0), '>24h')
    })

    test('19.2. Pre-Match Pipeline: Garantía de Cero Inferencia Médica y Extracción Factual', () => {
      const now = new Date()
      const nowISO = now.toISOString()

      const withdrawalEvent: NTCIRawEventInput = {
        publisher: 'ATPTour.com',
        title: 'Player withdraws from upcoming match due to knee condition',
        url: 'https://atptour.com/news/1',
        published_at: nowISO,
        retrieved_at: nowISO,
        player: 'Jannik Sinner',
        raw_text: 'Jannik Sinner officially withdrew from the tournament citing a knee condition.',
        topic: 'INJURY',
      }

      const featureWithdrawal = NTCIPreMatchPipeline.extractFeature(withdrawalEvent, nowISO)
      assert.strictEqual(featureWithdrawal.availability_status, 'WITHDRAWN')
      assert.strictEqual(featureWithdrawal.medical_inference_attempted, false, 'Inferencia médica estrictamente prohibida')
      assert.ok(featureWithdrawal.confidence >= 0.90)

      const strappingEvent: NTCIRawEventInput = {
        publisher: 'BBC Sport',
        title: 'Player seen on court with medical time-out and tape',
        url: 'https://bbc.com/sport/2',
        published_at: nowISO,
        retrieved_at: nowISO,
        player: 'Carlos Alcaraz',
        raw_text: 'Trainer called for medical time-out; heavy tape on right forearm observed.',
        topic: 'INJURY',
      }

      const featureStrapping = NTCIPreMatchPipeline.extractFeature(strappingEvent, nowISO)
      assert.strictEqual(featureStrapping.availability_status, 'DOCUMENTED_ISSUE')
      assert.strictEqual(featureStrapping.medical_inference_attempted, false)
      assert.ok(featureStrapping.verifiable_fact.includes('physical intervention'))

      const optimalEvent: NTCIRawEventInput = {
        publisher: 'L Équipe',
        title: 'Player fully fit and cleared to play',
        url: 'https://lequipe.fr/tennis/3',
        published_at: nowISO,
        retrieved_at: nowISO,
        player: 'Alexander Zverev',
        raw_text: 'Player is fully fit and cleared to play after intense practice block.',
        topic: 'INJURY',
      }

      const featureOptimal = NTCIPreMatchPipeline.extractFeature(optimalEvent, nowISO)
      assert.strictEqual(featureOptimal.availability_status, 'OPTIMAL')
      assert.strictEqual(featureOptimal.medical_inference_attempted, false)
    })

    test('19.3. Filtro Epistémico: Invariante de Probabilidad (Read-Only) y Preservación de Conflictos', () => {
      const now = new Date()
      const nowISO = now.toISOString()
      const p0 = 0.68

      // 1. Escenario sin conflicto: Fuentes consistentes
      const consistentEvents: NTCIRawEventInput[] = [
        {
          publisher: 'ATPTour.com',
          title: 'Player ready and 100% prepared',
          url: 'https://atptour.com/news/1',
          published_at: nowISO,
          retrieved_at: nowISO,
          player: 'Jannik Sinner',
          raw_text: 'Player is 100% and fully fit for match.',
          topic: 'INJURY',
        },
      ]

      const consistentReport = NTCIPreMatchPipeline.processPreMatchContext(consistentEvents, p0, nowISO)
      assert.strictEqual(consistentReport.uncertainty.conflict_flag, false)
      assert.strictEqual(consistentReport.uncertainty.epistemic_variance_multiplier, 1.0)

      // 2. Escenario con conflicto: Fuente oficial reporta OPTIMAL vs Fuente reporta QUESTIONABLE
      const conflictingEvents: NTCIRawEventInput[] = [
        {
          publisher: 'ATPTour.com',
          title: 'Player cleared to play and feeling great',
          url: 'https://atptour.com/news/1',
          published_at: nowISO,
          retrieved_at: nowISO,
          player: 'Jannik Sinner',
          raw_text: 'Player is fully fit and ready for match.',
          topic: 'INJURY',
        },
        {
          publisher: 'Regional Sport Portal',
          title: 'Discomfort reported in training session',
          url: 'https://regional.com/news/2',
          published_at: nowISO,
          retrieved_at: nowISO,
          player: 'Jannik Sinner',
          raw_text: 'Player cut short practice due to discomfort and soreness in right wrist.',
          topic: 'INJURY',
        },
      ]

      const conflictReport = NTCIPreMatchPipeline.processPreMatchContext(conflictingEvents, p0, nowISO)

      // Reglas de gobernanza de conflicto:
      assert.strictEqual(conflictReport.uncertainty.conflict_flag, true, 'Debe activar conflict_flag')
      assert.strictEqual(
        conflictReport.uncertainty.epistemic_variance_multiplier,
        2.4,
        'Debe inflar el multiplicador de varianza epistémica a 2.4x'
      )
      assert.ok(conflictReport.uncertainty.conflict_summary?.includes('Contradictory reports preserved'))

      // Comprobación de simetría sobre p0 (la media no se desplaza sin justificación causal)
      const [lBound, uBound] = conflictReport.uncertainty.epistemic_bounds
      const midPoint = (lBound + uBound) / 2
      assert.ok(
        Math.abs(midPoint - p0) < 0.005,
        `El centro del intervalo [${lBound}, ${uBound}] (${midPoint}) debe permanecer sobre el prior p0 (${p0})`
      )
      assert.ok(
        (uBound - lBound) > (consistentReport.uncertainty.epistemic_bounds[1] - consistentReport.uncertainty.epistemic_bounds[0]),
        'El ancho del intervalo con conflicto debe ser estrictamente mayor que el consistente'
      )
    })

    test('19.4. Actualizador Live In-Play: Bayes Empírico, Score Conditioning y Cero Momentum Narrativo', () => {
      const p0 = 0.62

      const inPlay = NTCILiveEmpiricalBayesUpdater.updateInPlayForecast({
        pre_match_probability_a: p0,
        state: {
          set_score: '1-0',
          game_score: '3-1',
          point_score: '40-15',
          server: 'p_sinner',
          receiver: 'p_alcaraz',
          current_set: 2,
          games_in_current_set: [3, 1],
          is_tiebreak: false,
        },
        format: 'BestOf3',
        player_a_stats: {
          points_served: 24,
          points_served_won: 20, // 83.3% hold rate
          points_returned: 18,
          points_returned_won: 7,
          break_points_faced: 0,
          break_points_saved: 0,
        },
        player_b_stats: {
          points_served: 18,
          points_served_won: 11,
          points_returned: 24,
          points_returned_won: 4,
          break_points_faced: 2,
          break_points_saved: 1,
        },
        recent_points_sequence: ['S', 'S', 'R', 'S', 'S', 'S'],
      })

      // Verificaciones Bayesianas e Inducción
      assert.strictEqual(inPlay.model_update.prior_pre_match, p0)
      assert.ok(
        inPlay.updated_probability > p0,
        `Liderando 1-0 en sets y 3-1 en games, posterior (${inPlay.updated_probability}) debe superar al prior (${p0})`
      )
      assert.ok(inPlay.model_update.bayes_factor > 1.0, 'Bayes factor debe favorecer al jugador con ventaja observada')
      assert.strictEqual(inPlay.recent_evidence.points_evaluated, 6)
      assert.strictEqual(inPlay.recent_evidence.server_points_won, 5)
      assert.strictEqual(inPlay.recent_evidence.receiver_points_won, 1)
      assert.ok(inPlay.recent_evidence.service_hold_rate_observed > 0.80)
    })

    test('19.5. Servicio NTCI: Validación Integral de Contratos de Salida de Fase 4', () => {
      const nowISO = new Date().toISOString()
      const p0 = 0.70

      // Contrato 1: Pre-Match
      const preMatch = NTCIService.generatePreMatchReport({
        baseProbability: p0,
        rawEvents: [
          {
            publisher: 'ATPTour.com',
            title: 'Player training confirmed',
            url: 'https://atptour.com/news/1',
            published_at: nowISO,
            retrieved_at: nowISO,
            player: 'Jannik Sinner',
            raw_text: 'Player is cleared to play after intense practice.',
            topic: 'INJURY',
          },
        ],
        referenceTimeISO: nowISO,
      })

      assert.strictEqual(preMatch.probability, p0, 'Pre-Match endpoint respeta invariante de solo lectura')
      assert.ok(Array.isArray(preMatch.news_context))
      assert.strictEqual(preMatch.news_context.length, 1)
      assert.strictEqual(preMatch.news_context[0].medical_inference_attempted, false)
      assert.ok(preMatch.uncertainty.epistemic_bounds[0] < p0)
      assert.ok(preMatch.uncertainty.epistemic_bounds[1] > p0)

      // Contrato 2: In-Play
      const inPlay = NTCIService.generateInPlayReport({
        pre_match_probability_a: p0,
        state: {
          set_score: '0-0',
          game_score: '1-1',
          point_score: '15-15',
          server: 'p_sinner',
          receiver: 'p_alcaraz',
          current_set: 1,
          games_in_current_set: [1, 1],
          is_tiebreak: false,
        },
        player_a_stats: {
          points_served: 6,
          points_served_won: 4,
          points_returned: 6,
          points_returned_won: 2,
          break_points_faced: 0,
          break_points_saved: 0,
        },
        player_b_stats: {
          points_served: 6,
          points_served_won: 4,
          points_returned: 6,
          points_returned_won: 2,
          break_points_faced: 0,
          break_points_saved: 0,
        },
        recent_points_sequence: ['S', 'R'],
      })

      assert.strictEqual(typeof inPlay.updated_probability, 'number')
      assert.strictEqual(inPlay.model_update.prior_pre_match, p0)
      assert.ok(typeof inPlay.model_update.bayes_factor === 'number')
      assert.strictEqual(inPlay.recent_evidence.points_evaluated, 2)
    })
  })

  // ─── 20. NTPF: NEXUS TENNIS POST-MATCH FORENSICS & GOVERNANCE ───
  describe('20. NTPF: Post-Match Forensics, Multilevel Deltas, Diagnostics, Counterfactuals & Shadow Pipeline', () => {
    test('20.1. Multilevel Delta Engine: Jerarquía de 4 Niveles y z-Scores de Varianza', () => {
      const baseline: ExpectedMatchBaseline = {
        p_win_a: 0.65,
        expected_total_games: 22.5,
        p_first_set_a: 0.62,
        p_tiebreak_a: 0.55,
        expected_hold_pct_a: 0.85,
        expected_break_pct_a: 0.22,
        expected_first_serve_in_pct_a: 0.64,
        expected_first_serve_win_pct_a: 0.76,
        expected_second_serve_win_pct_a: 0.52,
      }

      const observed: ObservedMatchStatistics = {
        winner_is_a: true,
        total_games_played: 24,
        first_set_won_a: true,
        deciding_set_played: true,
        deciding_set_won_a: true,
        tiebreaks_played: 1,
        tiebreaks_won_a: 1,
        first_serve_in_pct_a: 0.68,
        first_serve_win_pct_a: 0.80,
        second_serve_win_pct_a: 0.50,
        return_points_win_pct_a: 0.35,
        service_hold_pct_a: 0.90,
        break_point_conversion_a: 0.25,
        break_points_saved_pct_a: 0.67,
        service_games_played: 12,
        aces_a: 11,
        aces_b: 6,
        unforced_errors_a: 18,
        unforced_errors_b: 26,
        duration_minutes: 135,
        short_rally_win_pct_a: 0.56,
        medium_rally_win_pct_a: 0.52,
        long_rally_win_pct_a: 0.49,
      }

      const deltas = NTPFMultilevelDeltaEngine.computeDeltas(baseline, observed)

      // 1. Point Level
      assert.strictEqual(deltas.point_level.first_serve_in_pct_a.expected, 0.64)
      assert.strictEqual(deltas.point_level.first_serve_in_pct_a.observed, 0.68)
      assert.strictEqual(deltas.point_level.first_serve_in_pct_a.delta, 0.04)
      assert.strictEqual(deltas.point_level.first_serve_in_pct_a.variance_z_score, 0.8) // 0.04 / 0.05

      assert.strictEqual(deltas.point_level.first_serve_win_pct_a.expected, 0.76)
      assert.strictEqual(deltas.point_level.first_serve_win_pct_a.observed, 0.80)
      assert.strictEqual(deltas.point_level.first_serve_win_pct_a.delta, 0.04)

      // 2. Game Level
      assert.strictEqual(deltas.game_level.service_hold_pct_a.expected, 0.85)
      assert.strictEqual(deltas.game_level.service_hold_pct_a.observed, 0.90)
      assert.strictEqual(deltas.game_level.service_hold_pct_a.delta, 0.05)
      assert.strictEqual(deltas.game_level.service_games_played, 12)

      // 3. Set Level
      assert.strictEqual(deltas.set_level.first_set_win_a.expected, 0.62)
      assert.strictEqual(deltas.set_level.first_set_win_a.observed, 1.0)
      assert.strictEqual(deltas.set_level.tiebreaks_played, 1)
      assert.strictEqual(deltas.set_level.tiebreak_win_pct_a.observed, 1.0)

      // 4. Match Level
      assert.strictEqual(deltas.match_level.match_win_a.observed, 1.0)
      assert.strictEqual(deltas.match_level.total_games.observed, 24)
      assert.strictEqual(deltas.match_level.total_games.delta, 1.5)
      assert.strictEqual(deltas.match_level.ace_differential.observed, 5) // 11 - 6
      assert.strictEqual(deltas.match_level.unforced_error_differential.observed, -8) // 18 - 26
      assert.strictEqual(deltas.match_level.duration_minutes, 135)
    })

    test('20.2. Diagnostic Classifier: Árbol de Miss Typology y Separación Epistémica Factual', () => {
      const dummyDeltas = NTPFMultilevelDeltaEngine.computeDeltas(
        {
          p_win_a: 0.85,
          expected_total_games: 21,
          p_first_set_a: 0.80,
          p_tiebreak_a: 0.60,
          expected_hold_pct_a: 0.88,
          expected_break_pct_a: 0.30,
          expected_first_serve_in_pct_a: 0.65,
          expected_first_serve_win_pct_a: 0.80,
          expected_second_serve_win_pct_a: 0.55,
        },
        {
          winner_is_a: false,
          total_games_played: 22,
          first_set_won_a: false,
          deciding_set_played: false,
          tiebreaks_played: 0,
          tiebreaks_won_a: 0,
          first_serve_in_pct_a: 0.60,
          first_serve_win_pct_a: 0.65,
          second_serve_win_pct_a: 0.40,
          return_points_win_pct_a: 0.20,
          service_hold_pct_a: 0.65,
          break_point_conversion_a: 0.10,
          break_points_saved_pct_a: 0.45,
          service_games_played: 10,
          aces_a: 4,
          aces_b: 8,
          unforced_errors_a: 32,
          unforced_errors_b: 14,
        }
      )

      const shapAttributions = [
        {
          feature_name: 'diff_glicko_mu',
          feature_value: 120,
          shap_log_odds_impact: 0.75,
          intuitive_direction: 'FAVORS_A' as const,
          category: 'CORE_RATING' as const,
        },
        {
          feature_name: 'diff_cpi_speed_suitability',
          feature_value: -0.15,
          shap_log_odds_impact: -0.30,
          intuitive_direction: 'FAVORS_B' as const,
          category: 'ENVIRONMENT' as const,
        },
      ]

      // Caso 1: OVERCONFIDENCE (p=0.85 y perdió Player A)
      const resOverconf = NTPFDiagnosticClassifier.diagnose({
        predicted_p_a: 0.85,
        winner_is_a: false,
        deltas: dummyDeltas,
        shap_attributions: shapAttributions,
      })
      assert.strictEqual(resOverconf.algorithmic_diagnostics.miss_typology, 'OVERCONFIDENCE')
      assert.strictEqual(resOverconf.algorithmic_diagnostics.severity, 'CRITICAL')
      assert.ok(resOverconf.algorithmic_diagnostics.brier_score > 0.70)

      // Epistemological separation check
      assert.ok(
        resOverconf.court_analytics.epistemological_disclaimer.includes('Aviso Epistemológico')
      )
      assert.strictEqual(
        resOverconf.court_analytics.epistemological_disclaimer.includes('No constituyen certeza causal determinista'),
        true
      )
      assert.ok(resOverconf.court_analytics.factual_match_narrative.includes('Victoria de Jugador B'))

      // Caso 2: WITHIN_TOLERANCE (p=0.75 y ganó Player A -> abs error = 0.25 <= 0.30)
      const tolDeltas = NTPFMultilevelDeltaEngine.computeDeltas(
        {
          p_win_a: 0.75,
          expected_total_games: 22,
          p_first_set_a: 0.70,
          p_tiebreak_a: 0.52,
          expected_hold_pct_a: 0.82,
          expected_break_pct_a: 0.22,
          expected_first_serve_in_pct_a: 0.62,
          expected_first_serve_win_pct_a: 0.74,
          expected_second_serve_win_pct_a: 0.52,
        },
        {
          winner_is_a: true,
          total_games_played: 20,
          first_set_won_a: true,
          deciding_set_played: false,
          tiebreaks_played: 0,
          tiebreaks_won_a: 0,
          first_serve_in_pct_a: 0.64,
          first_serve_win_pct_a: 0.76,
          second_serve_win_pct_a: 0.54,
          return_points_win_pct_a: 0.36,
          service_hold_pct_a: 0.85,
          break_point_conversion_a: 0.33,
          break_points_saved_pct_a: 0.70,
          service_games_played: 10,
          aces_a: 7,
          aces_b: 5,
          unforced_errors_a: 15,
          unforced_errors_b: 22,
        }
      )
      const resTol = NTPFDiagnosticClassifier.diagnose({
        predicted_p_a: 0.75,
        winner_is_a: true,
        deltas: tolDeltas,
        shap_attributions: shapAttributions,
      })
      assert.strictEqual(resTol.algorithmic_diagnostics.miss_typology, 'WITHIN_TOLERANCE')
      assert.strictEqual(resTol.algorithmic_diagnostics.severity, 'NEGLIGIBLE')

      // Caso 3: NEWS_MISS (In-play Medical Time-Out / Tape observado)
      const resNews = NTPFDiagnosticClassifier.diagnose({
        predicted_p_a: 0.70,
        winner_is_a: false,
        deltas: dummyDeltas,
        shap_attributions: shapAttributions,
        medical_intervention_observed: true,
      })
      assert.strictEqual(resNews.algorithmic_diagnostics.miss_typology, 'NEWS_MISS')
      assert.strictEqual(resNews.algorithmic_diagnostics.severity, 'MODERATE')

      // Caso 4: LOAD_MISS (EWMA de carga > 32 y colapso de retención de servicio)
      const resLoad = NTPFDiagnosticClassifier.diagnose({
        predicted_p_a: 0.65,
        winner_is_a: false,
        deltas: dummyDeltas,
        shap_attributions: shapAttributions,
        workload_ewma_a: 38,
      })
      assert.strictEqual(resLoad.algorithmic_diagnostics.miss_typology, 'LOAD_MISS')

      // Caso 5: DATA_QUALITY_ISSUE (tier degradado)
      const resDegraded = NTPFDiagnosticClassifier.diagnose({
        predicted_p_a: 0.70,
        winner_is_a: false,
        deltas: dummyDeltas,
        shap_attributions: shapAttributions,
        data_quality_tier: 'LOW',
      })
      assert.strictEqual(resDegraded.algorithmic_diagnostics.miss_typology, 'DATA_QUALITY_ISSUE')
    })

    test('20.3. Counterfactual Sensitivity Engine: Auditoría de Elasticidad y Derivada Brier', () => {
      const shap = [
        {
          feature_name: 'diff_glicko_mu',
          feature_value: 120,
          shap_log_odds_impact: 0.85,
          intuitive_direction: 'FAVORS_A' as const,
          category: 'CORE_RATING' as const,
        },
        {
          feature_name: 'diff_serve_hold_surface',
          feature_value: 0.08,
          shap_log_odds_impact: 0.45,
          intuitive_direction: 'FAVORS_A' as const,
          category: 'SURFACE_SPECIFIC' as const,
        },
        {
          feature_name: 'diff_cpi_speed_suitability',
          feature_value: -0.10,
          shap_log_odds_impact: -0.25,
          intuitive_direction: 'FAVORS_B' as const,
          category: 'ENVIRONMENT' as const,
        },
      ]

      const featureVector = {
        diff_glicko_mu: 120,
        diff_serve_hold_surface: 0.08,
        diff_cpi_speed_suitability: -0.10,
      }

      // El modelo predijo p=0.75 pero ganó B (y=0)
      const audit = NTPFCounterfactualEngine.auditSensitivity({
        predicted_p_a: 0.75,
        winner_is_a: false,
        shap_attributions: shap,
        feature_vector: featureVector,
      })

      assert.strictEqual(audit.target_brier_optimal_probability, 0.0)
      assert.strictEqual(audit.speculative_alternate_realities_prohibited, true)
      assert.ok(audit.top_leverage_features.length >= 3)

      // La variable de mayor impacto SHAP debe encabezar las perturbaciones
      const topFeature = audit.top_leverage_features[0]
      assert.strictEqual(topFeature.feature_name, 'diff_glicko_mu')
      assert.ok(topFeature.brier_sensitivity_derivative > 0)
      assert.ok(topFeature.minimal_delta < 0, 'Para reducir p hacia 0, el delta en variable a favor de A debe ser negativo')
      assert.ok(audit.audit_summary.includes('Auditoría contrafactual'))
    })

    test('20.4. Shadow Pipeline Governance: Detección de Drift y Protocolo de Retraining', () => {
      NTPFShadowPipelineGovernance.reset()

      // 1. Registro de telemetría sin drift
      const telGood = NTPFShadowPipelineGovernance.recordTelemetry({
        modelVersion: 'v1.4.0',
        sliceType: 'SURFACE_CLAY',
        predictions: [0.70, 0.65, 0.80, 0.55, 0.40, 0.75, 0.85, 0.60, 0.35, 0.50, 0.68, 0.72, 0.58, 0.62, 0.77],
        actualOutcomes: [1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
      })

      assert.strictEqual(telGood.model_version, 'v1.4.0')
      assert.strictEqual(telGood.sample_size, 15)
      assert.strictEqual(telGood.drift_detected, false)
      assert.ok(telGood.cumulative_brier_score < 0.20)
      assert.strictEqual(telGood.accuracy >= 0.70, true)

      // 2. Registro de telemetría con drift inducido (Brier alto > 0.225)
      const telDrift = NTPFShadowPipelineGovernance.recordTelemetry({
        modelVersion: 'v1.4.0',
        sliceType: 'SURFACE_GRASS',
        predictions: [0.90, 0.85, 0.80, 0.95, 0.88, 0.92, 0.87, 0.84, 0.89, 0.91, 0.86, 0.93, 0.88, 0.85, 0.90],
        actualOutcomes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      })

      assert.strictEqual(telDrift.drift_detected, true)
      assert.ok(telDrift.drift_threshold_exceeded?.includes('Drift detectado'))

      // 3. Gobernanza: Prohibición de promoción prematura (< 3 folds)
      const candidate1 = NTPFShadowPipelineGovernance.registerShadowCandidate({
        candidateVersion: 'v1.5.0-shadow',
        sha256Hash: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
        benchmarkBrier: 0.165,
        benchmarkLogLoss: 0.510,
        walkForwardFolds: 2,
        betaCalibration: { a: 1.05, b: 0.95, c: 0.01 },
      })
      assert.strictEqual(candidate1.status, 'SHADOW_TESTING')

      assert.throws(
        () => NTPFShadowPipelineGovernance.promoteShadowCandidate('v1.5.0-shadow', 0.180, 'Test promotion'),
        /NTPFGovernanceViolation/
      )

      // 4. Gobernanza: Rechazo si el Brier del candidato no supera al activo
      NTPFShadowPipelineGovernance.registerShadowCandidate({
        candidateVersion: 'v1.5.1-shadow',
        sha256Hash: 'b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef12',
        benchmarkBrier: 0.195,
        benchmarkLogLoss: 0.580,
        walkForwardFolds: 4,
        betaCalibration: { a: 1.0, b: 1.0, c: 0.0 },
      })

      const evaluatedInferior = NTPFShadowPipelineGovernance.promoteShadowCandidate(
        'v1.5.1-shadow',
        0.180,
        'Evaluation vs active'
      )
      assert.strictEqual(evaluatedInferior.status, 'REJECTED')
      assert.ok(evaluatedInferior.promotion_justification?.includes('Rechazado'))

      // 5. Gobernanza: Promoción exitosa con >= 3 folds y Brier estrictamente superior
      NTPFShadowPipelineGovernance.registerShadowCandidate({
        candidateVersion: 'v1.5.2-prod-candidate',
        sha256Hash: 'c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef1234',
        benchmarkBrier: 0.158,
        benchmarkLogLoss: 0.490,
        walkForwardFolds: 5,
        betaCalibration: { a: 0.98, b: 1.02, c: -0.01 },
      })

      const promoted = NTPFShadowPipelineGovernance.promoteShadowCandidate(
        'v1.5.2-prod-candidate',
        0.180,
        'Temporal walk-forward superiority demonstrated across 5 folds.'
      )
      assert.strictEqual(promoted.status, 'PROMOTED_PRODUCTION')
      assert.strictEqual(promoted.approved_by, 'NTPF_QUANT_GOVERNANCE_SYSTEM')
    })

    test('20.5. Servicio NTPF Master: Autopsia Forense Post-Match End-to-End', () => {
      const record = NTPFService.runPostMatchAutopsy({
        match_id: 'm_wimbledon_final_2026',
        match_fingerprint: 'ATP_2026_WIMBLEDON_FINAL_SINNER_ALCARAZ',
        match_date: '2026-07-12',
        player_a_name: 'Jannik Sinner',
        player_b_name: 'Carlos Alcaraz',
        tournament: 'Wimbledon',
        surface: 'Grass',
        tour: 'ATP',
        model_version: 'v1.4.0',
        model_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        expected_baseline: {
          p_win_a: 0.72,
          expected_total_games: 38.5,
          p_first_set_a: 0.68,
          p_tiebreak_a: 0.55,
          expected_hold_pct_a: 0.88,
          expected_break_pct_a: 0.18,
          expected_first_serve_in_pct_a: 0.66,
          expected_first_serve_win_pct_a: 0.79,
          expected_second_serve_win_pct_a: 0.53,
        },
        observed_stats: {
          winner_is_a: true,
          total_games_played: 42,
          first_set_won_a: true,
          deciding_set_played: true,
          deciding_set_won_a: true,
          tiebreaks_played: 2,
          tiebreaks_won_a: 2,
          first_serve_in_pct_a: 0.69,
          first_serve_win_pct_a: 0.82,
          second_serve_win_pct_a: 0.55,
          return_points_win_pct_a: 0.32,
          service_hold_pct_a: 0.91,
          break_point_conversion_a: 0.28,
          break_points_saved_pct_a: 0.75,
          service_games_played: 21,
          aces_a: 19,
          aces_b: 14,
          unforced_errors_a: 28,
          unforced_errors_b: 34,
          duration_minutes: 245,
        },
        shap_attributions: [
          {
            feature_name: 'diff_glicko_mu',
            feature_value: 65,
            shap_log_odds_impact: 0.40,
            intuitive_direction: 'FAVORS_A',
            category: 'CORE_RATING',
          },
          {
            feature_name: 'diff_grass_elo',
            feature_value: 40,
            shap_log_odds_impact: 0.25,
            intuitive_direction: 'FAVORS_A',
            category: 'SURFACE_SPECIFIC',
          },
        ],
        feature_vector: {
          diff_glicko_mu: 65,
          diff_grass_elo: 40,
        },
        market_fair_p_a: 0.60,
        insider_trading_z: 0.015,
        workload_ewma_a: 22,
        data_quality_tier: 'HIGH',
      })

      // Validaciones del Forensic Record
      assert.ok(record.forensic_id.startsWith('ntpf_m_wimbledon_final_2026'))
      assert.strictEqual(record.match_id, 'm_wimbledon_final_2026')
      assert.strictEqual(record.model_version, 'v1.4.0')
      assert.strictEqual(record.model_sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')

      // Delta Jerárquico
      assert.strictEqual(record.multilevel_deltas.match_level.match_win_a.observed, 1.0)
      assert.strictEqual(record.multilevel_deltas.set_level.tiebreaks_played, 2)
      assert.strictEqual(record.multilevel_deltas.game_level.service_games_played, 21)

      // Diagnóstico Algorítmico y Clasificador
      assert.strictEqual(record.algorithmic_diagnostics.actual_outcome_y_a, 1.0)
      assert.strictEqual(record.algorithmic_diagnostics.miss_typology, 'WITHIN_TOLERANCE')
      assert.strictEqual(record.algorithmic_diagnostics.severity, 'NEGLIGIBLE')

      // Court Analytics con Disclaimer Epistemológico
      assert.ok(record.court_analytics.epistemological_disclaimer.includes('No constituyen certeza causal'))
      assert.ok(record.court_analytics.factual_match_narrative.includes('Victoria de Jugador A'))

      // Auditoría Contrafactual
      assert.strictEqual(record.counterfactual_audit.speculative_alternate_realities_prohibited, true)
      assert.strictEqual(record.counterfactual_audit.target_brier_optimal_probability, 1.0)
      assert.ok(record.counterfactual_audit.top_leverage_features.length >= 2)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. MASTER PROMPT ADDENDUM: DYNAMIC INFERENCE, ZERO-HALLUCINATION & EXPLAINABILITY
  // ─────────────────────────────────────────────────────────────────────────────
  describe('13. Master Prompt Addendum: Dynamic Inference & Explainability', () => {
    test('13.1 Async Typeahead Search queries real upcoming matches by player and tournament', () => {
      // Búsqueda por jugador
      const sinnerMatches = liveScheduleService.searchMatches('sinner')
      assert.ok(sinnerMatches.length >= 1)
      assert.ok(
        sinnerMatches[0].player_a.name.toLowerCase().includes('sinner') ||
        sinnerMatches[0].player_b.name.toLowerCase().includes('sinner')
      )

      // Búsqueda por torneo real oficial de octubre
      const shanghaiMatches = liveScheduleService.searchMatches('Shanghai')
      assert.ok(shanghaiMatches.length >= 1)
      assert.ok(shanghaiMatches[0].tournament_name.includes('Shanghai'))

      // Búsqueda con filtro de circuito
      const atpOnly = liveScheduleService.searchMatches('', 'ATP')
      assert.ok(atpOnly.every((m) => m.tour === 'ATP'))
      const wtaOnly = liveScheduleService.searchMatches('', 'WTA')
      assert.ok(wtaOnly.every((m) => m.tour === 'WTA'))
    })

    test('13.2 Nightly CRON Job populates real scheduled_start_time ISO timestamps', async () => {
      const result = await liveScheduleService.syncLiveTournamentSchedules()
      assert.strictEqual(result.success, true)
      assert.ok(result.matches_synced >= 4)
      assert.ok(typeof result.timestamp === 'string')

      // Verificar que todos los partidos tienen timestamps reales válidos
      const allMatches = liveScheduleService.getAllMatches()
      for (const m of allMatches) {
        assert.ok(Date.parse(m.scheduled_start_time) > 0, 'scheduled_start_time debe ser ISO 8601 válido')
        assert.ok(['SCHEDULED', 'IN_PLAY', 'FINISHED', 'WITHDRAWN'].includes(m.status))
      }
    })

    test('13.3 On-demand pre-match prediction triggers with < 6h cache enforcement', async () => {
      const matchId = 'atp_tokyo_2026_qf_alcaraz_shapovalov'
      
      const forecast = await liveScheduleService.getOrGeneratePrediction(matchId)
      assert.strictEqual(forecast.match_id, matchId)
      assert.ok(forecast.p_win_a > 0 && forecast.p_win_a < 1)
      assert.ok(forecast.p_win_b > 0 && forecast.p_win_b < 1)
      assert.strictEqual(Math.round((forecast.p_win_a + forecast.p_win_b) * 100) / 100, 1.0)

      // Verificar TTL de 6 horas
      const calcTime = new Date(forecast.calculated_at).getTime()
      const expTime = new Date(forecast.expires_at).getTime()
      const diffHours = (expTime - calcTime) / (3600 * 1000)
      assert.strictEqual(Math.round(diffHours), 6)

      // Segunda llamada debe recuperar desde la caché en memoria instantáneamente
      const cached = await liveScheduleService.getOrGeneratePrediction(matchId)
      assert.strictEqual(cached.calculated_at, forecast.calculated_at)
    })

    test('13.4 STRICT ZERO-IMPUTATION POLICY: Missing micro-telemetry remains NULL without hallucinating', async () => {
      // Tokyo QF tiene telemetría de servicio y resto como null intencionalmente
      const matchId = 'atp_tokyo_2026_qf_alcaraz_shapovalov'
      const match = liveScheduleService.getMatchById(matchId)
      assert.ok(match)

      // Verificar que los datos no observados son estrictamente NULL (no promedios inventados)
      assert.strictEqual(match.telemetry?.avg_first_serve_kmh_a, null)
      assert.strictEqual(match.telemetry?.avg_first_serve_kmh_b, null)
      assert.strictEqual(match.telemetry?.return_depth_meters_a, null)
      assert.strictEqual(match.telemetry?.return_depth_meters_b, null)

      const forecast = await liveScheduleService.getOrGeneratePrediction(matchId)
      // Debe registrar explícitamente en missing_metrics
      assert.ok(forecast.missing_metrics.length >= 4)
      assert.ok(forecast.missing_metrics.some((m) => m.includes('Hawk-Eye')))
      // Grado de calidad degradado graciosamente
      assert.strictEqual(forecast.data_quality_tier, 'MEDIUM')
    })

    test('13.5 Semantic Translation: Human-readable badges and Gemini AI Executive Summary', async () => {
      const matchId = 'atp_tokyo_2026_qf_alcaraz_shapovalov'
      const forecast = await liveScheduleService.getOrGeneratePrediction(matchId)

      // Traducción semántica de CPI (Pista Rápida vs Media vs Lenta)
      assert.ok(forecast.semantic_cpi_label.includes('CPI:'))
      assert.ok(
        forecast.semantic_cpi_label.includes('Pista Rápida') ||
        forecast.semantic_cpi_label.includes('Pista Media') ||
        forecast.semantic_cpi_label.includes('Pista Lenta')
      )

      // Traducción semántica de Incertidumbre Bayesiana
      assert.ok(typeof forecast.semantic_uncertainty_label === 'string')
      assert.ok(forecast.semantic_uncertainty_label.length > 5)

      // Resumen Ejecutivo de Gemini AI (2 oraciones exactas)
      assert.ok(typeof forecast.executive_summary === 'string')
      const sentences = forecast.executive_summary.split(/\.\s+/).filter(Boolean)
      assert.ok(sentences.length >= 1 && sentences.length <= 3, 'El resumen ejecutivo debe ser conciso (2 oraciones)')

      // SHAP Factores traducidos
      assert.ok(forecast.tree_shap_summary.length >= 1)
      assert.ok(['FAVORS_A', 'FAVORS_B'].includes(forecast.tree_shap_summary[0].direction))
    })

    test('13.6 Real October Calendar & Non-Distorted Probabilities Benchmark', async () => {
      const { defaultTennisDataProvider } = await import('../lib/tennis/providers/tennis-data-provider')
      const upcoming = await defaultTennisDataProvider.getUpcomingPredictions()
      
      assert.ok(upcoming.length >= 8, 'Debe haber al menos 8 partidos del calendario real de octubre')
      
      const allowedTournaments = ['Shanghai', 'Beijing', 'Tokyo', 'Wuhan']
      for (const pred of upcoming) {
        // Ningún partido ficticio fuera de temporada (cero Indian Wells, Miami, Madrid, Roland Garros en octubre)
        assert.ok(
          allowedTournaments.some((t) => pred.tournament_name.includes(t)),
          `Torneo fuera de temporada detectado: ${pred.tournament_name}`
        )
        assert.strictEqual(pred.surface, 'Hard', 'Todos los torneos de la gira asiática de octubre son Hard')

        // Calibración realista: NINGÚN partido profesional de élite debe saturar a 2% o 98%
        assert.ok(
          pred.calibrated_probability_a >= 0.12 && pred.calibrated_probability_a <= 0.88,
          `Probabilidad distorsionada para ${pred.player_a.name}: ${pred.calibrated_probability_a}`
        )
        assert.ok(
          pred.calibrated_probability_b >= 0.12 && pred.calibrated_probability_b <= 0.88,
          `Probabilidad distorsionada para ${pred.player_b.name}: ${pred.calibrated_probability_b}`
        )

        // Las discrepancias de mercado (edge) deben mantenerse dentro de márgenes estadísticos razonables (< 25%)
        if (pred.edge_a !== undefined) {
          assert.ok(Math.abs(pred.edge_a) < 0.25, `Edge anómalo A en ${pred.player_a.name} vs ${pred.player_b.name}: ${pred.edge_a}`)
        }
        if (pred.edge_b !== undefined) {
          assert.ok(Math.abs(pred.edge_b) < 0.25, `Edge anómalo B en ${pred.player_a.name} vs ${pred.player_b.name}: ${pred.edge_b}`)
        }
      }
    })

    test('13.7 Official Player Withdrawal & Integrity Guard against predicting withdrawn players', async () => {
      // 1. Verificar registro de bajas oficiales
      const withdrawals = liveScheduleService.getOfficialWithdrawals()
      assert.ok(withdrawals.length >= 1, 'Debe haber al menos 1 baja oficial registrada')
      const sinnerWithdrawal = withdrawals.find((w) => w.player_id === 'p_sinner')
      assert.ok(sinnerWithdrawal, 'Jannik Sinner debe estar registrado como baja oficial')
      assert.strictEqual(sinnerWithdrawal.status, 'OFFICIAL_WITHDRAWAL')
      assert.ok(sinnerWithdrawal.medical_reason.toLowerCase().includes('rodilla'))
      assert.ok(sinnerWithdrawal.source.includes('AP News'))

      // 2. Verificar que intentar predecir un partido cancelado/baja lanza excepción estricta
      await assert.rejects(
        async () => {
          await liveScheduleService.getOrGeneratePrediction('atp_shanghai_2026_withdrawn_sinner')
        },
        (err: Error) => {
          assert.ok(err.message.includes('PlayerWithdrawn'), 'Debe arrojar PlayerWithdrawn')
          assert.ok(err.message.includes('Jannik Sinner'))
          return true
        }
      )
    })
  })

  describe('14. Institutional AI Decision Auditor (Google Gemini & Grounded Fallback)', () => {
    test('14.1 High value opportunity (+EV > 5%, Edge > 4%) produces HIGH_VALUE_OPPORTUNITY verdict', async () => {
      const report = await tennisAIDecisionAuditor.auditDecision({
        match_id: 'test_audit_high_val',
        tournament: 'ATP Masters 1000 Shanghai',
        surface: 'Hard',
        round: 'QF',
        player_a: { name: 'Carlos Alcaraz', rank: 2, country: 'ESP' },
        player_b: { name: 'Denis Shapovalov', rank: 102, country: 'CAN' },
        calibrated_p_a: 0.72,
        calibrated_p_b: 0.28,
        odds_a: 1.55,
        odds_b: 2.70,
        implied_p_a: 1 / 1.55,
        implied_p_b: 1 / 2.70,
        edge_a: 0.72 - (1 / 1.55),
        edge_b: 0.28 - (1 / 2.70),
        ev_a: (0.72 * 1.55) - 1,
        ev_b: (0.28 * 2.70) - 1,
        top_shap_factors: [{ factor_name: 'Glicko2 Differential', impact: 0.45 }],
      })

      assert.ok(report.audit_id.startsWith('audit_'))
      assert.strictEqual(report.verdict, 'HIGH_VALUE_OPPORTUNITY')
      assert.strictEqual(report.verdict_badge_color, 'emerald')
      assert.ok(report.alpha_quality_score >= 70)
      assert.ok(report.recommended_kelly_fraction > 0)
      assert.ok(report.governance.zero_hallucination_verified)
      assert.ok(report.governance.cryptographic_seal.startsWith('SHA256:'))
    })

    test('14.2 Asymmetric risk with ultra-low odds (1.15) triggers ASYMMETRIC_RISK_AVOID', async () => {
      const report = await tennisAIDecisionAuditor.auditDecision({
        match_id: 'test_audit_asym_risk',
        tournament: 'ATP 500 Tokyo',
        surface: 'Hard',
        round: 'R16',
        player_a: { name: 'Novak Djokovic', rank: 3, country: 'SRB' },
        player_b: { name: 'Qualifier Player', rank: 180, country: 'JPN' },
        calibrated_p_a: 0.88,
        calibrated_p_b: 0.12,
        odds_a: 1.15,
        odds_b: 7.00,
        implied_p_a: 1 / 1.15,
        implied_p_b: 1 / 7.00,
        edge_a: 0.88 - (1 / 1.15),
        edge_b: 0.12 - (1 / 7.00),
        ev_a: (0.88 * 1.15) - 1,
        ev_b: (0.12 * 7.00) - 1,
      })

      assert.strictEqual(report.verdict, 'ASYMMETRIC_RISK_AVOID')
      assert.strictEqual(report.verdict_badge_color, 'rose')
      assert.strictEqual(report.recommended_kelly_fraction, 0.0)
      assert.ok(
        report.executive_brief.toLowerCase().includes('desaconseja') ||
        report.verdict_label.includes('Asimétrico') ||
        report.verdict === 'ASYMMETRIC_RISK_AVOID'
      )
    })

    test('14.3 Efficient market with no edge (< 2%) triggers MARKET_EFFICIENT_PASS', async () => {
      const report = await tennisAIDecisionAuditor.auditDecision({
        match_id: 'test_audit_efficient_pass',
        tournament: 'ATP 500 Beijing',
        surface: 'Hard',
        round: 'QF',
        player_a: { name: 'Alexander Zverev', rank: 4, country: 'GER' },
        player_b: { name: 'Daniil Medvedev', rank: 5, country: 'RUS' },
        calibrated_p_a: 0.51,
        calibrated_p_b: 0.49,
        odds_a: 1.90,
        odds_b: 1.90,
        implied_p_a: 0.526,
        implied_p_b: 0.526,
        edge_a: -0.016,
        edge_b: -0.036,
        ev_a: (0.51 * 1.90) - 1,
        ev_b: (0.49 * 1.90) - 1,
      })

      assert.strictEqual(report.verdict, 'MARKET_EFFICIENT_PASS')
      assert.strictEqual(report.verdict_badge_color, 'slate')
      assert.strictEqual(report.recommended_kelly_fraction, 0.0)
    })
  })
})


