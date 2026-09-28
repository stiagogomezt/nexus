/**
 * NEXUS Finance — AI Tooling Layer (READ-ONLY TOOLS)
 *
 * Architecture:
 * DATABASE -> DATA ACCESS LAYER (DAL) -> FINANCIAL ENGINE -> DETERMINISTIC STRUCTURAL RESULT -> AI
 *
 * RULES:
 * 1. AI never calculates financial balances or core ledger math.
 * 2. All operations here are strictly READ-ONLY.
 * 3. User isolation is mandatory (every tool validates and isolates user_id).
 */

import * as dal from '@/lib/dal'
import {
  calcIncomeBreakdown,
  calcExpensesByCategory,
  calcCashFlow,
  calcNetWorth,
  calcGoalProgress,
  calcBudgetPerformance,
  calcBettingMetrics,
  simulateAdvancedScenario,
  calcBankingCashFlow,
} from '@/lib/financial-engine'
import { PortfolioAggregator } from '@/lib/crypto/portfolio-aggregator'
import { walletService } from '@/lib/wallets/wallet-service'
import { buildFinancialState } from '@/lib/digital-twin/financial-state-builder'
import { FinancialChangeDetector } from '@/lib/digital-twin/change-detector'
import { EventEngine } from '@/lib/intelligence/event-engine'
import { AlertCenter } from '@/lib/intelligence/alert-center'
import { IntelligenceEngine } from '@/lib/intelligence/intelligence-engine'
import { CopilotContextBuilder } from '@/lib/copilot/copilot-context-builder'
import { ProactiveCopilotService } from '@/lib/copilot/proactive-copilot-service'
import type { EventCategory, AlertSeverity, AlertStatus } from '@/types/intelligence'
import type { FinancialSnapshot } from '@/types/digital-twin'

export interface ToolContext {
  userId: string
}

function assertUser(userId: string) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('AI Tool Security Violation: Unauthenticated or missing userId')
  }
}

/**
 * Tool: get_monthly_income
 * Returns total income for the period, breakdown by source (Shuffler vs Pizza Hut vs others),
 * and individual transaction records.
 */
export async function get_monthly_income(
  ctx: ToolContext,
  params: { month?: number; year?: number } = {}
) {
  assertUser(ctx.userId)
  const allIncomes = await dal.getIncomes(ctx.userId)

  const month = params.month ?? new Date().getMonth() + 1
  const year = params.year ?? new Date().getFullYear()

  const periodIncomes = allIncomes.filter((i) => {
    const d = new Date(i.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })

  const breakdown = calcIncomeBreakdown(periodIncomes)

  return {
    tool: 'get_monthly_income',
    user_id: ctx.userId,
    period: { month, year },
    total_income: breakdown.total,
    by_source: breakdown.by_source,
    items_count: periodIncomes.length,
    incomes: periodIncomes.map((i) => ({
      id: i.id,
      date: i.date,
      source: i.source,
      source_key: i.income_source_key,
      amount: i.amount,
      type: i.income_type,
      description: i.description,
      is_recurring: i.is_recurring,
    })),
  }
}

/**
 * Tool: get_monthly_expenses
 * Returns total expenses for the period, breakdown by category, essential vs non-essential,
 * and individual expense items.
 */
export async function get_monthly_expenses(
  ctx: ToolContext,
  params: { month?: number; year?: number; category?: string } = {}
) {
  assertUser(ctx.userId)
  const allExpenses = await dal.getExpenses(ctx.userId)

  const month = params.month ?? new Date().getMonth() + 1
  const year = params.year ?? new Date().getFullYear()

  let periodExpenses = allExpenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })

  if (params.category && params.category !== 'all') {
    const targetCat = params.category.toLowerCase().trim()
    periodExpenses = periodExpenses.filter(
      (e) => e.category_name.toLowerCase().trim() === targetCat
    )
  }

  const byCategory = calcExpensesByCategory(periodExpenses)
  const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0)
  const essentialTotal = periodExpenses
    .filter((e) => e.is_essential)
    .reduce((sum, e) => sum + e.amount, 0)
  const nonEssentialTotal = total - essentialTotal

  return {
    tool: 'get_monthly_expenses',
    user_id: ctx.userId,
    period: { month, year },
    filter_category: params.category || 'all',
    total_expenses: total,
    essential_expenses: essentialTotal,
    non_essential_expenses: nonEssentialTotal,
    essential_ratio: total > 0 ? (essentialTotal / total) * 100 : 0,
    by_category: byCategory,
    items_count: periodExpenses.length,
    expenses: periodExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category_name,
      description: e.description,
      amount: e.amount,
      payment_method: e.payment_method,
      is_essential: e.is_essential,
    })),
  }
}

/**
 * Tool: get_cash_flow
 * Deterministic calculation of monthly income vs expenses, net free cash flow, and savings rate.
 */
