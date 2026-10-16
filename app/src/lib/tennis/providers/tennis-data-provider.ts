/**
 * NEXUS TENNIS PREDICTIVE LAB — Proveedor Unificado de Datos y Partidos
 * 
 * Orquesta la carga de partidos programados, cálculo de características,
 * scoring cuantitativo, cuotas y novedades.
 * Soporta modo sin conexión y maneja elegantemente la ausencia de cuotas o noticias.
 */

import type {
  MatchOdds,
  PlayerNewsContext,
  TennisMatchPrediction,
  TennisPlayer,
  TennisSurface,
  TennisTour,
} from '../types'
import { defaultTennisDataset, TENNIS_PLAYERS_REGISTRY } from '../data/dataset-loader'
import { TennisFeaturePipeline } from '../features/feature-pipeline'
import { TennisScoringEngine } from '../scoring/scoring-engine'
import { ManualOddsProvider } from '../odds/odds-provider'
import { TennisNewsAnalyzer } from '../news/news-analyzer'

export interface UpcomingMatchFixture {
  id: string
  tournament: string
  tour: TennisTour
  surface: TennisSurface
  date: string // YYYY-MM-DD
  round: 'SF' | 'F' | 'QF' | 'R16' | 'R32' | 'R64' | 'R128'
  playerAId: string
  playerBId: string
  defaultOddsA?: number
  defaultOddsB?: number
}

