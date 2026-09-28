// ============================================================
// NEXUS FINANCE — Types: Financial Intelligence & Event Engine
// Complete type system for Event Detection, Alert Center,
// Structured Insights, Daily Brief, and Weekly Review.
// ============================================================

import type { MetricDelta } from './digital-twin'

export type FinancialEventType =
  | 'INCOME_CHANGE'
  | 'EXPENSE_CHANGE'
  | 'EXPENSE_ANOMALY'
  | 'DEBT_CHANGE'
  | 'GOAL_DELAY'
  | 'GOAL_ACCELERATION'
  | 'LIQUIDITY_DROP'
  | 'LIQUIDITY_INCREASE'
  | 'NET_WORTH_CHANGE'
  | 'CRYPTO_CHANGE'
  | 'INVESTMENT_CHANGE'
  | 'BANK_SYNC_ERROR'
  | 'BANK_RECONCILIATION_ERROR'
  | 'BUDGET_THRESHOLD'
  | 'BETTING_CHANGE'

export type EventCategory =
  | 'income'
  | 'expense'
  | 'debt'
  | 'goal'
  | 'liquidity'
  | 'net_worth'
  | 'crypto'
  | 'investment'
  | 'banking'
  | 'budget'
  | 'betting'

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export type AlertStatus = 'UNREAD' | 'READ' | 'DISMISSED'

export interface FinancialEvent {
  id: string
  user_id: string
  type: FinancialEventType
  category: EventCategory
  severity: AlertSeverity
  title: string
  description: string
  metric: string
  current_value: number
  previous_value: number
  delta?: MetricDelta
  source: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface FinancialAlert {
  id: string
  user_id: string
  event_id?: string
  type: FinancialEventType
  date: string
  severity: AlertSeverity
  title: string
  description: string
  metric: string
  current_value: number
  previous_value: number
  delta: number
  source: string
  status: AlertStatus
  created_at: string
}

export interface IntelligenceInsight {
  id: string
  user_id: string
  area: EventCategory | 'general'
  fact: string           // DATO: Verifiable number or state
  change: string         // CAMBIO: Quantitative variation observed
  interpretation: string // INTERPRETACIÓN: Grounded explanation without unfounded causality
  confidence: 'high' | 'medium'
  impact: 'positive' | 'neutral' | 'negative'
  timestamp: string
}

export interface PrioritizedIssue {
  id: string
  area: EventCategory
  areaLabel: string
  event: FinancialEventType
  severity: AlertSeverity
  magnitude: string
  date: string
  status: AlertStatus
  title: string
  description: string
  recommendation?: string
}

export interface IntelligenceThresholds {
  expenseIncreasePct: number       // Default 20%
  debtIncreasePct: number          // Default 10%
  liquidityDropPct: number         // Default 15%
  liquidityCriticalMonths: number  // Default 1.5
  budgetWarningPct: number         // Default 80%
  budgetCriticalPct: number        // Default 100%
  netWorthChangePct: number        // Default 10%
  cryptoChangePct: number          // Default 15%
  bettingExposurePct: number       // Default 10% of monthly income
  goalDelayMonths: number          // Default 1
  incomeChangePct: number          // Default 15%
}

export const DEFAULT_INTELLIGENCE_THRESHOLDS: IntelligenceThresholds = {
  expenseIncreasePct: 20,
  debtIncreasePct: 10,
  liquidityDropPct: 15,
  liquidityCriticalMonths: 1.5,
  budgetWarningPct: 80,
  budgetCriticalPct: 100,
  netWorthChangePct: 10,
  cryptoChangePct: 15,
  bettingExposurePct: 10,
  goalDelayMonths: 1,
  incomeChangePct: 15,
}

export interface AlertPreferences {
  user_id: string
  budget_alerts_enabled: boolean
  debt_alerts_enabled: boolean
  liquidity_alerts_enabled: boolean
  crypto_alerts_enabled: boolean
  goals_alerts_enabled: boolean
  betting_alerts_enabled: boolean
  income_alerts_enabled: boolean
  thresholds: IntelligenceThresholds
  updated_at: string
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  user_id: '',
  budget_alerts_enabled: true,
  debt_alerts_enabled: true,
  liquidity_alerts_enabled: true,
  crypto_alerts_enabled: true,
  goals_alerts_enabled: true,
  betting_alerts_enabled: true,
  income_alerts_enabled: true,
  thresholds: DEFAULT_INTELLIGENCE_THRESHOLDS,
  updated_at: new Date().toISOString(),
}

export interface DailyBrief {
  date: string
  headline: string
  financialStateSummary: {
    netWorth: number
    liquidAssets: number
    monthlyIncome: number
    freeCashFlow: number
    runwayMonths: number
  }
  recentChanges: string[]
  activeAlertsCount: number
  criticalAlerts: FinancialAlert[]
  goalsSummary: string
  debtSummary: string
  cryptoSummary: string
  generatedAt: string
}

export interface WeeklyFinancialReview {
  weekLabel: string
  startDate: string
  endDate: string
  incomeDelta: { current: number; previous: number; deltaPct: number }
  expensesDelta: { current: number; previous: number; deltaPct: number }
  savingsDelta: { current: number; previous: number; deltaPct: number }
  debtDelta: { current: number; previous: number; deltaPct: number }
  netWorthDelta: { current: number; previous: number; deltaPct: number }
  cryptoDelta: { current: number; previous: number; deltaPct: number }
  goalsProgress: string
  executiveSummary: string
  highlights: string[]
}