export async function get_cash_flow(
  ctx: ToolContext,
  params: { month?: number; year?: number } = {}
) {
  assertUser(ctx.userId)
  const [incomes, expenses] = await Promise.all([
    dal.getIncomes(ctx.userId),
    dal.getExpenses(ctx.userId),
  ])

  const month = params.month ?? new Date().getMonth() + 1
  const year = params.year ?? new Date().getFullYear()

  const periodIncomes = incomes.filter((i) => {
    const d = new Date(i.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const periodExpenses = expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })

  const flow = calcCashFlow(periodIncomes, periodExpenses)

  return {
    tool: 'get_cash_flow',
    user_id: ctx.userId,
    period: { month, year },
    total_income: flow.total_income,
    total_expenses: flow.total_expenses,
    free_cash_flow: flow.net,
    savings_rate: flow.savings_rate,
    status:
      flow.net > 0 ? 'SURPLUS' : flow.net === 0 ? 'BALANCED' : 'DEFICIT',
  }
}

/**
 * Tool: get_budgets
 * Compares configured budgets against actual real expenditures for the period.
 */
export async function get_budgets(
  ctx: ToolContext,
  params: { month?: number; year?: number } = {}
) {
  assertUser(ctx.userId)
  const month = params.month ?? new Date().getMonth() + 1
  const year = params.year ?? new Date().getFullYear()

  const [budgets, expenses] = await Promise.all([
    dal.getBudgets(ctx.userId, month, year),
    dal.getExpenses(ctx.userId),
  ])

  const performance = calcBudgetPerformance(budgets, expenses, month, year)

  return {
    tool: 'get_budgets',
    user_id: ctx.userId,
    period: { month, year },
    total_budgeted: performance.total_budgeted,
    total_spent: performance.total_spent,
    total_available: performance.total_available,
    overall_percent_used: performance.overall_percent_used,
    over_budget_count: performance.over_budget_count,
    categories: performance.categories,
  }
}

/**
 * Tool: get_goals
 * Returns active financial goals, current accumulated amounts, and percentage progress.
 */
export async function get_goals(ctx: ToolContext) {
  assertUser(ctx.userId)
  const goals = await dal.getGoals(ctx.userId)

  const analyzedGoals = goals.map((g) => {
    const progress = calcGoalProgress(g)
    return {
      id: g.id,
      name: g.name,
      category: g.category,
      priority: g.priority,
      status: g.status,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      remaining_amount: progress.remaining,
      progress_percent: progress.progress_percent,
      monthly_contribution: g.monthly_contribution,
      target_date: g.target_date,
      on_track: progress.on_track,
      months_to_goal: progress.months_to_goal,
      projected_completion_date: progress.projected_completion_date,
    }
  })

  return {
    tool: 'get_goals',
    user_id: ctx.userId,
    total_goals_count: goals.length,
    active_goals_count: goals.filter((g) => g.status === 'active').length,
    completed_goals_count: goals.filter((g) => g.status === 'completed').length,
    goals: analyzedGoals,
  }
}

/**
 * Tool: get_debts
 * Returns debt liabilities, current balances, interest rates, and monthly payment commitments.
 */
export async function get_debts(ctx: ToolContext) {
  assertUser(ctx.userId)
  const debts = await dal.getDebts(ctx.userId)

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0)
  const monthlyCommitment = debts.reduce((sum, d) => sum + d.minimum_payment, 0)

  return {
    tool: 'get_debts',
    user_id: ctx.userId,
    total_debts_count: debts.length,
    total_debt_balance: totalDebt,
    total_monthly_minimum_payment: monthlyCommitment,
    debts: debts.map((d) => ({
      id: d.id,
      name: d.name,
      entity: d.entity,
      debt_type: d.debt_type,
      current_balance: d.current_balance,
      initial_balance: d.initial_balance,
      interest_rate_ea: d.interest_rate_ea,
      minimum_payment: d.minimum_payment,
      payment_day: d.payment_day,
      term_months: d.term_months,
    })),
  }
}

/**
 * Tool: get_net_worth
 * Returns total assets, total liabilities, and net worth balance.
 */
export async function get_net_worth(ctx: ToolContext) {
  assertUser(ctx.userId)
  const [assets, liabilities, debts] = await Promise.all([
    dal.getAssets(ctx.userId),
    dal.getLiabilities(ctx.userId),
    dal.getDebts(ctx.userId),
  ])

  // Pure calculation using the 4 arguments expected by calcNetWorth
  const netWorthResult = calcNetWorth(assets, liabilities, [], debts)

  return {
    tool: 'get_net_worth',
    user_id: ctx.userId,
    total_assets: netWorthResult.total_assets,
    total_liabilities: netWorthResult.total_liabilities,
    net_worth: netWorthResult.net_worth,
    breakdown: netWorthResult.breakdown,
    assets_count: assets.length,
    liabilities_count: liabilities.length,
    debts_count: debts.length,
  }
}

/**
 * Tool: get_accounts
 * Returns user accounts and reported balances.
 */
export async function get_accounts(ctx: ToolContext) {
  assertUser(ctx.userId)
  const accounts = await dal.getAccounts(ctx.userId)

  return {
    tool: 'get_accounts',
    user_id: ctx.userId,
    accounts_count: accounts.length,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.account_type,
      current_balance: a.current_balance,
      currency: a.currency,
      is_active: a.is_active,
    })),
  }
}

// ─────────────────────────────────────────────
// FUTURE MODULE READ TOOLS (Placeholders/Safe Stubs)
// ─────────────────────────────────────────────

export async function get_investments(ctx: ToolContext) {
  assertUser(ctx.userId)
  return {
    tool: 'get_investments',
    user_id: ctx.userId,
    status: 'NOT_CONFIGURED',
    message: 'Módulo de inversiones en fase de preparación de providers.',
    investments: [],
  }
}

/**
 * Tool: get_crypto_summary
 * Computes consolidated Crypto Net Worth (USD and COP), PnL, 24h change, and its weight in total net worth.
 */