export const UPCOMING_FIXTURES_BENCHMARK: UpcomingMatchFixture[] = [
  // ─── KINOSHITA GROUP JAPAN OPEN TOKYO (ATP 500 - Semifinales en Directo Hoy 4-5 Oct) ───
  // Cuartos de final concluidos: Alcaraz batió a Shapovalov, Munar batió a Jacquet, Lehecka batió a Vallejo, Vacherot batió a Fils.
  {
    id: 'fix_atp_tokyo_alcaraz_munar_2026',
    tournament: 'Kinoshita Group Japan Open Tokyo 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-04',
    round: 'SF',
    playerAId: 'p_alcaraz',
    playerBId: 'p_munar',
    defaultOddsA: 1.16,
    defaultOddsB: 5.20,
  },
  {
    id: 'fix_atp_tokyo_lehecka_vacherot_2026',
    tournament: 'Kinoshita Group Japan Open Tokyo 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-04',
    round: 'SF',
    playerAId: 'p_lehecka',
    playerBId: 'p_vacherot',
    defaultOddsA: 1.34,
    defaultOddsB: 3.25,
  },

  // ─── CHINA OPEN BEIJING (ATP 500 & WTA 1000 - Semifinales & Cuartos en Juego Hoy 4-5 Oct) ───
  {
    id: 'fix_atp_beijing_djokovic_medvedev_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-05',
    round: 'SF',
    playerAId: 'p_djokovic',
    playerBId: 'p_medvedev',
    defaultOddsA: 1.82,
    defaultOddsB: 2.00,
  },
  {
    id: 'fix_atp_beijing_deminaur_hurkacz_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-05',
    round: 'SF',
    playerAId: 'p_de_minaur',
    playerBId: 'p_hurkacz',
    defaultOddsA: 1.74,
    defaultOddsB: 2.12,
  },
  {
    id: 'fix_wta_beijing_sabalenka_krueger_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-04',
    round: 'R16',
    playerAId: 'p_sabalenka',
    playerBId: 'p_krueger',
    defaultOddsA: 1.15,
    defaultOddsB: 5.40,
  },
  {
    id: 'fix_wta_beijing_gauff_osaka_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-04',
    round: 'R16',
    playerAId: 'p_gauff',
    playerBId: 'p_osaka',
    defaultOddsA: 1.55,
    defaultOddsB: 2.45,
  },
  {
    id: 'fix_wta_beijing_zheng_anisimova_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-05',
    round: 'QF',
    playerAId: 'p_zheng',
    playerBId: 'p_anisimova',
    defaultOddsA: 1.62,
    defaultOddsB: 2.30,
  },
  {
    id: 'fix_wta_beijing_badosa_zhang_2026',
    tournament: 'China Open Beijing 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-04',
    round: 'QF',
    playerAId: 'p_badosa',
    playerBId: 'p_zhang_s',
    defaultOddsA: 1.30,
    defaultOddsB: 3.50,
  },

  // ─── ROLEX SHANGHAI MASTERS (ATP Masters 1000 - Cuadro Oficial · Inicia 5-7 Oct) ───
  // NOTA AUDITADA: Jannik Sinner causa BAJA OFICIAL por lesión en rodilla derecha.
  {
    id: 'fix_atp_shanghai_fritz_shang_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-06',
    round: 'R64',
    playerAId: 'p_fritz',
    playerBId: 'p_shang',
    defaultOddsA: 1.38,
    defaultOddsB: 3.10,
  },
  {
    id: 'fix_atp_shanghai_shelton_cobolli_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-06',
    round: 'R64',
    playerAId: 'p_shelton',
    playerBId: 'p_cobolli',
    defaultOddsA: 1.48,
    defaultOddsB: 2.65,
  },
  {
    id: 'fix_atp_shanghai_rune_berrettini_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-07',
    round: 'R64',
    playerAId: 'p_rune',
    playerBId: 'p_berrettini',
    defaultOddsA: 1.80,
    defaultOddsB: 2.02,
  },
  {
    id: 'fix_atp_shanghai_zverev_safiullin_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-07',
    round: 'R32',
    playerAId: 'p_zverev',
    playerBId: 'p_safiullin',
    defaultOddsA: 1.25,
    defaultOddsB: 3.90,
  },
  {
    id: 'fix_atp_shanghai_monfils_cobolli_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-07',
    round: 'R64',
    playerAId: 'p_monfils',
    playerBId: 'p_cobolli',
    defaultOddsA: 2.10,
    defaultOddsB: 1.75,
  },
  {
    id: 'fix_atp_shanghai_tsitsipas_goffin_2026',
    tournament: 'Rolex Shanghai Masters 2026',
    tour: 'ATP',
    surface: 'Hard',
    date: '2026-10-08',
    round: 'R32',
    playerAId: 'p_tsitsipas',
    playerBId: 'p_goffin',
    defaultOddsA: 1.55,
    defaultOddsB: 2.45,
  },

  // ─── DONGFENG VOYAH WUHAN OPEN (WTA 1000 - Inicia 7 Oct) ───
  {
    id: 'fix_wta_wuhan_swiatek_paolini_2026',
    tournament: 'Dongfeng Voyah Wuhan Open 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-10',
    round: 'SF',
    playerAId: 'p_swiatek',
    playerBId: 'p_paolini',
    defaultOddsA: 1.30,
    defaultOddsB: 3.50,
  },
  {
    id: 'fix_wta_wuhan_sabalenka_zheng_2026',
    tournament: 'Dongfeng Voyah Wuhan Open 2026',
    tour: 'WTA',
    surface: 'Hard',
    date: '2026-10-11',
    round: 'F',
    playerAId: 'p_sabalenka',
    playerBId: 'p_zheng',
    defaultOddsA: 1.52,
    defaultOddsB: 2.55,
  },
]

export class TennisLabDataProvider {
  private pipeline: TennisFeaturePipeline
  private scoringEngine: TennisScoringEngine
  private manualOddsProvider: ManualOddsProvider

  constructor() {
    this.pipeline = new TennisFeaturePipeline()
    this.scoringEngine = new TennisScoringEngine()
    this.manualOddsProvider = new ManualOddsProvider()

    // Pre-cargar cuotas benchmark iniciales
    for (const fix of UPCOMING_FIXTURES_BENCHMARK) {
      if (fix.defaultOddsA && fix.defaultOddsB) {
        this.manualOddsProvider.setManualOdds(fix.id, fix.defaultOddsA, fix.defaultOddsB)
      }
    }
  }

