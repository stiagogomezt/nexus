// ============================================================
// NEXUS FINANCE — Types: Financial Digital Twin & Financial State
// Single source of truth for unified financial state and twin models
// ============================================================

import type { Currency, IncomeBreakdown, CashFlow, NetWorth, BettingMetrics, GoalProgress, Debt } from './index'

export interface FinancialHealthIndicator {
  value: number
  unit: 'months' | 'percent' | 'ratio'
  status: 'excellent' | 'good' | 'fair' | 'critical'
  benchmark: string
  label: string
}

export interface FinancialHealthIndicators {
  liquidityRunway: FinancialHealthIndicator
  savingsRate: FinancialHealthIndicator
  debtToIncome: FinancialHealthIndicator
  solvencyRatio: FinancialHealthIndicator
  emergencyFundCoverage: FinancialHealthIndicator
  goalsHealth: FinancialHealthIndicator
  cashFlowMargin: FinancialHealthIndicator
}

export interface FinancialState {
  period: string               // e.g. "2026-09"
  asOfDate: string             // ISO string
  identity: {
    userId: string
    currency: Currency
    primaryIncomeSource: string
    secondaryIncomeSource: string
  }
  income: {
    total: number
    shuffler: number
    pizzaHut: number
    other: number
    transactionsCount: number
    variabilityPercent: number
    breakdown: IncomeBreakdown
  }
  expenses: {
    total: number
    essential: number
    discretionary: number
    essentialRatio: number
    byCategory: Record<string, number>
    transactionsCount: number
  }
  cashFlow: {
    totalIncome: number
    totalExpenses: number
    netOperatingCashFlow: number
    savingsRate: number
    bankingNetCashFlow: number
    internalTransfersVolume: number
  }
  liquidity: {
    cashAssets: number
    bankLiquidAssets: number
    totalLiquid: number
    runwayMonths: number
    emergencyTargetMonths: number
    emergencyFundGap: number
  }
  debts: {
    totalDebt: number
    monthlyDebtService: number
    debtToIncomeRatio: number
    debtToAssetsRatio: number
    accountsCount: number
    weightedInterestRateEa: number
    debtsList: Array<{
      id: string
      name: string
      balance: number
      minPayment: number
      rateEa: number
    }>
  }
  savings: {
    monthlySavings: number
    cumulativeSavings: number
    savingsRate: number
  }
  goals: {
    totalCount: number
    activeCount: number
    totalTargetAmount: number
    totalCurrentAmount: number
    overallProgressPercent: number
    onTrackCount: number
    goalsList: Array<{
      id: string
      name: string
      target: number
      current: number
      progressPercent: number
      onTrack: boolean
    }>
  }
  investments: {
    totalInvested: number
    currentValue: number
    unrealizedPnl: number
    pnlPercent: number
    assetCount: number
  }
  crypto: {
    totalCryptoCop: number
    totalCryptoUsd: number
    holdingsCount: number
    walletsCount: number
    unrealizedPnlCop: number
  }
  wallets: {
    activeWalletsCount: number
    totalBalanceCop: number
    blockchains: string[]
  }
  banking: {
    connectedAccountsCount: number
    totalBalanceCop: number
    activeConnectionsCount: number
    lastSyncedAt: string | null
  }
  assets: {
    totalAssets: number
    breakdown: {
      cash: number
      bankAccounts: number
      investments: number
      crypto: number
      otherAssets: number
    }
  }
  liabilities: {
    totalLiabilities: number
    breakdown: {
      debts: number
      otherLiabilities: number
    }
  }
  netWorth: {
    totalAssets: number
    totalLiabilities: number
    netWorth: number
    solvencyRatio: number // Assets / Liabilities
  }
  betting: {
    totalStaked: number
    totalReturned: number
    netProfit: number
    roiPercent: number
    winRatePercent: number
    sessionsCount: number
    cashFlowImpactPercent: number // Staked / Monthly Income
    isInvestment: false           // STRICT RULE: Bet is NEVER treated as investment
  }
  healthIndicators: FinancialHealthIndicators
}

export interface FinancialSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  snapshot_frequency?: 'daily' | 'weekly' | 'monthly' | 'manual'
  total_assets: number
  total_liabilities: number
  net_worth: number
  monthly_income: number
  monthly_expenses: number
  free_cash_flow: number
  savings_rate_pct: number
  liquid_assets?: number
  crypto_assets?: number
  bank_assets?: number
  investments_value?: number
  total_debt?: number
  state_payload?: Partial<FinancialState>
  created_at: string
}

export interface MetricDelta {
  current: number
  previous: number
  absoluteDelta: number
  percentageDelta: number
  direction: 'increase' | 'decrease' | 'unchanged'
}

export interface FinancialChanges {
  income: MetricDelta
  expenses: MetricDelta
  netWorth: MetricDelta
  debt: MetricDelta
  liquidity: MetricDelta
  crypto: MetricDelta
  investments: MetricDelta
  cashFlow?: MetricDelta
  banking?: MetricDelta
  goals?: MetricDelta
  savingsRate: {
    current: number
    previous: number
    deltaPoints: number
  }
  keyFindings: string[]
}

export interface SnapshotComparison {
  currentDate: string
  baselineDate: string
  changes: FinancialChanges
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface FinancialAnomaly {
  id: string
  type:
    | 'unusual_expense'
    | 'unusual_income'
    | 'liquidity_drop'
    | 'debt_spike'
    | 'net_worth_drop'
    | 'crypto_volatility'
    | 'betting_exposure'
  severity: AnomalySeverity
  title: string
  description: string
  detectedValue: number
  baselineValue: number
  timestamp: string
}

export interface DigitalTwinTrajectoryPoint {
  year: number
  month: number
  label: string
  type: 'real' | 'projected'
  netWorth: number
  totalDebt: number
  savings: number
  goalsProgress: number
}

export interface FinancialDigitalTwin {
  snapshotDate: string
  asOf: string
  currentState: FinancialState
  historicalTrajectory: FinancialSnapshot[]
  projectedTrajectory: DigitalTwinTrajectoryPoint[]
  healthSummary: {
    status: 'OPTIMAL' | 'STABLE' | 'ATTENTION' | 'CRITICAL'
    headline: string
    indicators: FinancialHealthIndicators
  }
  anomalies: FinancialAnomaly[]
  recommendations: string[]
}