export async function get_crypto_summary(ctx: ToolContext) {
  assertUser(ctx.userId)
  const [holdings, wallets, assets, liabilities, debts] = await Promise.all([
    dal.getCryptoHoldings(ctx.userId),
    dal.getWallets(ctx.userId),
    dal.getAssets(ctx.userId),
    dal.getLiabilities(ctx.userId),
    dal.getDebts(ctx.userId),
  ])

  const summary = await PortfolioAggregator.aggregate({ holdings, wallets })
  const netWorthResult = calcNetWorth(assets, liabilities, [], debts, summary.totalValueCop)

  const cryptoWeightPercent =
    netWorthResult.net_worth > 0
      ? Math.round((summary.totalValueCop / netWorthResult.net_worth) * 10000) / 100
      : 0

  return {
    tool: 'get_crypto_summary',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_crypto_value_cop: summary.totalValueCop,
    total_crypto_value_usd: summary.totalValueUsd,
    total_cost_basis_cop: summary.totalCostBasisCop,
    total_cost_basis_usd: summary.totalCostBasisUsd,
    unrealized_pnl_cop: summary.unrealizedPnLCop,
    unrealized_pnl_usd: summary.unrealizedPnLUsd,
    unrealized_pnl_percent: summary.unrealizedPnLPercent,
    change_24h_cop: summary.change24hCop,
    change_24h_usd: summary.change24hUsd,
    total_holdings_count: summary.totalHoldingsCount,
    active_wallets_count: summary.activeWalletsCount,
    total_net_worth_with_crypto_cop: netWorthResult.net_worth,
    crypto_weight_in_net_worth_percent: cryptoWeightPercent,
    top_positions: summary.positions.slice(0, 5).map((p) => ({
      symbol: p.symbol,
      name: p.assetName,
      quantity: p.totalQuantity,
      current_price_usd: p.currentPriceUsd,
      current_price_cop: p.currentPriceCop,
      total_value_cop: p.totalCurrentValueCop,
      allocation_percent: p.allocationPercent,
      unrealized_pnl_percent: p.unrealizedPnLPercent,
    })),
    distribution_by_asset: summary.distributionByAsset,
    distribution_by_source: summary.distributionBySource,
    exchange_rate_usd_to_cop: summary.exchangeRateUsdToCop,
    last_updated: summary.lastUpdated,
  }
}

/** Backward compatibility alias */
export async function get_crypto(ctx: ToolContext) {
  return get_crypto_summary(ctx)
}

/**
 * Tool: get_wallets
 * Returns the list of registered on-chain public wallets (strictly read-only, addresses abbreviated).
 */
export async function get_wallets(ctx: ToolContext) {
  assertUser(ctx.userId)
  const wallets = await dal.getWallets(ctx.userId)

  return {
    tool: 'get_wallets',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_wallets: wallets.length,
    active_wallets: wallets.filter((w) => w.is_active).length,
    wallets: wallets.map((w) => ({
      id: w.id,
      name: w.name,
      blockchain: w.blockchain,
      network_name: w.network_name,
      address_abbreviated: walletService.abbreviateAddress(w.address, w.blockchain),
      label: w.label,
      is_active: w.is_active,
      last_synced_at: w.last_synced_at,
    })),
  }
}

/**
 * Tool: get_wallet_balance
 * Queries live on-chain balances and token breakdowns for a specific public wallet.
 */
