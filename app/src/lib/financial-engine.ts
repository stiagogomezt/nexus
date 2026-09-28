// ============================================================
// NEXUS FINANCE — Financial Engine
// Pure calculation functions. No side effects. No API calls.
// This is the core of NEXUS — the AI consults this engine via tools.
// ============================================================

import type {
  Income,
  Expense,
  Debt,
  Goal,
  Budget,
  Investment,
  BettingTransaction,
  Asset,
  Liability,
  IncomeBreakdown,
  CashFlow,
  NetWorth,
  BettingMetrics,
  GoalProgress,
  DashboardMetrics,
  ScenarioParams,
  ScenarioResult,
  ScenarioDataPoint,
  AdvancedScenarioParams,
  AdvancedScenarioResult,
  AdvancedScenarioDataPoint,
} from '@/types'
import { getIncomeSourceKey } from './utils'

// ─────────────────────────────────────────────
// INCOME ENGINE
// ─────────────────────────────────────────────

export function calcIncomeBreakdown(incomes: Income[]): IncomeBreakdown {
  const total = incomes.reduce((sum, i) => sum + i.amount, 0)

  const bySource = {
    shuffler: 0,
    pizza_hut: 0,
    other: 0,
  }

  for (const income of incomes) {
    const key = getIncomeSourceKey(income.source)
    bySource[key] += income.amount
  }

  const sourceLabels: Record<string, string> = {
    shuffler: 'Shuffler',
    pizza_hut: 'Pizza Hut',
    other: 'Otros',
  }

  const sourceCounts: Record<string, number> = { shuffler: 0, pizza_hut: 0, other: 0 }
  for (const income of incomes) {
    const key = getIncomeSourceKey(income.source)
    sourceCounts[key]++
  }

  return {
    total,
    by_source: (['shuffler', 'pizza_hut', 'other'] as const).map((source) => ({
      source,
      label: sourceLabels[source],
      amount: bySource[source],
      percent: total > 0 ? (bySource[source] / total) * 100 : 0,
      transactions: sourceCounts[source],
    })),
  }
}

// ─────────────────────────────────────────────
// EXPENSE ENGINE
// ─────────────────────────────────────────────

export function calcExpensesByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce(
    (acc, e) => {
      acc[e.category_name] = (acc[e.category_name] || 0) + e.amount
      return acc
    },
    {} as Record<string, number>
  )
}

export function calcEssentialExpenses(expenses: Expense[]): number {
  return expenses.filter((e) => e.is_essential).reduce((sum, e) => sum + e.amount, 0)
}

// ─────────────────────────────────────────────
// CASH FLOW ENGINE
// ─────────────────────────────────────────────

export function calcCashFlow(incomes: Income[], expenses: Expense[]): CashFlow {
  const total_income = incomes.reduce((sum, i) => sum + i.amount, 0)
  const total_expenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const net = total_income - total_expenses
  const savings_rate = total_income > 0 ? (net / total_income) * 100 : 0

  return { total_income, total_expenses, net, savings_rate }
}

// ─────────────────────────────────────────────
// NET WORTH ENGINE
// ─────────────────────────────────────────────

