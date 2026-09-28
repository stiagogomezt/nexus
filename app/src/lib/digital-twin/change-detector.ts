// ============================================================
// NEXUS FINANCE — Digital Twin: Financial Change Detector
// Pure quantitative comparison between financial states/snapshots.
// Zero subjective interpretation, zero hallucinations.
// ============================================================

import type {
  FinancialState,
  FinancialSnapshot,
  FinancialChanges,
  MetricDelta,
  SnapshotComparison,
} from '../../types/digital-twin'

export class FinancialChangeDetector {
  /**
   * Compares two FinancialState instances (e.g. Current Month vs Baseline Month).
   */
  static compareStates(current: FinancialState, previous: FinancialState): FinancialChanges {
    const income = this.calcDelta(current.income.total, previous.income.total)
    const expenses = this.calcDelta(current.expenses.total, previous.expenses.total)
    const netWorth = this.calcDelta(current.netWorth.netWorth, previous.netWorth.netWorth)
    const debt = this.calcDelta(current.debts.totalDebt, previous.debts.totalDebt)
    const liquidity = this.calcDelta(current.liquidity.totalLiquid, previous.liquidity.totalLiquid)
    const crypto = this.calcDelta(current.crypto.totalCryptoCop, previous.crypto.totalCryptoCop)
    const investments = this.calcDelta(
      current.investments.currentValue,
      previous.investments.currentValue
    )

    const savingsRateCurrent = current.cashFlow.savingsRate
    const savingsRatePrev = previous.cashFlow.savingsRate
    const savingsRate = {
      current: savingsRateCurrent,
      previous: savingsRatePrev,
      deltaPoints: Number((savingsRateCurrent - savingsRatePrev).toFixed(1)),
    }

    const keyFindings = this.generateQuantitativeFindings({
      income,
      expenses,
      netWorth,
      debt,
      liquidity,
      savingsRate,
    })

    const cashFlow = this.calcDelta(
      current.cashFlow.netOperatingCashFlow,
      previous.cashFlow.netOperatingCashFlow
    )
    const banking = this.calcDelta(
      current.banking.totalBalanceCop,
      previous.banking.totalBalanceCop
    )
    const goals = this.calcDelta(
      current.goals.overallProgressPercent,
      previous.goals.overallProgressPercent
    )

    return {
      income,
      expenses,
      netWorth,
      debt,
      liquidity,
      crypto,
      investments,
      cashFlow,
      banking,
      goals,
      savingsRate,
      keyFindings,
    }
  }

  /**
   * Compares a live FinancialState against a historical FinancialSnapshot.
   */
  static compareStateWithSnapshot(
    state: FinancialState,
    baseline: FinancialSnapshot
  ): FinancialChanges {
    const income = this.calcDelta(state.income.total, baseline.monthly_income)
    const expenses = this.calcDelta(state.expenses.total, baseline.monthly_expenses)
    const netWorth = this.calcDelta(state.netWorth.netWorth, baseline.net_worth)
    const debt = this.calcDelta(state.debts.totalDebt, baseline.total_debt || 0)
    const liquidity = this.calcDelta(state.liquidity.totalLiquid, baseline.liquid_assets || 0)
    const crypto = this.calcDelta(state.crypto.totalCryptoCop, baseline.crypto_assets || 0)
    const investments = this.calcDelta(
      state.investments.currentValue,
      baseline.investments_value || 0
    )
    const cashFlow = this.calcDelta(
      state.cashFlow.netOperatingCashFlow,
      baseline.free_cash_flow
    )
    const banking = this.calcDelta(
      state.banking.totalBalanceCop,
      baseline.bank_assets || 0
    )
    const goals = this.calcDelta(
      state.goals.overallProgressPercent,
      0
    )

    const savingsRateCurrent = state.cashFlow.savingsRate
    const savingsRatePrev = baseline.savings_rate_pct
    const savingsRate = {
      current: savingsRateCurrent,
      previous: savingsRatePrev,
      deltaPoints: Number((savingsRateCurrent - savingsRatePrev).toFixed(1)),
    }

    const keyFindings = this.generateQuantitativeFindings({
      income,
      expenses,
      netWorth,
      debt,
      liquidity,
      savingsRate,
    })

    return {
      income,
      expenses,
      netWorth,
      debt,
      liquidity,
      crypto,
      investments,
      cashFlow,
      banking,
      goals,
      savingsRate,
      keyFindings,
    }
  }

  /**
   * Compares a current FinancialSnapshot against a baseline historical snapshot.
   */
  static compareSnapshots(
    current: FinancialSnapshot,
    baseline: FinancialSnapshot
  ): SnapshotComparison {
    const income = this.calcDelta(current.monthly_income, baseline.monthly_income)
    const expenses = this.calcDelta(current.monthly_expenses, baseline.monthly_expenses)
    const netWorth = this.calcDelta(current.net_worth, baseline.net_worth)
    const debt = this.calcDelta(current.total_debt || 0, baseline.total_debt || 0)
    const liquidity = this.calcDelta(current.liquid_assets || 0, baseline.liquid_assets || 0)
    const crypto = this.calcDelta(current.crypto_assets || 0, baseline.crypto_assets || 0)
    const investments = this.calcDelta(
      current.investments_value || 0,
      baseline.investments_value || 0
    )
    const cashFlow = this.calcDelta(current.free_cash_flow, baseline.free_cash_flow)
    const banking = this.calcDelta(current.bank_assets || 0, baseline.bank_assets || 0)

    const savingsRateCurrent = current.savings_rate_pct
    const savingsRatePrev = baseline.savings_rate_pct
    const savingsRate = {
      current: savingsRateCurrent,
      previous: savingsRatePrev,
      deltaPoints: Number((savingsRateCurrent - savingsRatePrev).toFixed(1)),
    }

    const keyFindings = this.generateQuantitativeFindings({
      income,
      expenses,
      netWorth,
      debt,
      liquidity,
      savingsRate,
    })

    return {
      currentDate: current.snapshot_date,
      baselineDate: baseline.snapshot_date,
      changes: {
        income,
        expenses,
        netWorth,
        debt,
        liquidity,
        crypto,
        investments,
        cashFlow,
        banking,
        savingsRate,
        keyFindings,
      },
    }
  }

