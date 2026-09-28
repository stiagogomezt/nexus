/**
 * NEXUS Finance — Fase P: Proactive Financial Copilot Types
 * Defines comprehensive models for proactive intelligence, context synthesis,
 * non-alarmist grounded explanations, domain analysis, and scenario bridges.
 */

import type { FinancialState } from './digital-twin'
import type { FinancialAlert, IntelligenceInsight } from './intelligence'
import type { AdvancedScenarioParams } from './index'

export interface FinancialChangeItem {
  metric: string
  label: string
  currentValue: number
  previousValue: number
  percentageDelta: number
  absoluteDelta: number
  direction: 'increase' | 'decrease' | 'unchanged'
  description: string
}

// ─────────────────────────────────────────────
// 1. COPILOT CONTEXT (Unified Read-Only Snapshot)
// ─────────────────────────────────────────────

export interface CopilotContextGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  monthly_contribution: number
  target_date: string | null
  projected_date: string | null
  progress_pct: number
  is_on_track: boolean
  deviation_months: number
  suggested_action?: string
  scenario_preset?: 'ahorro' | 'personalizado'
}

export interface CopilotContextDebt {
  id: string
  name: string
  current_balance: number
  minimum_payment: number
  interest_rate_ea: number
  debt_type: string
  projected_payoff_months: number | null
  suggested_action?: string
  scenario_preset?: 'deuda' | 'personalizado'
}

export interface CopilotContextBudget {
  id: string
  category_name: string
  budgeted_amount: number
  spent_amount: number
  remaining_amount: number
  pct_used: number
  status: 'normal' | 'warning' | 'critical'
  suggested_action?: string
}

export interface CopilotContextCryptoHolding {
  symbol: string
  name: string
  quantity: number
  holding_value_cop: number
  spot_price_usd: number
  unrealized_pnl_cop: number
  unrealized_pnl_pct: number
  pct_of_net_worth: number
}

export interface CopilotContext {
  as_of: string
  user_id: string
  financial_state: FinancialState
  recent_changes: FinancialChangeItem[]
  active_alerts: FinancialAlert[]
  top_insights: IntelligenceInsight[]
  goals: CopilotContextGoal[]
  debts: CopilotContextDebt[]
  budgets: CopilotContextBudget[]
  cash_flow: {
    total_income: number
    total_expenses: number
    net_cash_flow: number
    savings_rate: number
  }
  net_worth: {
    total_assets: number
    total_liabilities: number
    net_worth: number
  }
  crypto: {
    total_value_cop: number
    total_value_usd: number
    unrealized_pnl_cop: number
    assets_count: number
    holdings: CopilotContextCryptoHolding[]
  }
  banking: {
    connections_count: number
    accounts_count: number
    total_bank_balance: number
    sync_issues_count: number
    recent_sync_status: string
  }
  betting: {
    total_wagered: number
    net_result: number
    loss_rate: number
    is_investment: false // Strictly non-investment
    cash_flow_impact_pct: number
  }
  investments: {
    total_value: number
    count: number
  }
}

// ─────────────────────────────────────────────
// 2. SCENARIO BRIDGE ACTION
// ─────────────────────────────────────────────

export interface ScenarioBridgeAction {
  title: string
  description: string
  recommended_preset: 'ahorro' | 'deuda' | 'ingresos' | 'gastos' | 'personalizado'
  suggested_params: Partial<AdvancedScenarioParams> & {
    horizon_months?: number
    extraSaving?: number
    incomeChange?: number
    expenseChange?: number
    extraDebtPayment?: number
    horizon?: number
    targetGoalId?: string
    targetDebtId?: string
    expense_reduction_pct?: number
  }
}

// ─────────────────────────────────────────────
// 3. PROACTIVE INSIGHT & EXPLANATION
// ─────────────────────────────────────────────

export type CopilotDomain =
  | 'liquidity'
  | 'debt'
  | 'budget'
  | 'goals'
  | 'net_worth'
  | 'crypto'
  | 'banking'
  | 'betting'

export interface ProactiveExplanation {
  dato: string         // DATO: verifiable observable fact
  cambio: string       // CAMBIO: quantitative variation ($ or %)
  contexto: string     // CONTEXTO: grounded context without claiming unverified causality
  escenario?: string   // ESCENARIO: constructive scenario exploration
  scenario_bridge?: ScenarioBridgeAction
}

export interface ProactiveInsight {
  id: string
  domain: CopilotDomain
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  priority_score: number // transparent multi-criteria formula (magnitude, urgency, goal impact)
  explanation: ProactiveExplanation
  check_route: string // navigation route e.g. 'gastos', 'deudas', 'metas', 'bancos', 'laboratorio'
  action_label: string // e.g. "Revisar Presupuesto", "Simular Aporte"
  created_at: string
}