export async function get_wallet_balance(
  ctx: ToolContext,
  params: { wallet_id?: string; address?: string } = {}
) {
  assertUser(ctx.userId)
  const wallets = await dal.getWallets(ctx.userId)

  let targetWallet = wallets.find(
    (w) =>
      (params.wallet_id && w.id === params.wallet_id) ||
      (params.address && w.address.toLowerCase() === params.address.toLowerCase())
  )

  if (!targetWallet && params.address) {
    const cleanAddr = params.address.trim()
    const isEvm = cleanAddr.startsWith('0x')
    targetWallet = {
      id: 'query-adhoc',
      user_id: ctx.userId,
      name: 'Billetera Externa Consultada',
      address: cleanAddr,
      blockchain: isEvm ? 'evm' : 'solana',
      network_name: isEvm ? 'Ethereum / EVM' : 'Solana Mainnet',
      label: 'Consulta On-Demand',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  if (!targetWallet) {
    return {
      tool: 'get_wallet_balance',
      user_id: ctx.userId,
      status: 'NOT_FOUND',
      message: 'No se encontró ninguna billetera registrada con los parámetros especificados.',
      balances: [],
    }
  }

  const balances = await walletService.getWalletBalances(targetWallet)
  const totalUsd = balances.reduce((sum, b) => sum + b.estimatedValueUsd, 0)
  const totalCop = balances.reduce((sum, b) => sum + b.estimatedValueCop, 0)

  return {
    tool: 'get_wallet_balance',
    user_id: ctx.userId,
    status: 'SUCCESS',
    wallet_id: targetWallet.id,
    wallet_name: targetWallet.name,
    blockchain: targetWallet.blockchain,
    network: targetWallet.network_name,
    address_abbreviated: walletService.abbreviateAddress(targetWallet.address, targetWallet.blockchain),
    tokens_count: balances.length,
    total_estimated_usd: Math.round(totalUsd * 100) / 100,
    total_estimated_cop: Math.round(totalCop),
    balances: balances.map((b) => ({
      symbol: b.tokenSymbol,
      name: b.tokenName,
      balance: b.balance,
      price_usd: b.priceUsd,
      price_cop: b.priceCop,
      estimated_value_usd: b.estimatedValueUsd,
      estimated_value_cop: b.estimatedValueCop,
      is_native: b.isNative,
    })),
  }
}

/**
 * Tool: get_crypto_portfolio
 * Returns detailed positions, current prices, cost basis, unrealized PnL, and allocation.
 * Optionally filters by a single symbol (e.g. "SOL", "BTC").
 */
export async function get_crypto_portfolio(
  ctx: ToolContext,
  params: { symbol?: string } = {}
) {
  assertUser(ctx.userId)
  const [holdings, wallets] = await Promise.all([
    dal.getCryptoHoldings(ctx.userId),
    dal.getWallets(ctx.userId),
  ])

  const summary = await PortfolioAggregator.aggregate({ holdings, wallets })
  let positions = summary.positions

  if (params.symbol) {
    const targetSymbol = params.symbol.toUpperCase().trim()
    positions = positions.filter((p) => p.symbol === targetSymbol)
  }

  return {
    tool: 'get_crypto_portfolio',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_positions_matched: positions.length,
    filtered_by_symbol: params.symbol ? params.symbol.toUpperCase().trim() : null,
    total_portfolio_value_cop: summary.totalValueCop,
    total_portfolio_value_usd: summary.totalValueUsd,
    positions: positions.map((p) => ({
      symbol: p.symbol,
      asset_name: p.assetName,
      total_quantity: p.totalQuantity,
      current_price_usd: p.currentPriceUsd,
      current_price_cop: p.currentPriceCop,
      average_purchase_price_usd: p.averagePurchasePriceUsd,
      average_purchase_price_cop: p.averagePurchasePriceCop,
      total_current_value_cop: p.totalCurrentValueCop,
      total_current_value_usd: p.totalCurrentValueUsd,
      total_cost_basis_cop: p.totalCostBasisCop,
      unrealized_pnl_cop: p.unrealizedPnLCop,
      unrealized_pnl_usd: p.unrealizedPnLUsd,
      unrealized_pnl_percent: p.unrealizedPnLPercent,
      allocation_percent: p.allocationPercent,
      sources: p.sources,
    })),
  }
}


export async function get_betting(ctx: ToolContext) {
  assertUser(ctx.userId)
  const incomes = await dal.getIncomes(ctx.userId)
  const monthlyIncome = incomes.reduce((s, i) => s + i.amount, 0)
  return {
    tool: 'get_betting',
    user_id: ctx.userId,
    status: 'READY',
    transactions: [],
    metrics: calcBettingMetrics([], monthlyIncome),
  }
}

/**
 * Tool: simulate_financial_scenario
 * Runs a deterministic projection scenario through the Financial Engine.
 * Modifies ONLY scenario assumptions, NEVER mutates real records.
 */
export async function simulate_financial_scenario(
  ctx: ToolContext,
  params: {
    extra_monthly_saving?: number
    income_change_percent?: number
    expense_change_percent?: number
    extra_debt_payment?: number
    horizon_months?: number
    target_goal_name?: string
    simulated_goal_contribution?: number
    target_debt_name?: string
    simulated_debt_payment?: number
  } = {}
) {
  assertUser(ctx.userId)

  const [incomes, expenses, assets, liabilities, debts, goals] = await Promise.all([
    dal.getIncomes(ctx.userId),
    dal.getExpenses(ctx.userId),
    dal.getAssets(ctx.userId),
    dal.getLiabilities(ctx.userId),
    dal.getDebts(ctx.userId),
    dal.getGoals(ctx.userId),
  ])

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Base income and expenses for current month (or all-time average if month has 0)
  const currentMonthIncomes = incomes.filter((i) => {
    const d = new Date(i.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })
  const currentMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })

  const baseMonthlyIncome =
    currentMonthIncomes.length > 0
      ? currentMonthIncomes.reduce((s, i) => s + i.amount, 0)
      : incomes.reduce((s, i) => s + i.amount, 0)

  const baseMonthlyExpenses =
    currentMonthExpenses.length > 0
      ? currentMonthExpenses.reduce((s, e) => s + e.amount, 0)
      : expenses.reduce((s, e) => s + e.amount, 0)

  const netWorthResult = calcNetWorth(assets, liabilities, [], debts)

  let selectedGoalId: string | null = null
  if (params.target_goal_name && goals.length > 0) {
    const found = goals.find((g) =>
      g.name.toLowerCase().includes(params.target_goal_name!.toLowerCase())
    )
    if (found) selectedGoalId = found.id
  }

  let selectedDebtId: string | null = null
  if (params.target_debt_name && debts.length > 0) {
    const found = debts.find((d) =>
      d.name.toLowerCase().includes(params.target_debt_name!.toLowerCase())
    )
    if (found) selectedDebtId = found.id
  }

  const result = simulateAdvancedScenario(
    {
      monthly_income: baseMonthlyIncome,
      monthly_expenses: baseMonthlyExpenses,
      current_net_worth: netWorthResult.net_worth,
      current_total_debt: debts.reduce((s, d) => s + d.current_balance, 0),
      debts,
      goals,
    },
    {
      name: 'Simulación AI NEXUS',
      preset_type: 'personalizado',
      income_change_percent: params.income_change_percent || 0,
      expense_change_percent: params.expense_change_percent || 0,
      extra_monthly_saving: params.extra_monthly_saving || 0,
      extra_debt_payment: params.extra_debt_payment || 0,
      investment_return_percent: 8,
      inflation_percent: 5,
      months: params.horizon_months || 24,
      selected_goal_id: selectedGoalId,
      simulated_goal_contribution: params.simulated_goal_contribution,
      selected_debt_id: selectedDebtId,
      simulated_debt_payment: params.simulated_debt_payment,
    }
  )

  return {
    tool: 'simulate_financial_scenario',
    user_id: ctx.userId,
    is_simulation: true,
    disclaimer: 'Escenario hipotético — No modifica datos reales y no constituye garantía financiera.',
    baseline: {
      monthly_income: baseMonthlyIncome,
      monthly_expenses: baseMonthlyExpenses,
      current_net_worth: netWorthResult.net_worth,
      current_debt: debts.reduce((s, d) => s + d.current_balance, 0),
      projected_net_worth: result.baseline_final_net_worth,
      baseline_final_net_worth: result.baseline_final_net_worth,
      baseline_debt_payoff_months: result.baseline_debt_payoff_months,
    },
    scenario: {
      final_net_worth: result.final_net_worth,
      projected_net_worth: result.final_net_worth,
      net_worth_delta: result.net_worth_delta,
      total_savings_accumulated: result.total_savings,
      total_debt_remaining: result.total_debt_remaining,
      debt_payoff_months: result.debt_payoff_months,
      interest_saved: result.interest_saved,
    },
    comparison: {
      net_worth_delta: result.net_worth_delta,
      additional_savings_accumulated: result.total_savings,
      interest_saved: result.interest_saved,
      debt_free_months_saved:
        result.baseline_debt_payoff_months && result.debt_payoff_months
          ? Math.max(0, result.baseline_debt_payoff_months - result.debt_payoff_months)
          : 0,
    },
    debt_payoff: {
      baseline_months: result.baseline_debt_payoff_months ?? 0,
      scenario_months: result.debt_payoff_months ?? 0,
      months_saved:
        result.baseline_debt_payoff_months && result.debt_payoff_months
          ? Math.max(0, result.baseline_debt_payoff_months - result.debt_payoff_months)
          : 0,
      interest_saved: result.interest_saved,
    },
    goal_simulation: result.goal_simulation,
    parameters_applied: {
      extra_monthly_saving: params.extra_monthly_saving || 0,
      income_change_percent: params.income_change_percent || 0,
      expense_change_percent: params.expense_change_percent || 0,
      extra_debt_payment: params.extra_debt_payment || 0,
      horizon_months: params.horizon_months || 24,
    },
    scenario_inputs: {
      extra_monthly_saving: params.extra_monthly_saving || 0,
      income_change_percent: params.income_change_percent || 0,
      expense_change_percent: params.expense_change_percent || 0,
      extra_debt_payment: params.extra_debt_payment || 0,
      horizon_months: params.horizon_months || 24,
    },
    projection_results: {
      final_net_worth: result.final_net_worth,
      net_worth_delta: result.net_worth_delta,
      total_savings_accumulated: result.total_savings,
      total_debt_remaining: result.total_debt_remaining,
      debt_payoff_months: result.debt_payoff_months,
      interest_saved: result.interest_saved,
      goal_simulation: result.goal_simulation,
    },
  }
}

// ─────────────────────────────────────────────
// BANKING & OPEN FINANCE READ TOOLS (FASE M)
// ─────────────────────────────────────────────

/**
 * Tool: get_bank_accounts
 * Consulta las cuentas bancarias registradas o sincronizadas del usuario
 */
export async function get_bank_accounts(ctx: ToolContext) {
  assertUser(ctx.userId)
  const accounts = await dal.getBankAccounts(ctx.userId)

  return {
    tool: 'get_bank_accounts',
    user_id: ctx.userId,
    status: 'SUCCESS',
    accounts_count: accounts.length,
    accounts: accounts.map((a) => ({
      id: a.id,
      institution_id: a.institution_id,
      institution_name: a.institution_name,
      account_name: a.account_name,
      account_type: a.account_type,
      currency: a.currency,
      masked_account_number: a.masked_account_number,
      current_balance: a.current_balance,
      available_balance: a.available_balance,
      is_active: a.is_active,
      last_synced_at: a.last_synced_at,
    })),
  }
}

/**
 * Tool: get_bank_balances
 * Obtiene un resumen consolidado de saldos bancarios por entidad y tipo de cuenta
 */
export async function get_bank_balances(ctx: ToolContext) {
  assertUser(ctx.userId)
  const accounts = await dal.getBankAccounts(ctx.userId)
  const active = accounts.filter((a) => a.is_active)

  const totalBalanceCop = active.reduce((sum, a) => sum + a.current_balance, 0)

  const byInstitution: Record<string, number> = {}
  const byType: Record<string, number> = {}

  for (const acc of active) {
    byInstitution[acc.institution_name] =
      (byInstitution[acc.institution_name] || 0) + acc.current_balance
    byType[acc.account_type] = (byType[acc.account_type] || 0) + acc.current_balance
  }

  return {
    tool: 'get_bank_balances',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_bank_balance_cop: totalBalanceCop,
    active_accounts_count: active.length,
    balances_by_institution: byInstitution,
    balances_by_account_type: byType,
    accounts_detail: active.map((a) => ({
      account_name: a.account_name,
      institution_name: a.institution_name,
      masked_number: a.masked_account_number,
      current_balance: a.current_balance,
      currency: a.currency,
    })),
  }
}

/**
 * Tool: get_bank_transactions
 * Consulta transacciones bancarias normalizadas del usuario con filtros opcionales
 */
export async function get_bank_transactions(
  ctx: ToolContext,
  params: {
    account_id?: string
    startDate?: string
    endDate?: string
    limit?: number
    transaction_type?: string
  } = {}
) {
  assertUser(ctx.userId)
  const transactions = await dal.getBankTransactions(
    ctx.userId,
    params.account_id,
    params.startDate,
    params.endDate
  )

  let filtered = transactions
  if (params.transaction_type) {
    filtered = filtered.filter((t) => t.transaction_type === params.transaction_type)
  }

  const limit = params.limit || 50
  const sliced = filtered.slice(0, limit)

  return {
    tool: 'get_bank_transactions',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_matched: filtered.length,
    returned_count: sliced.length,
    filters_applied: {
      account_id: params.account_id || null,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      transaction_type: params.transaction_type || null,
    },
    transactions: sliced.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      clean_merchant: t.clean_merchant,
      amount: t.amount,
      currency: t.currency,
      transaction_type: t.transaction_type,
      category: t.category,
      category_source: t.category_source,
      is_internal_transfer: t.is_internal_transfer,
      linked_income_id: t.linked_income_id,
      is_reconciled: t.is_reconciled,
    })),
  }
}