  public getManualOddsProvider(): ManualOddsProvider {
    return this.manualOddsProvider
  }

  public getPlayer(id: string): TennisPlayer | undefined {
    return TENNIS_PLAYERS_REGISTRY[id]
  }

  public getPlayerByName(name: string): TennisPlayer | undefined {
    return defaultTennisDataset.getPlayerByName(name)
  }

  public getAllPlayers(): TennisPlayer[] {
    return defaultTennisDataset.getAllPlayers()
  }

  /**
   * Analiza un partido específico a partir de dos jugadores, superficie y fecha
   */
  public analyzeMatch(
    playerAId: string,
    playerBId: string,
    surface: TennisSurface,
    tour: TennisTour,
    date = '2026-10-03',
    tournament = 'Torneo Profesional',
    customOdds?: { oddsA: number; oddsB: number },
    customNewsA?: PlayerNewsContext,
    customNewsB?: PlayerNewsContext
  ): TennisMatchPrediction {
    const playerA = this.getPlayer(playerAId) || {
      id: playerAId,
      name: playerAId,
      country: 'INT',
      age: 25,
    }
    const playerB = this.getPlayer(playerBId) || {
      id: playerBId,
      name: playerBId,
      country: 'INT',
      age: 25,
    }

    const allMatches = defaultTennisDataset.getMatches()
    const feat = this.pipeline.buildFeatureVector(
      playerA.id,
      playerB.id,
      date,
      surface,
      tour,
      allMatches
    )

    let odds: MatchOdds | null = null
    if (customOdds && customOdds.oddsA > 1 && customOdds.oddsB > 1) {
      odds = this.manualOddsProvider.setManualOdds(`match_${playerAId}_${playerBId}`, customOdds.oddsA, customOdds.oddsB)
    }

    return this.scoringEngine.scoreMatch(
      `match_${playerAId}_${playerBId}`,
      date,
      surface,
      tour,
      tournament,
      playerA,
      playerB,
      feat,
      odds,
      customNewsA,
      customNewsB
    )
  }

  /**
   * Obtiene todos los partidos disponibles en el panel de investigación con sus predicciones
   */
  public async getUpcomingPredictions(
    filter?: { tour?: TennisTour; surface?: TennisSurface; date?: string; minDate?: string }
  ): Promise<TennisMatchPrediction[]> {
    let fixtures = [...UPCOMING_FIXTURES_BENCHMARK]

    // Filtro estricto de integridad cronológica: excluir cualquier partido con fecha anterior a hoy (2026-10-04)
    const minDate = filter?.minDate ?? '2026-10-04'
    fixtures = fixtures.filter((f) => f.date >= minDate)

    if (filter?.tour) {
      fixtures = fixtures.filter((f) => f.tour === filter.tour)
    }
    if (filter?.surface) {
      fixtures = fixtures.filter((f) => f.surface === filter.surface)
    }
    if (filter?.date) {
      fixtures = fixtures.filter((f) => f.date === filter.date)
    }

    const predictions: TennisMatchPrediction[] = []

    for (const fix of fixtures) {
      const odds = await this.manualOddsProvider.getOdds({ matchId: fix.id })

      // Consultar contexto básico de noticias verificadas
      const newsA = TennisNewsAnalyzer.evaluatePlayerContext(
        TENNIS_PLAYERS_REGISTRY[fix.playerAId]?.name || fix.playerAId,
        []
      )
      const newsB = TennisNewsAnalyzer.evaluatePlayerContext(
        TENNIS_PLAYERS_REGISTRY[fix.playerBId]?.name || fix.playerBId,
        []
      )

      const pred = this.analyzeMatch(
        fix.playerAId,
        fix.playerBId,
        fix.surface,
        fix.tour,
        fix.date,
        fix.tournament,
        odds ? { oddsA: odds.odds_a, oddsB: odds.odds_b } : undefined,
        newsA,
        newsB
      )

      predictions.push(pred)
    }

    return predictions
  }
}

export const defaultTennisDataProvider = new TennisLabDataProvider()
