// ============================================================
// NEXUS FINANCE — Digital Twin: Financial Timeline Engine
// Merges historical real snapshots with forward-looking deterministic
// projections (2026 -> 2027 -> 2028 -> 2030).
// Explicitly bifurcates REAL vs PROJECTED data points.
// ============================================================

import type {
  FinancialState,
  FinancialSnapshot,
  DigitalTwinTrajectoryPoint,
} from '../../types/digital-twin'
import type { ScenarioParams } from '../../types'

export class FinancialTimelineEngine {
  /**
   * Generates a continuous chronological financial timeline from historical records
   * into multi-year future projections (up to 2030).
   */
  static generateTimeline(
    state: FinancialState,
    historicalSnapshots: FinancialSnapshot[],
    customParams?: Partial<ScenarioParams>
  ): DigitalTwinTrajectoryPoint[] {
    const points: DigitalTwinTrajectoryPoint[] = []

    // 1. Incorporate past historical snapshots (type: 'real')
    const sortedSnapshots = [...historicalSnapshots].sort((a, b) =>
      a.snapshot_date.localeCompare(b.snapshot_date)
    )

    for (const snap of sortedSnapshots) {
      const [yearStr, monthStr] = snap.snapshot_date.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)

      points.push({
        year,
        month,
        label: `${year}-${String(month).padStart(2, '0')} (Histórico)`,
        type: 'real',
        netWorth: snap.net_worth,
        totalDebt: snap.total_debt || 0,
        savings: snap.liquid_assets || 0,
        goalsProgress: 0,
      })
    }

    // 2. Incorporate current state (type: 'real')
    const currentDate = new Date(state.asOfDate)
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    points.push({
      year: currentYear,
      month: currentMonth,
      label: `${currentYear}-${String(currentMonth).padStart(2, '0')} (Actual)`,
      type: 'real',
      netWorth: state.netWorth.netWorth,
      totalDebt: state.debts.totalDebt,
      savings: state.liquidity.totalLiquid,
      goalsProgress: state.goals.overallProgressPercent,
    })

    // 3. Forward-looking projections: up to Dec 2030 (approx 52 months from Sept 2026)
    const targetEndYear = 2030
    const monthsToProject = Math.max(
      12,
      (targetEndYear - currentYear) * 12 + (12 - currentMonth)
    )

    const incomeGrowthMonthly = (customParams?.income_change_percent || 5) / 100 / 12
    const expenseInflationMonthly = (customParams?.inflation_percent || 4.5) / 100 / 12
    const investmentReturnMonthly = (customParams?.investment_return_percent || 7) / 100 / 12

    let runningIncome = state.income.total
    let runningExpenses = state.expenses.total
    let runningNetWorth = state.netWorth.netWorth
    let runningDebt = state.debts.totalDebt
    let runningSavings = state.liquidity.totalLiquid
    let runningGoalsCurrent = state.goals.totalCurrentAmount
    const totalGoalsTarget = Math.max(1, state.goals.totalTargetAmount)

    // Debt monthly rate
    const debtRateMonthly =
      state.debts.weightedInterestRateEa > 0
        ? Math.pow(1 + state.debts.weightedInterestRateEa / 100, 1 / 12) - 1
        : 0.015

    for (let m = 1; m <= monthsToProject; m++) {
      const projDate = new Date(currentDate)
      projDate.setMonth(projDate.getMonth() + m)
      const pYear = projDate.getFullYear()
      const pMonth = projDate.getMonth() + 1

      // Economics progression
      runningIncome *= 1 + incomeGrowthMonthly
      runningExpenses *= 1 + expenseInflationMonthly

      const monthlyOperatingFree = Math.max(0, runningIncome - runningExpenses)
      const extraSaving = customParams?.extra_monthly_saving || 0
      const monthlySavingsAddition = monthlyOperatingFree + extraSaving

      // Debt amortization
      if (runningDebt > 0) {
        const interest = runningDebt * debtRateMonthly
        const payment = Math.max(state.debts.monthlyDebtService, interest + 10000)
        const principal = Math.min(runningDebt, payment - interest)
        runningDebt = Math.max(0, runningDebt - principal)
      }

      // Net worth compounding + savings
      runningSavings += monthlySavingsAddition
      runningNetWorth = runningNetWorth * (1 + investmentReturnMonthly) + monthlySavingsAddition
      runningGoalsCurrent = Math.min(totalGoalsTarget, runningGoalsCurrent + monthlySavingsAddition * 0.4)
      const currentGoalProgress = Math.min(100, Math.round((runningGoalsCurrent / totalGoalsTarget) * 100))

      // Keep periodic checkpoints: every quarter (3 months) or end of year
      if (pMonth % 3 === 0 || pMonth === 12 || m === monthsToProject) {
        points.push({
          year: pYear,
          month: pMonth,
          label: `${pYear}-${String(pMonth).padStart(2, '0')} (Proyectado)`,
          type: 'projected',
          netWorth: Math.round(runningNetWorth),
          totalDebt: Math.round(runningDebt),
          savings: Math.round(runningSavings),
          goalsProgress: currentGoalProgress,
        })
      }
    }

    return points
  }
}
