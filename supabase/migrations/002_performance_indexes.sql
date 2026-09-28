-- ============================================================================
-- NEXUS FINANCE - Migration 002: Performance Indexes & Constraints
-- Additive & Non-destructive: Does NOT drop or alter existing tables.
-- ============================================================================

-- Fast lookup for user-scoped transactions by date
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_cat_date ON public.expenses (user_id, category_name, date);

-- Fast lookup for monthly budget tracking
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets (user_id, year, month);

-- Fast lookup for active debts & goals
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_user_balance ON public.debts (user_id, current_balance DESC);

-- Fast lookup for assets & liabilities
CREATE INDEX IF NOT EXISTS idx_assets_user ON public.assets (user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user ON public.liabilities (user_id);