export function calcNetWorth(
  assets: Asset[],
  liabilities: Liability[],
  investments: Investment[],
  debts: Debt[],
  cryptoHoldingsValueCop?: number,
  bankAccountsValueCop?: number
): NetWorth {
  const totalAssetsManual = assets.reduce(
    (sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0),
    0
  )
  const totalInvestments = investments.reduce(
    (sum, i) => sum + i.current_price * i.quantity,
    0
  )

  const cashAssets = assets
    .filter((a) => a.category === 'cash')
    .reduce((sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0), 0)

  // Deduplication logic for Bank Accounts: If specialized Open Finance bank balance is provided,
  // prioritize it and deduplicate manual assets categorized under 'bank_accounts'.
  const legacyBankAssets = assets
    .filter((a) => a.category === 'bank_accounts')
    .reduce((sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0), 0)

  const bankAssets =
    typeof bankAccountsValueCop === 'number' && bankAccountsValueCop >= 0
      ? bankAccountsValueCop
      : legacyBankAssets

  // Deduplication logic: If specialized crypto portfolio value is supplied, prioritize it.
  // Otherwise fall back to manual assets labeled as crypto.
  const legacyCryptoAssets = assets
    .filter((a) => a.category === 'crypto')
    .reduce((sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0), 0)

  const cryptoAssets =
    typeof cryptoHoldingsValueCop === 'number' && cryptoHoldingsValueCop >= 0
      ? cryptoHoldingsValueCop
      : legacyCryptoAssets

  const otherAssets = assets
    .filter(
      (a) =>
        a.category !== 'cash' &&
        a.category !== 'bank_accounts' &&
        a.category !== 'crypto'
    )
    .reduce((sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0), 0)

  // Replace legacy values with specialized verified sources to avoid double counting
  let adjustedManualAssets = totalAssetsManual

  if (typeof cryptoHoldingsValueCop === 'number' && cryptoHoldingsValueCop >= 0) {
    adjustedManualAssets = adjustedManualAssets - legacyCryptoAssets + cryptoAssets
  }

  if (typeof bankAccountsValueCop === 'number' && bankAccountsValueCop >= 0) {
    adjustedManualAssets = adjustedManualAssets - legacyBankAssets + bankAssets
  }

  const total_assets = adjustedManualAssets + totalInvestments
  const totalLiabilitiesManual = liabilities.reduce((sum, l) => sum + l.current_balance, 0)
  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0)
  const total_liabilities = Math.max(totalLiabilitiesManual, totalDebt)

  return {
    total_assets,
    total_liabilities,
    net_worth: total_assets - total_liabilities,
    breakdown: {
      cash: cashAssets,
      bank_accounts: bankAssets,
      investments: totalInvestments,
      crypto: cryptoAssets,
      other_assets: otherAssets,
      debts: total_liabilities,
    },
  }
}

/**
 * NEXUS Finance — Paso 13: Cash Flow Bancario Real
 * Separa el dinero que realmente entra y sale de los movimientos internos entre cuentas.
 */
export function calcBankingCashFlow(
  transactions: Array<{
    amount: number
    transaction_type: 'income' | 'expense' | 'transfer' | 'adjustment'
    is_internal_transfer: boolean
    date: string
  }>,
  period?: { startDate?: string; endDate?: string }
) {
  let filtered = transactions
  if (period?.startDate) {
    filtered = filtered.filter((t) => t.date >= period.startDate!)
  }
  if (period?.endDate) {
    filtered = filtered.filter((t) => t.date <= period.endDate!)
  }

  let total_cash_in = 0
  let total_cash_out = 0
  let internal_transfers_volume = 0

  for (const tx of filtered) {
    if (tx.is_internal_transfer) {
      // Transferencia interna no infla ingresos ni egresos reales
      internal_transfers_volume += tx.amount
      continue
    }

    if (tx.transaction_type === 'income') {
      total_cash_in += tx.amount
    } else if (tx.transaction_type === 'expense') {
      total_cash_out += tx.amount
    }
  }

  const net_cash_flow = total_cash_in - total_cash_out

  return {
    total_cash_in,
    total_cash_out,
    internal_transfers_volume,
    net_cash_flow,
    transactions_count: filtered.length,
    period: {
      start_date: period?.startDate || 'all',
      end_date: period?.endDate || 'all',
    },
  }
}

export function calcCryptoNetWorth(
  cryptoValueCop: number,
  cryptoValueUsd: number,
  unrealizedPnLCop: number
) {
  return {
    total_crypto_cop: cryptoValueCop,
    total_crypto_usd: cryptoValueUsd,
    unrealized_pnl_cop: unrealizedPnLCop,
  }
}

// ─────────────────────────────────────────────
// GOALS ENGINE
// ─────────────────────────────────────────────