/**
 * Tool: get_bank_cash_flow
 * Calcula el flujo de caja bancario real separando dinero que entra/sale de transferencias internas
 */
export async function get_bank_cash_flow(
  ctx: ToolContext,
  params: { startDate?: string; endDate?: string } = {}
) {
  assertUser(ctx.userId)
  const transactions = await dal.getBankTransactions(
    ctx.userId,
    undefined,
    params.startDate,
    params.endDate
  )

  const summary = calcBankingCashFlow(transactions, params)

  return {
    tool: 'get_bank_cash_flow',
    user_id: ctx.userId,
    status: 'SUCCESS',
    ...summary,
  }
}

/**
 * Tool: get_bank_connections
 * Consulta las entidades financieras conectadas mediante Open Finance y su estado de consentimiento
 */
export async function get_bank_connections(ctx: ToolContext) {
  assertUser(ctx.userId)
  const connections = await dal.getBankConnections(ctx.userId)

  return {
    tool: 'get_bank_connections',
    user_id: ctx.userId,
    status: 'SUCCESS',
    connections_count: connections.length,
    connections: connections.map((c) => ({
      id: c.id,
      institution_id: c.institution_id,
      institution_name: c.institution_name,
      provider: c.provider,
      consent_status: c.consent_status,
      consent_scopes: c.consent_scopes,
      consent_expires_at: c.consent_expires_at,
      sync_status: c.sync_status,
      last_synced_at: c.last_synced_at,
      sync_error: c.sync_error,
    })),
  }
}

