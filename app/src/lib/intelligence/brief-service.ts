// ============================================================
// NEXUS FINANCE — Financial Intelligence: Daily Brief & Weekly Review
// Prepares consolidated executive briefings for daily review
// and multi-period weekly comparative syntheses.
// Read-only, zero push notifications, strictly grounded.
// ============================================================

import type { FinancialState, FinancialSnapshot } from '@/types/digital-twin'
import type {
  DailyBrief,
  WeeklyFinancialReview,
  FinancialAlert,
  FinancialEvent,
} from '@/types/intelligence'

export class BriefService {
  /**
   * Generates a concise daily executive brief of the user's financial posture.
   */
  static generateDailyBrief(
    state: FinancialState,
    alerts: FinancialAlert[] = [],
    events: FinancialEvent[] = []
  ): DailyBrief {
    const today = new Date().toISOString().split('T')[0]
    const unreadAlerts = alerts.filter((a) => a.status === 'UNREAD')
    const criticalAlerts = unreadAlerts.filter((a) => a.severity === 'CRITICAL')

    // Recent changes from latest events
    const recentChanges = events.slice(0, 4).map((e) => e.title)
    if (recentChanges.length === 0) {
      recentChanges.push('Sin variaciones críticas detectadas en las últimas 24 horas.')
    }

    // Goals summary
    const goalsSummary =
      state.goals.totalCount > 0
        ? `${state.goals.activeCount} metas activas con avance global del ${state.goals.overallProgressPercent}% ($${state.goals.totalCurrentAmount.toLocaleString('es-CO')} de $${state.goals.totalTargetAmount.toLocaleString('es-CO')}).`
        : 'No hay metas financieras activas registradas.'

    // Debt summary
    const debtSummary =
      state.debts.totalDebt > 0
        ? `Saldo pasivo de $${state.debts.totalDebt.toLocaleString('es-CO')} (DTI: ${state.debts.debtToIncomeRatio}%). Cuota mensual estimada: $${state.debts.monthlyDebtService.toLocaleString('es-CO')}.`
        : 'Cero obligaciones financieras registradas. Nivel de endeudamiento: 0%.'

    // Crypto summary
    const cryptoSummary =
      state.crypto.holdingsCount > 0
        ? `Portafolio cripto valorado en $${state.crypto.totalCryptoCop.toLocaleString('es-CO')} COP en ${state.crypto.holdingsCount} activos.`
        : 'Sin tenencias cripto activas registradas.'

    let headline = 'Posición financiera operativa estable.'
    if (criticalAlerts.length > 0) {
      headline = `Atención prioritaria: ${criticalAlerts[0].title}.`
    } else if (state.liquidity.runwayMonths < 1.5) {
      headline = 'Alerta de liquidez: colchón de emergencia por debajo del umbral recomendado.'
    } else if (state.cashFlow.netOperatingCashFlow > 500000) {
      headline = 'Flujo de caja favorable con capacidad de ahorro activa.'
    }

    return {
      date: today,
      headline,
      financialStateSummary: {
        netWorth: state.netWorth.netWorth,
        liquidAssets: state.liquidity.totalLiquid,
        monthlyIncome: state.income.total,
        freeCashFlow: state.cashFlow.netOperatingCashFlow,
        runwayMonths: state.liquidity.runwayMonths,
      },
      recentChanges,
      activeAlertsCount: unreadAlerts.length,
      criticalAlerts,
      goalsSummary,
      debtSummary,
      cryptoSummary,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Generates a weekly financial review comparing the current week with the prior reference.
   */
  static generateWeeklyReview(
    currentState: FinancialState,
    baselineSnapshot?: FinancialSnapshot | null
  ): WeeklyFinancialReview {
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startDate = lastWeek.toISOString().split('T')[0]
    const endDate = today.toISOString().split('T')[0]
    const weekLabel = `Semana del ${startDate} al ${endDate}`

    const prevIncome = baselineSnapshot?.monthly_income || currentState.income.total
    const prevExpenses = baselineSnapshot?.monthly_expenses || currentState.expenses.total
    const prevSavings = baselineSnapshot ? (baselineSnapshot.monthly_income - baselineSnapshot.monthly_expenses) : currentState.savings.monthlySavings
    const prevDebt = baselineSnapshot?.total_debt || currentState.debts.totalDebt
    const prevNw = baselineSnapshot?.net_worth || currentState.netWorth.netWorth
    const prevCrypto = baselineSnapshot?.crypto_assets || currentState.crypto.totalCryptoCop

    const incomeDelta = this.calcMetricDelta(currentState.income.total, prevIncome)
    const expensesDelta = this.calcMetricDelta(currentState.expenses.total, prevExpenses)
    const savingsDelta = this.calcMetricDelta(currentState.savings.monthlySavings, prevSavings)
    const debtDelta = this.calcMetricDelta(currentState.debts.totalDebt, prevDebt)
    const netWorthDelta = this.calcMetricDelta(currentState.netWorth.netWorth, prevNw)
    const cryptoDelta = this.calcMetricDelta(currentState.crypto.totalCryptoCop, prevCrypto)

    const highlights: string[] = []
    if (netWorthDelta.deltaPct > 0) {
      highlights.push(`Patrimonio neto aumentó +${netWorthDelta.deltaPct}% frente al período de referencia.`)
    } else if (netWorthDelta.deltaPct < 0) {
      highlights.push(`Patrimonio neto retrocedió ${netWorthDelta.deltaPct}% frente a la referencia.`)
    }

    if (debtDelta.deltaPct < 0) {
      highlights.push(`Deuda amortizada en un ${Math.abs(debtDelta.deltaPct)}%.`)
    }

    if (expensesDelta.deltaPct > 15) {
      highlights.push(`Aumento de gastos del +${expensesDelta.deltaPct}% requiere seguimiento de presupuestos.`)
    }

    if (!baselineSnapshot) {
      highlights.length = 0
      highlights.push('Datos históricos insuficientes para calcular variaciones porcentuales semanales.')
    } else if (highlights.length === 0) {
      highlights.push('Comportamiento financiero alineado con la media histórica semanal.')
    }

    const executiveSummary = `Durante esta semana, tus ingresos totalizaron $${currentState.income.total.toLocaleString('es-CO')} frente a gastos de $${currentState.expenses.total.toLocaleString('es-CO')}, dejando un flujo neto de $${currentState.cashFlow.netOperatingCashFlow.toLocaleString('es-CO')}. Tu patrimonio neto cerró en $${currentState.netWorth.netWorth.toLocaleString('es-CO')}.`

    return {
      weekLabel,
      startDate,
      endDate,
      incomeDelta,
      expensesDelta,
      savingsDelta,
      debtDelta,
      netWorthDelta,
      cryptoDelta,
      goalsProgress: `${stateToGoalsSummary(currentState)}`,
      executiveSummary,
      highlights,
    }
  }

  private static calcMetricDelta(current: number, previous: number) {
    const delta = current - previous
    const deltaPct = previous !== 0 ? Number(((delta / Math.abs(previous)) * 100).toFixed(1)) : 0
    return {
      current,
      previous,
      deltaPct,
    }
  }
}

function stateToGoalsSummary(state: FinancialState): string {
  if (state.goals.totalCount === 0) return 'Sin metas registradas.'
  return `${state.goals.activeCount} metas activas con ${state.goals.onTrackCount} en trayectoria puntual (${state.goals.overallProgressPercent}% global).`
}