export function calcGoalProgress(goal: Goal): GoalProgress {
  const progress_percent = Math.min(
    100,
    goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
  )
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)

  let months_to_goal: number | null = null
  let projected_completion_date: string | null = null
  let on_track = false

  if (goal.monthly_contribution > 0 && remaining > 0) {
    months_to_goal = Math.ceil(remaining / goal.monthly_contribution)
    const projected = new Date()
    projected.setMonth(projected.getMonth() + months_to_goal)
    projected_completion_date = projected.toISOString().split('T')[0]

    if (goal.target_date) {
      const targetMs = new Date(goal.target_date).getTime()
      const projectedMs = projected.getTime()
      on_track = projectedMs <= targetMs
    } else {
      on_track = true
    }
  } else if (remaining === 0) {
    on_track = true
  }

  return {
    goal,
    progress_percent,
    remaining,
    months_to_goal,
    projected_completion_date,
    on_track,
  }
}

// ─────────────────────────────────────────────
// DEBT ENGINE
// ─────────────────────────────────────────────

export interface AmortizationRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export function calcAmortizationSchedule(debt: Debt): AmortizationRow[] {
  if (debt.current_balance <= 0) return []

  const monthlyRate = debt.interest_rate_ea > 0
    ? Math.pow(1 + debt.interest_rate_ea / 100, 1 / 12) - 1
    : 0

  const rows: AmortizationRow[] = []
  let balance = debt.current_balance
  let month = 1
  const maxMonths = debt.term_months > 0 ? debt.term_months : 360

  while (balance > 0.01 && month <= maxMonths) {
    const interestCharge = balance * monthlyRate
    const payment = Math.max(debt.minimum_payment, interestCharge + 0.01)
    const principal = Math.min(balance, payment - interestCharge)
    balance = Math.max(0, balance - principal)

    rows.push({
      month,
      payment: payment,
      principal,
      interest: interestCharge,
      balance,
    })
    month++
  }

  return rows
}

export function calcDebtPayoffDate(debt: Debt): Date | null {
  const schedule = calcAmortizationSchedule(debt)
  if (schedule.length === 0) return null
  const payoffMonth = schedule.length
  const date = new Date()
  date.setMonth(date.getMonth() + payoffMonth)
  return date
}

// ─────────────────────────────────────────────
// BETTING ENGINE
// ─────────────────────────────────────────────

export function calcBettingMetrics(
  bets: BettingTransaction[],
  monthlyIncome: number
): BettingMetrics {
  const completed = bets.filter((b) => b.result !== 'pending')
  const total_staked = bets.reduce((sum, b) => sum + b.stake_amount, 0)
  const total_returned = bets.reduce((sum, b) => sum + b.return_amount, 0)
  const net_profit = total_returned - total_staked
  const roi_percent = total_staked > 0 ? (net_profit / total_staked) * 100 : 0
  const wins = completed.filter((b) => b.result === 'won').length
  const win_rate_percent = completed.length > 0 ? (wins / completed.length) * 100 : 0
  const pending_count = bets.filter((b) => b.result === 'pending').length

  return {
    total_staked,
    total_returned,
    net_profit,
    roi_percent,
    win_rate_percent,
    pending_count,
    sessions_count: bets.length,
    income_percent: monthlyIncome > 0 ? (total_staked / monthlyIncome) * 100 : 0,
  }
}

// ─────────────────────────────────────────────
// DASHBOARD METRICS (aggregation)
// ─────────────────────────────────────────────