/**
 * Tool: get_financial_state
 * Retorna el estado financiero unificado y consolidado del usuario para el Financial Digital Twin.
 * Incluye ingresos (Shuffler vs Pizza Hut), gastos, flujo de caja, liquidez, deudas,
 * metas, inversiones, crypto, bancos y patrimonio neto sin duplicación.
 */
export async function get_financial_state(
  ctx: ToolContext,
  params: { month?: number; year?: number } = {}
) {
  assertUser(ctx.userId)
  const bundle = await dal.loadAllUserData(ctx.userId)
  const state = buildFinancialState(bundle, null, params)
  const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(ctx.userId))
  const baseline = snapshots.length > 0 ? snapshots[0] : null
  const changes = baseline ? FinancialChangeDetector.compareStateWithSnapshot(state, baseline) : null

  return {
    tool: 'get_financial_state',
    user_id: ctx.userId,
    status: 'SUCCESS',
    period: state.period,
    as_of: state.asOfDate,
    income: {
      total: state.income.total,
      shuffler: state.income.shuffler,
      pizza_hut: state.income.pizzaHut,
      other: state.income.other,
      transactions_count: state.income.transactionsCount,
    },
    expenses: {
      total: state.expenses.total,
      essential: state.expenses.essential,
      discretionary: state.expenses.discretionary,
      essential_ratio_pct: state.expenses.essentialRatio,
      by_category: state.expenses.byCategory,
    },
    cash_flow: {
      total_income: state.cashFlow.totalIncome,
      total_expenses: state.cashFlow.totalExpenses,
      net_operating_cash_flow: state.cashFlow.netOperatingCashFlow,
      savings_rate_pct: state.cashFlow.savingsRate,
      banking_net_cash_flow: state.cashFlow.bankingNetCashFlow,
      internal_transfers_volume: state.cashFlow.internalTransfersVolume,
    },
    liquidity: {
      cash_assets: state.liquidity.cashAssets,
      bank_liquid_assets: state.liquidity.bankLiquidAssets,
      total_liquid: state.liquidity.totalLiquid,
      runway_months: state.liquidity.runwayMonths,
      emergency_gap: state.liquidity.emergencyFundGap,
    },
    debt: {
      total_debt: state.debts.totalDebt,
      monthly_payment: state.debts.monthlyDebtService,
      debt_to_income_pct: state.debts.debtToIncomeRatio,
      debt_to_assets_pct: state.debts.debtToAssetsRatio,
      accounts_count: state.debts.accountsCount,
    },
    goals: {
      total_count: state.goals.totalCount,
      active_count: state.goals.activeCount,
      total_target: state.goals.totalTargetAmount,
      total_saved: state.goals.totalCurrentAmount,
      overall_progress_pct: state.goals.overallProgressPercent,
      on_track_count: state.goals.onTrackCount,
    },
    investments: {
      current_value: state.investments.currentValue,
      asset_count: state.investments.assetCount,
    },
    crypto: {
      total_crypto_cop: state.crypto.totalCryptoCop,
      total_crypto_usd: state.crypto.totalCryptoUsd,
      holdings_count: state.crypto.holdingsCount,
      wallets_count: state.crypto.walletsCount,
    },
    banking: {
      accounts_count: state.banking.connectedAccountsCount,
      total_balance_cop: state.banking.totalBalanceCop,
      active_connections: state.banking.activeConnectionsCount,
      last_synced_at: state.banking.lastSyncedAt,
    },
    net_worth: {
      total_assets: state.netWorth.totalAssets,
      total_liabilities: state.netWorth.totalLiabilities,
      net_worth: state.netWorth.netWorth,
      solvency_ratio: state.netWorth.solvencyRatio,
    },
    betting: {
      total_staked: state.betting.totalStaked,
      total_returned: state.betting.totalReturned,
      net_profit: state.betting.netProfit,
      roi_pct: state.betting.roiPercent,
      cash_flow_impact_pct: state.betting.cashFlowImpactPercent,
      is_investment: false,
    },
    changes: changes
      ? {
          baseline_date: baseline?.snapshot_date,
          net_worth_delta: changes.netWorth.absoluteDelta,
          net_worth_delta_pct: changes.netWorth.percentageDelta,
          income_delta: changes.income.absoluteDelta,
          expenses_delta: changes.expenses.absoluteDelta,
          debt_delta: changes.debt.absoluteDelta,
          liquidity_delta: changes.liquidity.absoluteDelta,
          key_findings: changes.keyFindings,
        }
      : null,
    scenarios: {
      projected_end_of_year_net_worth:
        state.netWorth.netWorth + state.cashFlow.netOperatingCashFlow * 3,
      trajectory_direction:
        state.cashFlow.netOperatingCashFlow > 0 ? 'ACCUMULATION' : 'BURN',
    },
    health_indicators: {
      liquidity_runway: state.healthIndicators.liquidityRunway.status,
      savings_rate: state.healthIndicators.savingsRate.status,
      debt_to_income: state.healthIndicators.debtToIncome.status,
      solvency_ratio: state.healthIndicators.solvencyRatio.status,
    },
  }
}

