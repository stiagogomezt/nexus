// ============================================================
// NEXUS FINANCE — Digital Twin: Financial State Builder
// Pure derivation layer: Computes unified FinancialState from DAL bundle
// Zero side-effects, zero mutations, zero duplicate storage.
// ============================================================

import type { UserFinancialBundle } from '../dal'
import type { FinancialState, FinancialHealthIndicators, FinancialHealthIndicator } from '../../types/digital-twin'
import type { UserProfile, Income, Expense, BettingTransaction } from '../../types'
import {
  calcIncomeBreakdown,
  calcExpensesByCategory,
  calcEssentialExpenses,
  calcCashFlow,
  calcNetWorth,
  calcBankingCashFlow,
  calcBettingMetrics,
} from '../financial-engine'

export function buildFinancialState(
  bundle: UserFinancialBundle,
  userProfile?: Partial<UserProfile> | null,
  period?: { month?: number; year?: number }
): FinancialState {
  const currentMonth = period?.month ?? new Date().getMonth() + 1
  const currentYear = period?.year ?? new Date().getFullYear()
  const periodKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const asOfDate = new Date().toISOString()

  // 1. Filter period-specific incomes and expenses
  const periodIncomes = bundle.incomes.filter((i) => {
    const d = new Date(i.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })
  // Fall back to all incomes if current month is empty for new user simulation
  const effectiveIncomes = periodIncomes.length > 0 ? periodIncomes : bundle.incomes

  const periodExpenses = bundle.expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })
  const effectiveExpenses = periodExpenses.length > 0 ? periodExpenses : bundle.expenses

  // 2. Financial Engine: Income Breakdown
  const incomeBreakdown = calcIncomeBreakdown(effectiveIncomes)
  const shufflerIncome =
    incomeBreakdown.by_source.find((s) => s.source === 'shuffler')?.amount ?? 0
  const pizzaHutIncome =
    incomeBreakdown.by_source.find((s) => s.source === 'pizza_hut')?.amount ?? 0
  const otherIncome =
    incomeBreakdown.by_source.find((s) => s.source === 'other')?.amount ?? 0

  // Income variability (variance across available historical records)
  const incomeVariability =
    effectiveIncomes.length > 1
      ? Math.round(
          (Math.abs(shufflerIncome - pizzaHutIncome) /
            Math.max(1, incomeBreakdown.total)) *
            100
        )
      : 0

  // 3. Financial Engine: Expenses
  const totalExpenses = effectiveExpenses.reduce((s, e) => s + e.amount, 0)
  const essentialExpenses = calcEssentialExpenses(effectiveExpenses)
  const discretionaryExpenses = Math.max(0, totalExpenses - essentialExpenses)
  const expensesByCategory = calcExpensesByCategory(effectiveExpenses)
  const essentialRatio = totalExpenses > 0 ? (essentialExpenses / totalExpenses) * 100 : 0

  // 4. Financial Engine: Cash Flow
  const cashFlow = calcCashFlow(effectiveIncomes, effectiveExpenses)

  // 5. Financial Engine: Banking Cash Flow & Balances
  const bankAccounts = bundle.bankAccounts || []
  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0)
  const activeBankConnections = (bundle.bankConnections || []).filter(
    (c) => c.consent_status === 'active'
  )
  const bankTxs = (bundle.bankTransactions || []).map((t) => ({
    amount: t.amount,
    transaction_type: t.transaction_type,
    is_internal_transfer: t.is_internal_transfer,
    date: t.date,
  }))
  const bankingCashFlow = calcBankingCashFlow(bankTxs)

  // 6. Financial Engine: Crypto & Wallets
  const cryptoHoldings = bundle.cryptoHoldings || []
  const wallets = bundle.wallets || []
  const totalCryptoCop = cryptoHoldings.reduce((sum, h: any) => {
    if (typeof h.total_value_cop === 'number' && h.total_value_cop > 0) {
      return sum + h.total_value_cop
    }
    const qty = h.quantity ?? h.total_quantity ?? 0
    const priceCop =
      h.purchase_price_cop > 0
        ? h.purchase_price_cop * 1.25
        : (h.purchase_price_usd || 100) * 4150 * 1.25
    return sum + qty * priceCop
  }, 0)
  const totalCryptoUsd = totalCryptoCop / 4150
  const unrealizedCryptoPnlCop = cryptoHoldings.reduce((sum, h: any) => {
    if (typeof h.unrealized_pnl_cop === 'number') {
      return sum + h.unrealized_pnl_cop
    }
    const qty = h.quantity ?? h.total_quantity ?? 0
    const costBasis =
      (h.purchase_price_cop || (h.purchase_price_usd || 0) * 4150) * qty
    const currentValue =
      (h.purchase_price_cop > 0
        ? h.purchase_price_cop * 1.25
        : (h.purchase_price_usd || 100) * 4150 * 1.25) * qty
    return sum + (currentValue - costBasis)
  }, 0)

  const walletBlockchains = Array.from(new Set(wallets.map((w) => w.blockchain)))
  const totalWalletBalanceCop = totalCryptoCop

  // 7. Financial Engine: Net Worth (Deduplicated)
  const netWorthResult = calcNetWorth(
    bundle.assets || [],
    bundle.liabilities || [],
    [], // investments passed separately if legacy
    bundle.debts || [],
    totalCryptoCop,
    totalBankBalance
  )

  // 8. Liquidity & Runway
  const cashAssets = (bundle.assets || [])
    .filter((a) => a.category === 'cash')
    .reduce((sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0), 0)
  const totalLiquid = cashAssets + totalBankBalance
  const monthlyBurn = essentialExpenses > 0 ? essentialExpenses : Math.max(1, totalExpenses)
  const runwayMonths = monthlyBurn > 0 ? Number((totalLiquid / monthlyBurn).toFixed(1)) : 0
  const emergencyTargetMonths = userProfile?.emergency_fund_months || 6
  const targetEmergencyFund = monthlyBurn * emergencyTargetMonths
  const emergencyFundGap = Math.max(0, targetEmergencyFund - totalLiquid)

  // 9. Debts & Service
  const debts = bundle.debts || []
  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0)
  const monthlyDebtService = debts.reduce(
    (sum, d) => sum + (d.minimum_payment ?? (d as any).min_monthly_payment ?? 0),
    0
  )
  const debtToIncomeRatio =
    cashFlow.total_income > 0 ? (monthlyDebtService / cashFlow.total_income) * 100 : 0
  const debtToAssetsRatio =
    netWorthResult.total_assets > 0 ? (totalDebt / netWorthResult.total_assets) * 100 : 0
  const weightedInterestRateEa =
    totalDebt > 0
      ? debts.reduce((sum, d) => sum + d.interest_rate_ea * d.current_balance, 0) / totalDebt
      : 0

  // 10. Goals Progress
  const goals = bundle.goals || []
  const activeGoals = goals.filter((g) => g.status === 'active')
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.current_amount, 0)
  const overallProgressPercent =
    totalTargetAmount > 0
      ? Math.min(100, Math.round((totalCurrentAmount / totalTargetAmount) * 100))
      : 0
  const onTrackGoals = activeGoals.filter((g) => {
    if (!g.target_date || g.monthly_contribution <= 0) return true
    const remaining = Math.max(0, g.target_amount - g.current_amount)
    const monthsNeeded = remaining / g.monthly_contribution
    const targetDate = new Date(g.target_date)
    const now = new Date()
    const monthsAvailable =
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
    return monthsNeeded <= monthsAvailable
  })

  // 11. Investments
  const investmentsAssets = (bundle.assets || []).filter(
    (a) => a.category === 'investment' || a.category === 'investments'
  )
  const investmentsValue = investmentsAssets.reduce(
    (sum, a) => sum + (a.current_value ?? (a as any).estimated_value ?? 0),
    0
  )

  // 12. Betting Metrics (Strictly NOT an investment)
  const bets = (bundle as { bets?: BettingTransaction[] }).bets || []
  const bettingMetrics = calcBettingMetrics(bets, cashFlow.total_income)

  // 13. Financial Health Indicators
  const healthIndicators = computeHealthIndicators({
    runwayMonths,
    emergencyTargetMonths,
    savingsRate: cashFlow.savings_rate,
    debtToIncomeRatio,
    totalAssets: netWorthResult.total_assets,
    totalLiabilities: netWorthResult.total_liabilities,
    onTrackGoalsPercent:
      activeGoals.length > 0 ? (onTrackGoals.length / activeGoals.length) * 100 : 100,
    cashFlowMargin:
      cashFlow.total_income > 0 ? (cashFlow.net / cashFlow.total_income) * 100 : 0,
  })

  const userId =
    userProfile?.id ||
    (bundle.incomes[0]?.user_id ?? bundle.expenses[0]?.user_id ?? 'usr_default')

  return {
    period: periodKey,
    asOfDate,
    identity: {
      userId,
      currency: userProfile?.currency || 'COP',
      primaryIncomeSource: userProfile?.primary_income_source || 'Shuffler',
      secondaryIncomeSource: userProfile?.secondary_income_source || 'Pizza Hut',
    },
    income: {
      total: incomeBreakdown.total,
      shuffler: shufflerIncome,
      pizzaHut: pizzaHutIncome,
      other: otherIncome,
      transactionsCount: effectiveIncomes.length,
      variabilityPercent: incomeVariability,
      breakdown: incomeBreakdown,
    },
    expenses: {
      total: totalExpenses,
      essential: essentialExpenses,
      discretionary: discretionaryExpenses,
      essentialRatio,
      byCategory: expensesByCategory,
      transactionsCount: effectiveExpenses.length,
    },
    cashFlow: {
      totalIncome: cashFlow.total_income,
      totalExpenses: cashFlow.total_expenses,
      netOperatingCashFlow: cashFlow.net,
      savingsRate: Number(cashFlow.savings_rate.toFixed(1)),
      bankingNetCashFlow: bankingCashFlow.net_cash_flow,
      internalTransfersVolume: bankingCashFlow.internal_transfers_volume,
    },
    liquidity: {
      cashAssets,
      bankLiquidAssets: totalBankBalance,
      totalLiquid,
      runwayMonths,
      emergencyTargetMonths,
      emergencyFundGap,
    },
    debts: {
      totalDebt,
      monthlyDebtService,
      debtToIncomeRatio: Number(debtToIncomeRatio.toFixed(1)),
      debtToAssetsRatio: Number(debtToAssetsRatio.toFixed(1)),
      accountsCount: debts.length,
      weightedInterestRateEa: Number(weightedInterestRateEa.toFixed(2)),
      debtsList: debts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: d.current_balance,
        minPayment: d.minimum_payment,
        rateEa: d.interest_rate_ea,
      })),
    },
    savings: {
      monthlySavings: Math.max(0, cashFlow.net),
      cumulativeSavings: totalLiquid,
      savingsRate: Number(cashFlow.savings_rate.toFixed(1)),
    },
    goals: {
      totalCount: goals.length,
      activeCount: activeGoals.length,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgressPercent,
      onTrackCount: onTrackGoals.length,
      goalsList: activeGoals.map((g) => ({
        id: g.id,
        name: g.name,
        target: g.target_amount,
        current: g.current_amount,
        progressPercent:
          g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0,
        onTrack: onTrackGoals.some((ot) => ot.id === g.id),
      })),
    },
    investments: {
      totalInvested: investmentsValue,
      currentValue: investmentsValue,
      unrealizedPnl: 0,
      pnlPercent: 0,
      assetCount: investmentsAssets.length,
    },
    crypto: {
      totalCryptoCop,
      totalCryptoUsd: Number(totalCryptoUsd.toFixed(2)),
      holdingsCount: cryptoHoldings.length,
      walletsCount: wallets.length,
      unrealizedPnlCop: unrealizedCryptoPnlCop,
    },
    wallets: {
      activeWalletsCount: wallets.length,
      totalBalanceCop: totalWalletBalanceCop,
      blockchains: walletBlockchains,
    },
    banking: {
      connectedAccountsCount: bankAccounts.length,
      totalBalanceCop: totalBankBalance,
      activeConnectionsCount: activeBankConnections.length,
      lastSyncedAt: activeBankConnections[0]?.last_synced_at || null,
    },
    assets: {
      totalAssets: netWorthResult.total_assets,
      breakdown: {
        cash: netWorthResult.breakdown.cash,
        bankAccounts: netWorthResult.breakdown.bank_accounts,
        investments: netWorthResult.breakdown.investments,
        crypto: netWorthResult.breakdown.crypto,
        otherAssets: netWorthResult.breakdown.other_assets,
      },
    },
    liabilities: {
      totalLiabilities: netWorthResult.total_liabilities,
      breakdown: {
        debts: totalDebt,
        otherLiabilities: Math.max(0, netWorthResult.total_liabilities - totalDebt),
      },
    },
    netWorth: {
      totalAssets: netWorthResult.total_assets,
      totalLiabilities: netWorthResult.total_liabilities,
      netWorth: netWorthResult.net_worth,
      solvencyRatio:
        netWorthResult.total_liabilities > 0
          ? Number((netWorthResult.total_assets / netWorthResult.total_liabilities).toFixed(2))
          : 99.9,
    },
    betting: {
      totalStaked: bettingMetrics.total_staked,
      totalReturned: bettingMetrics.total_returned,
      netProfit: bettingMetrics.net_profit,
      roiPercent: Number(bettingMetrics.roi_percent.toFixed(2)),
      winRatePercent: Number(bettingMetrics.win_rate_percent.toFixed(1)),
      sessionsCount: bettingMetrics.sessions_count,
      cashFlowImpactPercent: Number(bettingMetrics.income_percent.toFixed(1)),
      isInvestment: false, // Explicit separation
    },
    healthIndicators,
  }
}

