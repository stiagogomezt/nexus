// ============================================================
// NEXUS FINANCE — Financial Intelligence Engine
// Synthesizes detected events into:
// 1. Structured Insights (DATO + CAMBIO + INTERPRETACIÓN)
// 2. Prioritized Issues (Liquidez, Deuda, Presupuesto, Metas, etc.)
// 3. Domain-specific Intelligence (Crypto, Betting, Liquidity, Debt, Goals)
// Strictly non-speculative, grounded in verifiable observables.
// ============================================================

import type { FinancialState, FinancialSnapshot } from '@/types/digital-twin'
import type {
  FinancialEvent,
  IntelligenceInsight,
  PrioritizedIssue,
  EventCategory,
  AlertSeverity,
} from '@/types/intelligence'
import type { Budget, Goal, Debt } from '@/types'
import { EventEngine, EventEngineContext } from './event-engine'

export class IntelligenceEngine {
  /**
   * Generates structured insights from FinancialState, historical snapshot, and detected events.
   * Differentiates strictly between:
   * - DATO (verifiable factual metric)
   * - CAMBIO (quantitative delta)
   * - INTERPRETACIÓN (grounded analysis without assuming unfounded causality)
   */
  static generateInsights(
    state: FinancialState,
    baseline?: FinancialSnapshot | null,
    events: FinancialEvent[] = []
  ): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = []
    const now = new Date().toISOString()
    const userId = state.identity.userId || 'usr-kevin-001'

    // 1. Net Worth Evolution Insight
    if (baseline && baseline.net_worth > 0) {
      const prevNw = baseline.net_worth
      const currNw = state.netWorth.netWorth
      const nwDelta = currNw - prevNw
      const nwPct = Number(((nwDelta / prevNw) * 100).toFixed(1))

      let driver = 'la acumulación sostenida de flujo operativo'
      if (state.crypto.totalCryptoCop > (baseline.crypto_assets || 0) * 1.2) {
        driver = 'la revalorización observable de las tenencias cripto'
      } else if (state.debts.totalDebt < (baseline.total_debt || 0)) {
        driver = 'la amortización de pasivos en tarjetas y créditos'
      }

      insights.push({
        id: `ins_nw_${Date.now()}`,
        user_id: userId,
        area: 'net_worth',
        fact: `Patrimonio neto actual: $${currNw.toLocaleString('es-CO')}. Total activos: $${state.assets.totalAssets.toLocaleString('es-CO')}, Total pasivos: $${state.liabilities.totalLiabilities.toLocaleString('es-CO')}.`,
        change: `Variación de ${nwPct >= 0 ? '+' : ''}${nwPct}% ($${Math.abs(nwDelta).toLocaleString('es-CO')}) respecto al período anterior ($${prevNw.toLocaleString('es-CO')}).`,
        interpretation: `La variación observable coincide principalmente con ${driver}, reflejando la dinámica neta entre activos acumulados y pasivos amortizados.`,
        confidence: 'high',
        impact: nwPct >= 0 ? 'positive' : 'negative',
        timestamp: now,
      })
    }

    // 2. Liquidity & Cash Flow Margin Insight
    const liquid = state.liquidity.totalLiquid
    const runway = state.liquidity.runwayMonths
    const cashFlow = state.cashFlow.netOperatingCashFlow
    insights.push({
      id: `ins_liq_${Date.now()}`,
      user_id: userId,
      area: 'liquidity',
      fact: `Disponibilidad líquida de $${liquid.toLocaleString('es-CO')}, equivalente a ${runway} meses de cobertura de gastos esenciales. Flujo de caja operativo mensual: $${cashFlow.toLocaleString('es-CO')}.`,
      change: `Tasa de ahorro mensual registrada: ${state.cashFlow.savingsRate}%.`,
      interpretation:
        runway >= 3
          ? 'El colchón de liquidez proporciona estabilidad frente a contingencias sin comprometer el capital de trabajo.'
          : `El nivel de liquidez actual ($${liquid.toLocaleString('es-CO')}) sugiere priorizar la acumulación de flujo libre hacia el fondo de emergencia para cubrir la brecha de $${state.liquidity.emergencyFundGap.toLocaleString('es-CO')}.`,
      confidence: 'high',
      impact: runway >= 3 ? 'positive' : runway >= 1.5 ? 'neutral' : 'negative',
      timestamp: now,
    })