/**
 * Tool: get_recent_financial_events
 * Consulta los eventos financieros detectados recientemente para el usuario.
 */
export async function get_recent_financial_events(
  ctx: ToolContext,
  params: { category?: EventCategory; severity?: AlertSeverity; limit?: number } = {}
) {
  assertUser(ctx.userId)
  const bundle = await dal.loadAllUserData(ctx.userId)
  const state = buildFinancialState(bundle)
  const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(ctx.userId))
  const baseline = snapshots.length > 0 ? snapshots[0] : null
  const prefs = await dal.getAlertPreferences(ctx.userId)

  // Detect live events
  const liveEvents = EventEngine.detectEvents(state, baseline, prefs.thresholds, {
    budgets: bundle.budgets,
    goals: bundle.goals,
    debts: bundle.debts,
    cryptoHoldings: bundle.cryptoHoldings,
    bankConnections: bundle.bankConnections,
  })

  // Also query persisted events from DAL
  const persistedEvents = await dal.getFinancialEvents(ctx.userId, params)

  // Merge avoiding duplicate event IDs
  const eventMap = new Map<string, typeof liveEvents[0]>()
  for (const e of liveEvents) {
    if (params.category && e.category !== params.category) continue
    if (params.severity && e.severity !== params.severity) continue
    eventMap.set(e.id, e)
  }
  for (const e of persistedEvents) {
    eventMap.set(e.id, e)
  }

  let merged = Array.from(eventMap.values())
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  if (params.limit) {
    merged = merged.slice(0, params.limit)
  }

  return {
    tool: 'get_recent_financial_events',
    user_id: ctx.userId,
    status: 'SUCCESS',
    events_count: merged.length,
    events: merged.map((e) => ({
      id: e.id,
      type: e.type,
      category: e.category,
      severity: e.severity,
      title: e.title,
      description: e.description,
      metric: e.metric,
      current_value: e.current_value,
      previous_value: e.previous_value,
      delta: e.delta,
      timestamp: e.timestamp,
    })),
  }
}

/**
 * Tool: get_active_alerts
 * Consulta las alertas financieras activas o clasificadas por severidad.
 */
export async function get_active_alerts(
  ctx: ToolContext,
  params: { severity?: AlertSeverity; status?: AlertStatus | 'ALL' } = {}
) {
  assertUser(ctx.userId)
  const bundle = await dal.loadAllUserData(ctx.userId)
  const state = buildFinancialState(bundle)
  const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(ctx.userId))
  const baseline = snapshots.length > 0 ? snapshots[0] : null
  const prefs = await dal.getAlertPreferences(ctx.userId)

  const events = EventEngine.detectEvents(state, baseline, prefs.thresholds, {
    budgets: bundle.budgets,
    goals: bundle.goals,
    debts: bundle.debts,
    cryptoHoldings: bundle.cryptoHoldings,
    bankConnections: bundle.bankConnections,
  })

  // Sync with DAL to ensure persisted & deduplicated
  const alerts = await AlertCenter.syncAlerts(ctx.userId, events)
  const filtered = AlertCenter.filter(alerts, {
    status: params.status || 'UNREAD',
    severity: params.severity || 'ALL',
  })
  const counts = AlertCenter.getActiveCounts(alerts)

  return {
    tool: 'get_active_alerts',
    user_id: ctx.userId,
    status: 'SUCCESS',
    total_unread: counts.totalUnread,
    critical_count: counts.critical,
    warning_count: counts.warning,
    alerts: filtered.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      metric: a.metric,
      current_value: a.current_value,
      previous_value: a.previous_value,
      delta: a.delta,
      date: a.date,
      status: a.status,
    })),
  }
}

/**
 * Tool: get_financial_insights
 * Obtiene explicaciones e interpretaciones que diferencian DATO, CAMBIO e INTERPRETACIÓN grounded.
 */