export function calcDashboardMetrics(params: {
  incomes: Income[]
  expenses: Expense[]
  goals: Goal[]
  debts: Debt[]
  assets: Asset[]
  liabilities: Liability[]
  investments: Investment[]
  bets: BettingTransaction[]
  cryptoHoldingsValueCop?: number
  bankAccountsValueCop?: number
}): DashboardMetrics {
  const {
    incomes,
    expenses,
    goals,
    debts,
    assets,
    liabilities,
    investments,
    bets,
    cryptoHoldingsValueCop,
    bankAccountsValueCop,
  } = params

  const cashFlow = calcCashFlow(incomes, expenses)
  const incomeBreakdown = calcIncomeBreakdown(incomes)
  const netWorth = calcNetWorth(
    assets,
    liabilities,
    investments,
    debts,
    cryptoHoldingsValueCop,
    bankAccountsValueCop
  )


  const activeGoals = goals.filter((g) => g.status === 'active')
  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => {
          const p = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
          return sum + Math.min(100, p)
        }, 0) / activeGoals.length
      : 0

  const bettingMetrics = calcBettingMetrics(bets, cashFlow.total_income)

  return {
    total_income_month: cashFlow.total_income,
    total_expenses_month: cashFlow.total_expenses,
    free_cash_flow: cashFlow.net,
    savings_rate: cashFlow.savings_rate,
    income_by_source: {
      shuffler: incomeBreakdown.by_source.find((s) => s.source === 'shuffler')?.amount ?? 0,
      pizza_hut: incomeBreakdown.by_source.find((s) => s.source === 'pizza_hut')?.amount ?? 0,
      others: incomeBreakdown.by_source.find((s) => s.source === 'other')?.amount ?? 0,
    },
    net_worth: netWorth.net_worth,
    total_assets: netWorth.total_assets,
    total_debt: netWorth.total_liabilities,
    active_goals_count: activeGoals.length,
    average_goals_progress: avgProgress,
    total_invested: investments.reduce((sum, i) => sum + i.current_price * i.quantity, 0),
    betting_net_month: bettingMetrics.net_profit,
    betting_staked_month: bettingMetrics.total_staked,
  }
}

// ─────────────────────────────────────────────
// SCENARIO ENGINE
// ─────────────────────────────────────────────

export function runScenario(
  base: { monthly_income: number; monthly_expenses: number; current_net_worth: number },
  params: ScenarioParams
): ScenarioResult {
  const monthlyIncomeGrowth = params.income_change_percent / 100 / 12
  const monthlyExpenseGrowth = params.expense_change_percent / 100 / 12
  const monthlyInflation = params.inflation_percent / 100 / 12
  const monthlyReturn = params.investment_return_percent / 100 / 12

  const dataPoints: ScenarioDataPoint[] = []
  let currentIncome = base.monthly_income
  let currentExpenses = base.monthly_expenses
  let netWorth = base.current_net_worth
  let savings = 0

  for (let m = 1; m <= params.months; m++) {
    currentIncome = currentIncome * (1 + monthlyIncomeGrowth)
    currentExpenses = currentExpenses * (1 + monthlyExpenseGrowth) * (1 + monthlyInflation)

    const monthlySavings = currentIncome - currentExpenses + params.extra_monthly_saving
    savings += monthlySavings
    netWorth = netWorth * (1 + monthlyReturn) + monthlySavings

    const date = new Date()
    date.setMonth(date.getMonth() + m)
    const label = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })

    dataPoints.push({
      month: m,
      label,
      net_worth: netWorth,
      savings_accumulated: savings,
      income: currentIncome,
      expenses: currentExpenses,
    })
  }

  return {
    params,
    data_points: dataPoints,
    final_net_worth: netWorth,
    total_savings: savings,
  }
}