    // 3. Dual Income Dynamics Insight
    if (state.income.shuffler > 0 || state.income.pizzaHut > 0) {
      const primaryName = state.identity.primaryIncomeSource || 'Fuente Principal'
      const secondaryName = state.identity.secondaryIncomeSource || 'Fuente Secundaria'
      const shufflerPct = Math.round((state.income.shuffler / Math.max(1, state.income.total)) * 100)
      const pizzaHutPct = Math.round((state.income.pizzaHut / Math.max(1, state.income.total)) * 100)
      insights.push({
        id: `ins_inc_${Date.now()}`,
        user_id: userId,
        area: 'income',
        fact: `Ingreso total registrado: $${state.income.total.toLocaleString('es-CO')}. ${primaryName}: $${state.income.shuffler.toLocaleString('es-CO')} (${shufflerPct}%). ${secondaryName}: $${state.income.pizzaHut.toLocaleString('es-CO')} (${pizzaHutPct}%).`,
        change: `Diversificación de ingresos en fuentes laborales activas registradas.`,
        interpretation: `La estructura de fuentes activas otorga estabilidad al flujo de caja. Si los excedentes se asignan con disciplina al ahorro o a amortización, la aceleración de metas patrimoniales se optimiza significativamente.`,
        confidence: 'high',
        impact: 'positive',
        timestamp: now,
      })
    }

    // 4. Crypto Market Evaluation (Price vs Holding Value)
    if (state.crypto.holdingsCount > 0) {
      insights.push({
        id: `ins_crypto_${Date.now()}`,
        user_id: userId,
        area: 'crypto',
        fact: `Valoración del portafolio cripto: $${state.crypto.totalCryptoCop.toLocaleString('es-CO')} COP ($${state.crypto.totalCryptoUsd.toLocaleString('es-CO')} USD) distribuidos en ${state.crypto.holdingsCount} activos y ${state.crypto.walletsCount} billeteras on-chain auditadas.`,
        change: `P&L no realizado acumulado en COP: $${state.crypto.unrealizedPnlCop.toLocaleString('es-CO')}.`,
        interpretation: `Es indispensable distinguir entre precio spot de mercado y valor consolidado de la tenencia. Las fluctuaciones en valoración no constituyen ganancias ni pérdidas realizadas hasta que no se ejecute una liquidación voluntaria.`,
        confidence: 'high',
        impact: 'neutral',
        timestamp: now,
      })
    }

    // 5. Betting Module Isolation Insight
    if (state.betting.totalStaked > 0) {
      insights.push({
        id: `ins_bet_${Date.now()}`,
        user_id: userId,
        area: 'betting',
        fact: `Monto total apostado en el período: $${state.betting.totalStaked.toLocaleString('es-CO')}. Retorno obtenido: $${state.betting.totalReturned.toLocaleString('es-CO')}. Resultado neto: $${state.betting.netProfit.toLocaleString('es-CO')}.`,
        change: `Impacto en el flujo de caja: representa el ${state.betting.cashFlowImpactPercent}% del ingreso mensual.`,
        interpretation: `El módulo de apuestas se mantiene rigurosamente segregado de la cartera de inversión contable (isInvestment: false). Se recomienda delimitar un presupuesto de entretenimiento que impida cualquier afectación al flujo libre destinado a metas.`,
        confidence: 'high',
        impact: state.betting.cashFlowImpactPercent > 10 ? 'negative' : 'neutral',
        timestamp: now,
      })
    }

    return insights
  }

  /**
   * Prioritizes financial issues classified by the 7 required financial domains.
   * Avoids simplistic, arbitrary single scores.
   */
  static prioritizeIssues(
    events: FinancialEvent[],
    state: FinancialState
  ): PrioritizedIssue[] {
    const issues: PrioritizedIssue[] = []

    const areaLabels: Record<EventCategory, string> = {
      liquidity: 'Liquidez & Cobertura',
      debt: 'Deuda & Carga Financiera',
      budget: 'Presupuestos de Gasto',
      goal: 'Metas & Ahorro',
      net_worth: 'Patrimonio Neto',
      crypto: 'Criptoactivos & Web3',
      investment: 'Inversiones',
      income: 'Ingresos & Empleo',
      expense: 'Gastos Operativos',
      banking: 'Banca & Open Finance',
      betting: 'Apuestas & Recreación',
    }

    // Rank events by severity weight: CRITICAL (3) > WARNING (2) > INFO (1)
    const severityRank: Record<AlertSeverity, number> = {
      CRITICAL: 3,
      WARNING: 2,
      INFO: 1,
    }

    const sortedEvents = [...events].sort(
      (a, b) => severityRank[b.severity] - severityRank[a.severity]
    )

    for (const evt of sortedEvents) {
      let magnitude = 'Normal'
      if (evt.delta) {
        magnitude = `${evt.delta.percentageDelta > 0 ? '+' : ''}${evt.delta.percentageDelta}%`
      } else if (evt.current_value !== 0) {
        magnitude = `$${evt.current_value.toLocaleString('es-CO')}`
      }

      issues.push({
        id: `iss_${evt.id}`,
        area: evt.category,
        areaLabel: areaLabels[evt.category] || evt.category,
        event: evt.type,
        severity: evt.severity,
        magnitude,
        date: evt.timestamp.split('T')[0],
        status: 'UNREAD',
        title: evt.title,
        description: evt.description,
      })
    }

    return issues
  }
}