export async function get_financial_insights(
  ctx: ToolContext,
  params: { area?: EventCategory } = {}
) {
  assertUser(ctx.userId)
  const bundle = await dal.loadAllUserData(ctx.userId)
  const state = buildFinancialState(bundle)
  const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(ctx.userId))
  const baseline = snapshots.length > 0 ? snapshots[0] : null
  const prefs = await dal.getAlertPreferences(ctx.userId)

  const events = EventEngine.detectEvents(state, baseline, prefs.thresholds, {
    budgets: bundle.budgets,
    goals: bundle.goals,
    debts: bundle.debts,
    cryptoHoldings: bundle.cryptoHoldings,
    bankConnections: bundle.bankConnections,
  })

  let insights = IntelligenceEngine.generateInsights(state, baseline, events)
  if (params.area) {
    insights = insights.filter((i) => i.area === params.area)
  }

  const prioritized = IntelligenceEngine.prioritizeIssues(events, state)

  return {
    tool: 'get_financial_insights',
    user_id: ctx.userId,
    status: 'SUCCESS',
    insights_count: insights.length,
    insights: insights.map((i) => ({
      id: i.id,
      area: i.area,
      fact: i.fact,
      change: i.change,
      interpretation: i.interpretation,
      confidence: i.confidence,
      impact: i.impact,
    })),
    prioritized_issues: prioritized.slice(0, 5),
  }
}

/**
 * Tool: get_financial_changes
 * Obtiene los cambios cuantitativos del usuario comparando el estado actual con snapshots históricos.
 */
export async function get_financial_changes(
  ctx: ToolContext,
  params: { benchmark?: 'previous_month' | 'two_months_ago' | 'previous_year' } = {}
) {
  assertUser(ctx.userId)
  const bundle = await dal.loadAllUserData(ctx.userId)
  const state = buildFinancialState(bundle)
  const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(ctx.userId))

  const benchmarkKey = params.benchmark || 'previous_month'
  const currentSnap: FinancialSnapshot = {
    id: 'current_temp',
    user_id: state.identity.userId,
    snapshot_date: state.asOfDate.split('T')[0],
    total_assets: state.assets.totalAssets,
    total_liabilities: state.liabilities.totalLiabilities,
    net_worth: state.netWorth.netWorth,
    monthly_income: state.income.total,
    monthly_expenses: state.expenses.total,
    free_cash_flow: state.cashFlow.netOperatingCashFlow,
    savings_rate_pct: state.cashFlow.savingsRate,
    liquid_assets: state.liquidity.totalLiquid,
    crypto_assets: state.crypto.totalCryptoCop,
    bank_assets: state.banking.totalBalanceCop,
    investments_value: state.investments.currentValue,
    total_debt: state.debts.totalDebt,
    created_at: state.asOfDate,
  }

  const benchmarks = FinancialChangeDetector.compareWithHistoricalBenchmarks(currentSnap, snapshots)
  const benchmarkMap: Record<string, typeof benchmarks.previousMonth> = {
    previous_month: benchmarks.previousMonth,
    two_months_ago: benchmarks.twoMonthsAgo,
    previous_year: benchmarks.previousYear,
  }
  const selectedBenchmark = benchmarkMap[benchmarkKey] || benchmarks.previousMonth

  return {
    tool: 'get_financial_changes',
    user_id: ctx.userId,
    status: 'SUCCESS',
    benchmark: benchmarkKey,
    current_period: state.period,
    baseline_date: selectedBenchmark?.baselineDate || null,
    changes: selectedBenchmark
      ? {
          income: selectedBenchmark.changes.income,
          expenses: selectedBenchmark.changes.expenses,
          net_worth: selectedBenchmark.changes.netWorth,
          debt: selectedBenchmark.changes.debt,
          liquidity: selectedBenchmark.changes.liquidity,
          crypto: selectedBenchmark.changes.crypto,
          savings_rate: selectedBenchmark.changes.savingsRate,
          key_findings: selectedBenchmark.changes.keyFindings,
        }
      : null,
  }
}

/**
 * Tool: get_copilot_context
 * Returns unified proactive copilot context encompassing financial state, recent changes,
 * active alerts, prioritized insights, goals, debts, budgets, crypto, banking, and betting.
 */
export async function get_copilot_context(
  ctx: ToolContext,
  params: { period?: string } = {}
) {
  assertUser(ctx.userId)
  const context = await CopilotContextBuilder.build(ctx.userId, params.period)

  return {
    tool: 'get_copilot_context',
    user_id: ctx.userId,
    status: 'SUCCESS',
    context,
  }
}

/**
 * Tool: get_nexus_today
 * Returns executive proactive summary ("NEXUS TODAY") with current state,
 * relevant changes, active alerts, goals, debts, and what to check.
 */
export async function get_nexus_today(
  ctx: ToolContext,
  params: { period?: string } = {}
) {
  assertUser(ctx.userId)
  const summary = await ProactiveCopilotService.generateNexusToday(ctx.userId, params.period)

  return {
    tool: 'get_nexus_today',
    user_id: ctx.userId,
    status: 'SUCCESS',
    summary,
  }
}

/**
 * Tool: explain_financial_change
 * Returns structured explanation (DATO, CAMBIO, CONTEXTO, ESCENARIO) for a specific financial metric.
 * Strictly adheres to empirical data without ungrounded causal claims.
 */
export async function explain_financial_change(
  ctx: ToolContext,
  params: { metric: string; period?: string }
) {
  assertUser(ctx.userId)
  if (!params.metric || typeof params.metric !== 'string') {
    throw new Error('explain_financial_change requires a valid "metric" parameter (e.g. "expenses", "net_worth", "liquidity", "crypto", "debt")')
  }

  const explanation = await ProactiveCopilotService.explainChange(ctx.userId, params.metric, params.period)

  return {
    tool: 'explain_financial_change',
    user_id: ctx.userId,
    status: 'SUCCESS',
    metric: params.metric,
    explanation,
  }
}