function computeHealthIndicators(params: {
  runwayMonths: number
  emergencyTargetMonths: number
  savingsRate: number
  debtToIncomeRatio: number
  totalAssets: number
  totalLiabilities: number
  onTrackGoalsPercent: number
  cashFlowMargin: number
}): FinancialHealthIndicators {
  const {
    runwayMonths,
    emergencyTargetMonths,
    savingsRate,
    debtToIncomeRatio,
    totalAssets,
    totalLiabilities,
    onTrackGoalsPercent,
    cashFlowMargin,
  } = params

  const solvency =
    totalLiabilities > 0 ? totalAssets / totalLiabilities : totalAssets > 0 ? 10 : 1

  return {
    liquidityRunway: {
      value: runwayMonths,
      unit: 'months',
      status:
        runwayMonths >= 6
          ? 'excellent'
          : runwayMonths >= 3
          ? 'good'
          : runwayMonths >= 1
          ? 'fair'
          : 'critical',
      benchmark: '≥ 3 a 6 meses de gastos esenciales',
      label: 'Colchón de Liquidez',
    },
    savingsRate: {
      value: Number(savingsRate.toFixed(1)),
      unit: 'percent',
      status:
        savingsRate >= 25
          ? 'excellent'
          : savingsRate >= 15
          ? 'good'
          : savingsRate >= 5
          ? 'fair'
          : 'critical',
      benchmark: '≥ 20% del ingreso mensual',
      label: 'Tasa de Ahorro',
    },
    debtToIncome: {
      value: Number(debtToIncomeRatio.toFixed(1)),
      unit: 'percent',
      status:
        debtToIncomeRatio <= 20
          ? 'excellent'
          : debtToIncomeRatio <= 35
          ? 'good'
          : debtToIncomeRatio <= 50
          ? 'fair'
          : 'critical',
      benchmark: '≤ 35% del ingreso mensual',
      label: 'Carga de Deuda (DTI)',
    },
    solvencyRatio: {
      value: Number(solvency.toFixed(2)),
      unit: 'ratio',
      status:
        solvency >= 2.0
          ? 'excellent'
          : solvency >= 1.3
          ? 'good'
          : solvency >= 1.0
          ? 'fair'
          : 'critical',
      benchmark: '≥ 1.5x (Activos / Pasivos)',
      label: 'Solvencia Patrimonial',
    },
    emergencyFundCoverage: {
      value: Number(Math.min(runwayMonths, emergencyTargetMonths).toFixed(1)),
      unit: 'months',
      status:
        runwayMonths >= emergencyTargetMonths
          ? 'excellent'
          : runwayMonths >= emergencyTargetMonths / 2
          ? 'good'
          : 'fair',
      benchmark: `Meta: ${emergencyTargetMonths} meses`,
      label: 'Fondo de Emergencia',
    },
    goalsHealth: {
      value: Math.round(onTrackGoalsPercent),
      unit: 'percent',
      status:
        onTrackGoalsPercent >= 80
          ? 'excellent'
          : onTrackGoalsPercent >= 60
          ? 'good'
          : onTrackGoalsPercent >= 40
          ? 'fair'
          : 'critical',
      benchmark: '≥ 70% de metas en cronograma',
      label: 'Progreso de Metas',
    },
    cashFlowMargin: {
      value: Number(cashFlowMargin.toFixed(1)),
      unit: 'percent',
      status:
        cashFlowMargin >= 20
          ? 'excellent'
          : cashFlowMargin >= 10
          ? 'good'
          : cashFlowMargin >= 0
          ? 'fair'
          : 'critical',
      benchmark: '≥ 15% margen operativo',
      label: 'Margen de Flujo Libre',
    },
  }
}