export function simulateAdvancedScenario(
  base: {
    monthly_income: number
    monthly_expenses: number
    current_net_worth: number
    current_total_debt?: number
    debts?: Debt[]
    goals?: Goal[]
  },
  params: AdvancedScenarioParams
): AdvancedScenarioResult {
  const months = Math.max(1, Math.min(params.months || 24, 120))
  const monthlyIncomeGrowth = (params.income_change_percent || 0) / 100 / 12
  const monthlyExpenseGrowth = (params.expense_change_percent || 0) / 100 / 12
  const monthlyInflation = (params.inflation_percent || 0) / 100 / 12
  const monthlyReturn = (params.investment_return_percent || 0) / 100 / 12

  // Initial debt determination
  const initialDebt =
    base.current_total_debt ??
    (base.debts ? base.debts.reduce((s, d) => s + d.current_balance, 0) : 0)

  // Calculate weighted debt rate
  const totalMinPayment = base.debts
    ? base.debts.reduce((s, d) => s + d.minimum_payment, 0)
    : 0
  const weightedRateEA =
    base.debts && initialDebt > 0
      ? base.debts.reduce((sum, d) => sum + d.interest_rate_ea * d.current_balance, 0) / initialDebt
      : 24.0
  const monthlyDebtRate =
    weightedRateEA > 0 ? Math.pow(1 + weightedRateEA / 100, 1 / 12) - 1 : 0

  let currentIncome = base.monthly_income
  let currentExpenses = base.monthly_expenses
  let baselineIncome = base.monthly_income
  let baselineExpenses = base.monthly_expenses
  let netWorth = base.current_net_worth
  let baselineNetWorth = base.current_net_worth
  let savings = 0

  let scenarioDebt = initialDebt
  let baselineDebt = initialDebt

  let totalInterestScenario = 0
  let totalInterestBaseline = 0

  let scenarioDebtPayoffMonth: number | null = null
  let baselineDebtPayoffMonth: number | null = null

  const dataPoints: AdvancedScenarioDataPoint[] = []

  for (let m = 1; m <= months; m++) {
    // Baseline calculation (evolves with macro inflation)
    baselineExpenses = baselineExpenses * (1 + monthlyInflation)
    const baseSavingsMonthly = Math.max(0, baselineIncome - baselineExpenses)
    baselineNetWorth = baselineNetWorth * (1 + monthlyReturn) + baseSavingsMonthly

    // Scenario calculation (evolves with specific scenario assumptions + macro inflation)
    currentIncome = currentIncome * (1 + monthlyIncomeGrowth)
    currentExpenses = currentExpenses * (1 + monthlyExpenseGrowth) * (1 + monthlyInflation)
    const monthlySavings =
      Math.max(0, currentIncome - currentExpenses) + (params.extra_monthly_saving || 0)
    savings += monthlySavings
    netWorth = netWorth * (1 + monthlyReturn) + monthlySavings

    // Baseline debt amortization
    if (baselineDebt > 0) {
      const interestCharge = baselineDebt * monthlyDebtRate
      totalInterestBaseline += interestCharge
      const payment = Math.max(totalMinPayment, interestCharge + 1000)
      const principal = Math.min(baselineDebt, payment - interestCharge)
      baselineDebt = Math.max(0, baselineDebt - principal)
      if (baselineDebt === 0 && baselineDebtPayoffMonth === null) {
        baselineDebtPayoffMonth = m
      }
    }

    // Scenario debt amortization
    if (scenarioDebt > 0) {
      const interestCharge = scenarioDebt * monthlyDebtRate
      totalInterestScenario += interestCharge
      const extraPayment =
        params.extra_debt_payment ||
        (params.selected_debt_id && params.simulated_debt_payment
          ? Math.max(0, params.simulated_debt_payment - totalMinPayment)
          : 0)
      const payment = Math.max(
        totalMinPayment + Math.max(0, extraPayment),
        interestCharge + 1000
      )
      const principal = Math.min(scenarioDebt, payment - interestCharge)
      scenarioDebt = Math.max(0, scenarioDebt - principal)
      if (scenarioDebt === 0 && scenarioDebtPayoffMonth === null) {
        scenarioDebtPayoffMonth = m
      }
    }

    const date = new Date()
    date.setMonth(date.getMonth() + m)
    const label = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })

    dataPoints.push({
      month: m,
      label,
      net_worth: netWorth,
      baseline_net_worth: baselineNetWorth,
      savings_accumulated: savings,
      debt_balance: scenarioDebt,
      baseline_debt_balance: baselineDebt,
      income: currentIncome,
      expenses: currentExpenses,
    })
  }

  // Goal simulation
  let goalSim: AdvancedScenarioResult['goal_simulation'] | undefined
  if (base.goals && base.goals.length > 0) {
    const targetGoal = params.selected_goal_id
      ? base.goals.find((g) => g.id === params.selected_goal_id) || base.goals[0]
      : base.goals[0]

    const remaining = Math.max(0, targetGoal.target_amount - targetGoal.current_amount)
    const origMonthly = targetGoal.monthly_contribution || 1
    const origMonths = origMonthly > 0 ? Math.ceil(remaining / origMonthly) : null

    const simMonthly =
      params.simulated_goal_contribution && params.simulated_goal_contribution > 0
        ? params.simulated_goal_contribution
        : origMonthly + (params.extra_monthly_saving || 0)

    const simMonths = simMonthly > 0 ? Math.ceil(remaining / simMonthly) : null
    const monthsSaved =
      origMonths !== null && simMonths !== null ? Math.max(0, origMonths - simMonths) : 0

    const compDate = simMonths !== null ? new Date() : null
    if (compDate && simMonths !== null) compDate.setMonth(compDate.getMonth() + simMonths)

    goalSim = {
      goal_name: targetGoal.name,
      target_amount: targetGoal.target_amount,
      current_amount: targetGoal.current_amount,
      original_months: origMonths,
      simulated_months: simMonths,
      months_saved: monthsSaved,
      simulated_completion_date: compDate ? compDate.toISOString().split('T')[0] : null,
    }
  }

  return {
    params,
    data_points: dataPoints,
    final_net_worth: netWorth,
    baseline_final_net_worth: baselineNetWorth,
    net_worth_delta: netWorth - baselineNetWorth,
    total_savings: savings,
    total_debt_remaining: scenarioDebt,
    baseline_total_debt_remaining: baselineDebt,
    debt_payoff_months: scenarioDebtPayoffMonth,
    baseline_debt_payoff_months: baselineDebtPayoffMonth,
    interest_saved: Math.max(0, totalInterestBaseline - totalInterestScenario),
    goal_simulation: goalSim,
  }
}

