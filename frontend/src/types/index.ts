// NEXUS Finance - Core TypeScript Types

export type IncomeSource = 'Shuffler' | 'Pizza Hut' | string;

export type IncomeType = 
  | 'salary' 
  | 'bonus' 
  | 'surcharge' 
  | 'extra_hours' 
  | 'hourly_wage' 
  | 'other';

export interface Income {
  id: string;
  date: string;
  source: IncomeSource;
  description: string;
  amount: number;
  income_type: IncomeType;
  base_salary?: number;
  bonus_amount?: number;
  surcharges_amount?: number;
  extra_hours_amount?: number;
  other_payments_amount?: number;
  hours_worked?: number;
  hourly_rate?: number;
  account?: string;
  is_recurring: boolean;
  notes?: string;
  created_at?: string;
}

export type ExpenseCategory = 
  | 'vivienda'
  | 'alimentacion'
  | 'transporte'
  | 'educacion'
  | 'servicios'
  | 'tecnologia'
  | 'entretenimiento'
  | 'compras'
  | 'salud'
  | 'suscripciones'
  | 'otros';

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory | string;
  amount: number;
  account?: string;
  payment_method: 'debit' | 'credit' | 'cash' | 'transfer';
  is_recurring: boolean;
  is_essential: boolean;
  notes?: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  month: number;
  year: number;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  priority: 'alta' | 'media' | 'baja';
  category: string;
  status: 'active' | 'completed' | 'paused';
  created_at?: string;
}

export interface Debt {
  id: string;
  entity: string;
  name: string;
  debt_type: 'credit_card' | 'loan' | 'consumer' | 'mortgage' | 'other';
  initial_balance: number;
  current_balance: number;
  interest_rate_ea: number; // Effective Annual Rate (%)
  minimum_payment: number;
  payment_day: number;
  term_months?: number;
  notes?: string;
  created_at?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: 'cash' | 'bank_accounts' | 'savings' | 'investments' | 'cdt' | 'real_estate' | 'vehicles' | 'other';
  current_value: number;
  notes?: string;
}

export interface Liability {
  id: string;
  name: string;
  category: 'credit_cards' | 'personal_loans' | 'mortgages' | 'education' | 'other_debts';
  current_balance: number;
  notes?: string;
}

export interface InvestmentItem {
  id: string;
  asset_name: string;
  asset_type: 'stocks' | 'etf' | 'mutual_funds' | 'cdt' | 'bonds' | 'crypto' | 'other';
  quantity: number;
  purchase_price: number;
  current_price: number;
  platform?: string;
}

export interface BettingStat {
  total_staked: number;
  total_returned: number;
  net_profit: number;
  pending_bets: number;
}

export interface DashboardMetrics {
  total_income_month: number;
  income_by_source: {
    shuffler: number;
    pizza_hut: number;
    others: number;
  };
  total_expenses_month: number;
  free_cash_flow: number;
  total_debt: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  total_savings: number;
  total_invested: number;
  betting_allocated: number;
  active_goals_count: number;
  average_goals_progress: number;
}