  /**
   * Compares current snapshot with available time-series benchmarks:
   * Mes Anterior, 2 Meses Anteriores, Año Anterior.
   */
  static compareWithHistoricalBenchmarks(
    current: FinancialSnapshot,
    snapshots: FinancialSnapshot[]
  ): {
    previousMonth: SnapshotComparison | null
    twoMonthsAgo: SnapshotComparison | null
    previousYear: SnapshotComparison | null
  } {
    const sorted = [...snapshots]
      .filter((s) => s.snapshot_date !== current.snapshot_date)
      .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))

    const prevMonthSnap = sorted[0] || null
    const twoMonthsSnap = sorted[1] || null

    // Look for snapshot ~1 year ago (e.g., date starting with previous year)
    const [currentYear] = current.snapshot_date.split('-')
    const targetPrevYear = String(parseInt(currentYear, 10) - 1)
    const prevYearSnap =
      sorted.find((s) => s.snapshot_date.startsWith(targetPrevYear)) || null

    return {
      previousMonth: prevMonthSnap ? this.compareSnapshots(current, prevMonthSnap) : null,
      twoMonthsAgo: twoMonthsSnap ? this.compareSnapshots(current, twoMonthsSnap) : null,
      previousYear: prevYearSnap ? this.compareSnapshots(current, prevYearSnap) : null,
    }
  }

  private static calcDelta(current: number, previous: number): MetricDelta {
    const absoluteDelta = current - previous
    const percentageDelta =
      previous !== 0
        ? Number(((absoluteDelta / Math.abs(previous)) * 100).toFixed(1))
        : current !== 0
        ? 100
        : 0

    let direction: 'increase' | 'decrease' | 'unchanged' = 'unchanged'
    if (Math.abs(absoluteDelta) > 0.01) {
      direction = absoluteDelta > 0 ? 'increase' : 'decrease'
    }

    return {
      current,
      previous,
      absoluteDelta,
      percentageDelta,
      direction,
    }
  }

  private static generateQuantitativeFindings(metrics: {
    income: MetricDelta
    expenses: MetricDelta
    netWorth: MetricDelta
    debt: MetricDelta
    liquidity: MetricDelta
    savingsRate: { deltaPoints: number }
  }): string[] {
    const findings: string[] = []

    if (metrics.netWorth.direction !== 'unchanged') {
      const verb = metrics.netWorth.direction === 'increase' ? 'aumentó' : 'disminuyó'
      findings.push(
        `El patrimonio neto ${verb} en $${Math.abs(metrics.netWorth.absoluteDelta).toLocaleString('es-CO')} (${metrics.netWorth.percentageDelta > 0 ? '+' : ''}${metrics.netWorth.percentageDelta}%).`
      )
    }

    if (metrics.income.direction !== 'unchanged') {
      const verb = metrics.income.direction === 'increase' ? 'aumentaron' : 'disminuyeron'
      findings.push(
        `Los ingresos mensuales ${verb} en $${Math.abs(metrics.income.absoluteDelta).toLocaleString('es-CO')} (${metrics.income.percentageDelta > 0 ? '+' : ''}${metrics.income.percentageDelta}%).`
      )
    }

    if (metrics.expenses.direction !== 'unchanged') {
      const verb = metrics.expenses.direction === 'increase' ? 'aumentaron' : 'se redujeron'
      findings.push(
        `Los gastos ${verb} en $${Math.abs(metrics.expenses.absoluteDelta).toLocaleString('es-CO')} (${metrics.expenses.percentageDelta > 0 ? '+' : ''}${metrics.expenses.percentageDelta}%).`
      )
    }

    if (metrics.debt.direction !== 'unchanged') {
      const verb = metrics.debt.direction === 'decrease' ? 'disminuyó' : 'aumentó'
      findings.push(
        `La deuda total ${verb} en $${Math.abs(metrics.debt.absoluteDelta).toLocaleString('es-CO')} (${metrics.debt.percentageDelta > 0 ? '+' : ''}${metrics.debt.percentageDelta}%).`
      )
    }

    if (metrics.liquidity.direction !== 'unchanged') {
      const verb = metrics.liquidity.direction === 'increase' ? 'creció' : 'disminuyó'
      findings.push(
        `La liquidez inmediata ${verb} en $${Math.abs(metrics.liquidity.absoluteDelta).toLocaleString('es-CO')}.`
      )
    }

    if (Math.abs(metrics.savingsRate.deltaPoints) >= 0.5) {
      const verb = metrics.savingsRate.deltaPoints > 0 ? 'subió' : 'bajó'
      findings.push(
        `La tasa de ahorro ${verb} ${Math.abs(metrics.savingsRate.deltaPoints)} puntos porcentuales.`
      )
    }

    if (findings.length === 0) {
      findings.push('Sin variaciones cuantitativas significativas en el período evaluado.')
    }

    return findings
  }
}