// ─────────────────────────────────────────────
// 4. NEXUS TODAY (Executive Summary)
// ─────────────────────────────────────────────

export interface NexusTodaySummary {
  as_of: string
  headline: string
  estado: {
    patrimonio: number
    liquidez: number
    flujo_libre: number
    meses_runway: number
  }
  cambios: Array<{
    area: string
    delta_pct: number
    delta_cop: number
    direction: 'increase' | 'decrease' | 'neutral'
    description: string
  }>
  alertas_activas_count: number
  alertas_destacadas: FinancialAlert[]
  metas_resumen: {
    activas_count: number
    en_plan_count: number
    avance_global_pct: number
    meta_principal?: CopilotContextGoal
  }
  deudas_resumen: {
    total_deuda: number
    dti_pct: number
    cuota_mensual: number
  }
  que_deberias_revisar: ProactiveInsight[]
}

// ─────────────────────────────────────────────
// 5. DOMAIN COPILOT ANALYSES
// ─────────────────────────────────────────────

export interface GoalCopilotAnalysis {
  goal_id: string
  name: string
  target_amount: number
  current_amount: number
  progress_pct: number
  monthly_contribution: number
  target_date: string | null
  projected_date: string | null
  months_to_target: number | null
  months_available: number | null
  deviation_status: 'on_track' | 'accelerated' | 'delayed' | 'unfunded'
  explanation: ProactiveExplanation
  scenario_bridge?: ScenarioBridgeAction
}

export interface DebtCopilotAnalysis {
  debt_id: string
  name: string
  current_balance: number
  minimum_payment: number
  interest_rate_ea: number
  payoff_months: number | null
  interest_cost_forecast: number
  status: 'active' | 'accelerated' | 'attention_required'
  explanation: ProactiveExplanation
  scenario_bridge?: ScenarioBridgeAction
}

export interface BudgetCopilotAnalysis {
  category_name: string
  budgeted: number
  spent: number
  remaining: number
  pct_used: number
  trend: 'under' | 'nearing_limit' | 'exceeded'
  explanation: ProactiveExplanation
  scenario_bridge?: ScenarioBridgeAction
}

export interface CryptoCopilotAnalysis {
  total_value_cop: number
  total_value_usd: number
  spot_prices: Record<string, number>
  unrealized_pnl_cop: number
  unrealized_pnl_pct: number
  net_worth_weight_pct: number
  holdings_analysis: Array<{
    symbol: string
    holding_value_cop: number
    spot_price_usd: number
    unrealized_pnl_cop: number
    is_realized: false // explicitly distinguishes unrealized from realized
  }>
  explanation: ProactiveExplanation
}

export interface BankingCopilotAnalysis {
  connections_count: number
  total_balance_cop: number
  sync_issues_count: number
  sync_errors_count: number
  reconciliation_ok: boolean
  sync_issue_details?: string
  explanation: ProactiveExplanation
}

export interface BettingCopilotAnalysis {
  total_wagered: number
  net_result: number
  cash_flow_impact_pct: number
  is_investment: false // strictly verified
  explanation: ProactiveExplanation
}

// ─────────────────────────────────────────────
// 6. NOTIFICATION & COPILOT PREFERENCES
// ─────────────────────────────────────────────

export interface CopilotPreferences {
  user_id: string
  daily_brief_enabled: boolean
  weekly_review_enabled: boolean
  budget_alerts_enabled: boolean
  goal_alerts_enabled: boolean
  debt_alerts_enabled: boolean
  liquidity_alerts_enabled: boolean
  crypto_alerts_enabled: boolean
  banking_alerts_enabled: boolean
  updated_at: string
}

export const DEFAULT_COPILOT_PREFERENCES: CopilotPreferences = {
  user_id: '',
  daily_brief_enabled: true,
  weekly_review_enabled: true,
  budget_alerts_enabled: true,
  goal_alerts_enabled: true,
  debt_alerts_enabled: true,
  liquidity_alerts_enabled: true,
  crypto_alerts_enabled: true,
  banking_alerts_enabled: true,
  updated_at: new Date().toISOString(),
}

// ─────────────────────────────────────────────
// 7. CONVERSATION PERSISTENCE (Step 18)
// ─────────────────────────────────────────────

export interface AIConversationRecord {
  id: string
  user_id: string
  title: string
  context_snapshot?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AIMessageRecord {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  explanation_payload?: ProactiveExplanation | null
  scenario_params?: Partial<AdvancedScenarioParams> | null
  tools_executed?: string[]
  created_at: string
}