// ─────────────────────────────────────────────
// BUDGET ENGINE
// ─────────────────────────────────────────────

export interface CategoryBudgetPerformance {
  category_name: string
  budgeted: number
  spent: number
  available: number
  percent_used: number
  is_over_budget: boolean
}

export interface BudgetSummary {
  total_budgeted: number
  total_spent: number
  total_available: number
  overall_percent_used: number
  categories: CategoryBudgetPerformance[]
  over_budget_count: number
}

export function calcBudgetPerformance(
  budgets: Budget[],
  expenses: Expense[],
  month: number,
  year: number
): BudgetSummary {
  // Filter expenses strictly for the specified period
  const periodExpenses = expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })

  // Aggregate expenses per category
  const spentByCategory = periodExpenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.category_name.toLowerCase().trim()
    acc[cat] = (acc[cat] || 0) + e.amount
    return acc
  }, {})

  // Compute performance for each defined budget in this period
  const currentBudgets = budgets.filter((b) => b.month === month && b.year === year)

  const categories: CategoryBudgetPerformance[] = currentBudgets.map((b) => {
    const cat = b.category_name.toLowerCase().trim()
    const budgeted = b.budgeted_amount
    const spent = spentByCategory[cat] || 0
    const available = budgeted - spent
    const percent_used = budgeted > 0 ? (spent / budgeted) * 100 : 0
    return {
      category_name: b.category_name,
      budgeted,
      spent,
      available,
      percent_used,
      is_over_budget: spent > budgeted,
    }
  })

  const total_budgeted = categories.reduce((sum, c) => sum + c.budgeted, 0)
  const total_spent = categories.reduce((sum, c) => sum + c.spent, 0)
  const total_available = total_budgeted - total_spent
  const overall_percent_used = total_budgeted > 0 ? (total_spent / total_budgeted) * 100 : 0
  const over_budget_count = categories.filter((c) => c.is_over_budget).length

  return {
    total_budgeted,
    total_spent,
    total_available,
    overall_percent_used,
    categories,
    over_budget_count,
  }
}

