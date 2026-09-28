// ============================================================
// NEXUS FINANCE — Types
// Single source of truth for all TypeScript interfaces
// ============================================================

export type Currency = 'COP' | 'USD' | 'EUR'

export type IncomeSource = 'shuffler' | 'pizza_hut' | 'other'

export type TransactionType = 'income' | 'expense' | 'transfer' | 'betting'

export type BettingResult = 'won' | 'lost' | 'pending' | 'push' | 'cashed_out'

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'

export type DebtType = 'credit_card' | 'loan' | 'mortgage' | 'consumer' | 'other'

export type DebtStrategy = 'avalanche' | 'snowball'

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  currency: Currency
  primary_income_source: string
  secondary_income_source: string
  emergency_fund_months: number
  monthly_savings_target: number
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────
export interface Account {
  id: string
  user_id: string
  name: string
  account_type: 'bank' | 'wallet' | 'cash' | 'broker' | 'crypto_exchange'
  current_balance: number
  currency: Currency
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// INCOMES
// ─────────────────────────────────────────────
export interface Income {
  id: string
  user_id: string
  account_id: string | null
  date: string
  source: string
  income_source_key: IncomeSource
  description: string
  amount: number
  income_type: 'salary' | 'bonus' | 'surcharge' | 'extra_hours' | 'hourly_wage' | 'other'
  base_salary: number
  bonus_amount: number
  surcharges_amount: number
  extra_hours_amount: number
  other_payments_amount: number
  hours_worked: number
  hourly_rate: number
  is_recurring: boolean
  notes: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color: string
  is_custom: boolean
}

export interface Expense {
  id: string
  user_id: string
  account_id: string | null
  category_id: string | null
  category_name: string
  date: string
  description: string
  amount: number
  payment_method: 'debit' | 'credit' | 'cash' | 'transfer'
  is_recurring: boolean
  is_essential: boolean
  notes: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// BUDGETS
// ─────────────────────────────────────────────
export interface Budget {
  id: string
  user_id: string
  category_name: string
  month: number
  year: number
  budgeted_amount: number
  spent_amount?: number // calculated
  created_at: string
}

// ─────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────
export interface Goal {
  id: string
  user_id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_contribution: number
  priority: 'alta' | 'media' | 'baja'
  category: string
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  contribution_date: string
  notes: string | null
  created_at: string
}

export interface GoalProgress {
  goal: Goal
  progress_percent: number
  remaining: number
  months_to_goal: number | null
  projected_completion_date: string | null
  on_track: boolean
}

// ─────────────────────────────────────────────
// DEBTS
// ─────────────────────────────────────────────
export interface Debt {
  id: string
  user_id: string
  entity: string
  name: string
  debt_type: DebtType
  initial_balance: number
  current_balance: number
  interest_rate_ea: number
  minimum_payment: number
  payment_day: number | null
  term_months: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  principal_amount: number
  interest_amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// ASSETS & LIABILITIES
// ─────────────────────────────────────────────
export interface Asset {
  id: string
  user_id: string
  name: string
  category: string
  current_value: number
  notes: string | null
  created_at: string
}

export interface Liability {
  id: string
  user_id: string
  debt_id: string | null
  name: string
  category: string
  current_balance: number
  notes: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// INVESTMENTS
// ─────────────────────────────────────────────
export interface Investment {
  id: string
  user_id: string
  asset_name: string
  asset_type: 'stocks' | 'etf' | 'mutual_funds' | 'cdt' | 'bonds' | 'crypto' | 'other'
  quantity: number
  purchase_price: number
  current_price: number
  purchase_date: string
  platform: string | null
  commission: number
  notes: string | null
  created_at: string
}

// ─────────────────────────────────────────────
// BETTING
// ─────────────────────────────────────────────
export interface BettingTransaction {
  id: string
  user_id: string
  date: string
  platform: string
  sport: string
  bet_type: string | null
  stake_amount: number
  odds: number
  result: BettingResult
  return_amount: number
  net_profit: number
  notes: string | null
  created_at: string
}

export interface BettingMetrics {
  total_staked: number
  total_returned: number
  net_profit: number
  roi_percent: number
  win_rate_percent: number
  pending_count: number
  sessions_count: number
  income_percent: number // % of monthly income
}

// ─────────────────────────────────────────────
// FINANCIAL ENGINE OUTPUTS
// ─────────────────────────────────────────────
export interface IncomeBreakdown {
  total: number
  by_source: {
    source: IncomeSource
    label: string
    amount: number
    percent: number
    transactions: number
  }[]
}

export interface CashFlow {
  total_income: number
  total_expenses: number
  net: number
  savings_rate: number
}

export interface NetWorth {
  total_assets: number
  total_liabilities: number
  net_worth: number
  breakdown: {
    cash: number
    bank_accounts: number
    investments: number
    crypto: number
    other_assets: number
    debts: number
  }
}


// ─────────────────────────────────────────────
// DASHBOARD METRICS
// ─────────────────────────────────────────────
export interface DashboardMetrics {
  // Cash flow
  total_income_month: number
  total_expenses_month: number
  free_cash_flow: number
  savings_rate: number
  // By source
  income_by_source: {
    shuffler: number
    pizza_hut: number
    others: number
  }
  // Patrimony
  net_worth: number
  total_assets: number
  total_debt: number
  // Goals
  active_goals_count: number
  average_goals_progress: number
  // Investments
  total_invested: number
  // Betting
  betting_net_month: number
  betting_staked_month: number
}


// ─────────────────────────────────────────────
// SCENARIO ENGINE
// ─────────────────────────────────────────────
export interface ScenarioParams {
  name: string
  income_change_percent: number       // e.g. 0 = no change, 10 = +10%
  expense_change_percent: number
  extra_monthly_saving: number
  investment_return_percent: number   // annual
  inflation_percent: number           // annual
  months: number
}

export interface ScenarioDataPoint {
  month: number
  label: string
  net_worth: number
  savings_accumulated: number
  income: number
  expenses: number
}

export interface ScenarioResult {
  params: ScenarioParams
  data_points: ScenarioDataPoint[]
  final_net_worth: number
  total_savings: number
}

export interface AdvancedScenarioParams {
  name: string
  preset_type: 'actual' | 'ahorro' | 'deuda' | 'ingresos' | 'personalizado'
  income_change_percent: number
  expense_change_percent: number
  extra_monthly_saving: number
  extra_debt_payment: number
  investment_return_percent: number
  inflation_percent: number
  months: number
  selected_goal_id?: string | null
  simulated_goal_contribution?: number
  selected_debt_id?: string | null
  simulated_debt_payment?: number
}

export interface AdvancedScenarioDataPoint {
  month: number
  label: string
  net_worth: number
  baseline_net_worth: number
  savings_accumulated: number
  debt_balance: number
  baseline_debt_balance: number
  income: number
  expenses: number
}

export interface AdvancedScenarioResult {
  params: AdvancedScenarioParams
  data_points: AdvancedScenarioDataPoint[]
  final_net_worth: number
  baseline_final_net_worth: number
  net_worth_delta: number
  total_savings: number
  total_debt_remaining: number
  baseline_total_debt_remaining: number
  debt_payoff_months: number | null
  baseline_debt_payoff_months: number | null
  interest_saved: number
  goal_simulation?: {
    goal_name: string
    target_amount: number
    current_amount: number
    original_months: number | null
    simulated_months: number | null
    months_saved: number
    simulated_completion_date: string | null
  }
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export * from './crypto'
export * from './banking'
export * from './digital-twin'
export * from './intelligence'
export * from './copilot'

