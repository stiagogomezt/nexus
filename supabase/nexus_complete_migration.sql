-- ============================================================================
-- NEXUS FINANCE — CONSOLIDATED FULL DATABASE INITIALIZATION
-- Migrations 001 through 007 + Colombian Default Category Seeds
-- Strictly Non-Destructive, Additive, and Multi-Tenant RLS Protected
-- Target: PostgreSQL 15+ / Supabase Cloud
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES & USER SETTINGS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    currency VARCHAR(10) DEFAULT 'COP',
    primary_income_source VARCHAR(50) DEFAULT 'Shuffler',
    secondary_income_source VARCHAR(50) DEFAULT 'Pizza Hut',
    emergency_fund_months INTEGER DEFAULT 6,
    monthly_savings_target NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. FINANCIAL ACCOUNTS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'bank',
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'COP',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INCOME SOURCES & TRANSACTIONS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    income_type VARCHAR(50) NOT NULL DEFAULT 'salary',
    base_salary NUMERIC(15, 2) DEFAULT 0.00,
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00,
    surcharges_amount NUMERIC(15, 2) DEFAULT 0.00,
    extra_hours_amount NUMERIC(15, 2) DEFAULT 0.00,
    other_payments_amount NUMERIC(15, 2) DEFAULT 0.00,
    hours_worked NUMERIC(6, 2) DEFAULT 0.00,
    hourly_rate NUMERIC(12, 2) DEFAULT 0.00,
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. EXPENSE CATEGORIES & TRANSACTIONS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'tag',
    color VARCHAR(20) DEFAULT '#6366f1',
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_preset_unique 
    ON public.categories (name) WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) DEFAULT 'debit',
    is_recurring BOOLEAN DEFAULT FALSE,
    is_essential BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BUDGETS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    budgeted_amount NUMERIC(15, 2) NOT NULL CHECK (budgeted_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, category_name, month, year)
);

-- ============================================================================
-- 6. FINANCIAL GOALS & CONTRIBUTIONS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    target_date DATE,
    monthly_contribution NUMERIC(15, 2) DEFAULT 0.00,
    priority VARCHAR(20) DEFAULT 'media',
    category VARCHAR(50) DEFAULT 'ahorro',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. DEBTS & DEBT PAYMENTS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity VARCHAR(150) NOT NULL,
    name VARCHAR(150) NOT NULL,
    debt_type VARCHAR(50) NOT NULL DEFAULT 'credit_card',
    initial_balance NUMERIC(15, 2) NOT NULL CHECK (initial_balance >= 0),
    current_balance NUMERIC(15, 2) NOT NULL CHECK (current_balance >= 0),
    interest_rate_ea NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    minimum_payment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
    term_months INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    principal_amount NUMERIC(15, 2) DEFAULT 0.00,
    interest_amount NUMERIC(15, 2) DEFAULT 0.00,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. ASSETS & LIABILITIES (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_value >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. INVESTMENTS (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 1.000000,
    purchase_price NUMERIC(15, 2) NOT NULL,
    current_price NUMERIC(15, 2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100),
    commission NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. BETTING TRACKER (Migration 001)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.betting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    bet_type VARCHAR(100),
    stake_amount NUMERIC(15, 2) NOT NULL CHECK (stake_amount >= 0),
    odds NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    result VARCHAR(20) NOT NULL DEFAULT 'pending',
    return_amount NUMERIC(15, 2) DEFAULT 0.00,
    net_profit NUMERIC(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. FINANCIAL SNAPSHOTS (Migration 001 + Migration 005)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_assets NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_liabilities NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_worth NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    monthly_income NUMERIC(15, 2) DEFAULT 0.00,
    monthly_expenses NUMERIC(15, 2) DEFAULT 0.00,
    free_cash_flow NUMERIC(15, 2) DEFAULT 0.00,
    savings_rate_pct NUMERIC(6, 2) DEFAULT 0.00,
    -- Granular Digital Twin extensions (Migration 005)
    liquid_assets NUMERIC(15, 2) DEFAULT 0.00,
    crypto_assets NUMERIC(15, 2) DEFAULT 0.00,
    bank_assets NUMERIC(15, 2) DEFAULT 0.00,
    investments_value NUMERIC(15, 2) DEFAULT 0.00,
    total_debt NUMERIC(15, 2) DEFAULT 0.00,
    snapshot_frequency VARCHAR(20) DEFAULT 'monthly',
    state_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);

-- ============================================================================
-- 12. CRYPTO INTELLIGENCE & WALLETS (Migration 003)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(50) NOT NULL DEFAULT 'evm',
    network_name VARCHAR(100) NOT NULL DEFAULT 'Ethereum Mainnet',
    label VARCHAR(50) NOT NULL DEFAULT 'Personal',
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, address, blockchain)
);

CREATE TABLE IF NOT EXISTS public.crypto_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    quantity NUMERIC(28, 10) NOT NULL CHECK (quantity >= 0),
    purchase_price_usd NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (purchase_price_usd >= 0),
    purchase_price_cop NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price_cop >= 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100) NOT NULL DEFAULT 'Manual',
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. BANKING INTELLIGENCE & OPEN FINANCE (Migration 004)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'open_finance',
    institution_id VARCHAR(100) NOT NULL,
    institution_name VARCHAR(150) NOT NULL,
    institution_logo VARCHAR(255),
    consent_status VARCHAR(50) NOT NULL DEFAULT 'active',
    consent_scopes TEXT[] DEFAULT ARRAY['accounts', 'balances', 'transactions'],
    consent_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle',
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    institution_id VARCHAR(100) NOT NULL,
    institution_name VARCHAR(150) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'savings',
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    masked_account_number VARCHAR(50) NOT NULL,
    current_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(18, 2),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, institution_id, masked_account_number)
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    external_transaction_id VARCHAR(255),
    date DATE NOT NULL,
    posted_at TIMESTAMPTZ,
    description TEXT NOT NULL,
    clean_merchant VARCHAR(150),
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    transaction_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) DEFAULT 'otros',
    category_source VARCHAR(50) DEFAULT 'rule',
    is_internal_transfer BOOLEAN DEFAULT FALSE,
    linked_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
    linked_income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    linked_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, account_id, external_transaction_id)
);

CREATE TABLE IF NOT EXISTS public.bank_consents_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    scopes TEXT[] NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. FINANCIAL INTELLIGENCE & EVENT ENGINE (Migration 006)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metric VARCHAR(100) NOT NULL,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    previous_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    delta_payload JSONB DEFAULT '{}'::jsonb,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_alerts (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id VARCHAR(64),
    type VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metric VARCHAR(100) NOT NULL,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    previous_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    delta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    source VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_insights (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    area VARCHAR(30) NOT NULL,
    fact TEXT NOT NULL,
    change TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'high',
    impact VARCHAR(20) NOT NULL DEFAULT 'neutral',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    debt_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    liquidity_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    crypto_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    goals_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    betting_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    income_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 15. PROACTIVE COPILOT MEMORY & PREFERENCES (Migration 007)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Conversación Financiera',
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    explanation_payload JSONB DEFAULT NULL,
    scenario_params JSONB DEFAULT NULL,
    tools_executed TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.copilot_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_brief_enabled BOOLEAN NOT NULL DEFAULT true,
    weekly_review_enabled BOOLEAN NOT NULL DEFAULT true,
    budget_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    goal_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    debt_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    liquidity_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    crypto_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    banking_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 16. PERFORMANCE INDEXES (Migrations 002, 003, 004, 005, 006, 007)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_cat_date ON public.expenses (user_id, category_name, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets (user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_user_balance ON public.debts (user_id, current_balance DESC);
CREATE INDEX IF NOT EXISTS idx_assets_user ON public.assets (user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user ON public.liabilities (user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_symbol ON public.crypto_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON public.wallets(blockchain);
CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON public.bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date ON public.bank_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ext_id ON public.bank_transactions(external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_consents_user ON public.bank_consents_log(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user_date ON public.financial_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_user_time ON public.financial_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_category ON public.financial_events(user_id, category);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_user_status ON public.financial_alerts(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_dedup ON public.financial_alerts(user_id, type, metric, date);
CREATE INDEX IF NOT EXISTS idx_financial_insights_user_time ON public.financial_insights(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);

-- ============================================================================
-- 17. ROW LEVEL SECURITY (RLS) ACTIVATION ON ALL 28 TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_consents_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 18. RLS POLICIES (Strict User Isolation: auth.uid() = user_id)
-- ============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'accounts', 'incomes', 'expenses', 'budgets', 'goals', 
        'goal_contributions', 'debts', 'debt_payments', 'assets', 
        'liabilities', 'investments', 'betting_transactions', 
        'financial_snapshots', 'crypto_holdings', 'wallets', 
        'bank_connections', 'bank_accounts', 'bank_transactions', 
        'bank_consents_log', 'financial_events', 'financial_alerts', 
        'financial_insights', 'ai_conversations', 'ai_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS %I_user_policy ON public.%I;
            CREATE POLICY %I_user_policy ON public.%I
                FOR ALL
                TO authenticated
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id);
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- Policy for profiles (id = auth.uid())
DROP POLICY IF EXISTS profiles_user_policy ON public.profiles;
CREATE POLICY profiles_user_policy ON public.profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy for alert_preferences (user_id = auth.uid())
DROP POLICY IF EXISTS alert_preferences_user_policy ON public.alert_preferences;
CREATE POLICY alert_preferences_user_policy ON public.alert_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for copilot_preferences (user_id = auth.uid())
DROP POLICY IF EXISTS copilot_preferences_user_policy ON public.copilot_preferences;
CREATE POLICY copilot_preferences_user_policy ON public.copilot_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for categories (Global presets user_id IS NULL + custom categories auth.uid() = user_id)
DROP POLICY IF EXISTS categories_user_policy ON public.categories;
CREATE POLICY categories_user_policy ON public.categories
    FOR ALL
    TO authenticated
    USING (user_id IS NULL OR auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow public/anon read on system preset categories
DROP POLICY IF EXISTS categories_anon_read_policy ON public.categories;
CREATE POLICY categories_anon_read_policy ON public.categories
    FOR SELECT
    TO anon
    USING (user_id IS NULL);

-- ============================================================================
-- 19. PRESET CATEGORIES SEED (Idempotent)
-- ============================================================================
INSERT INTO public.categories (name, icon, color, is_custom) VALUES
('vivienda', 'home', '#3b82f6', false),
('alimentacion', 'utensils', '#10b981', false),
('transporte', 'car', '#f59e0b', false),
('educacion', 'graduation-cap', '#8b5cf6', false),
('servicios', 'zap', '#06b6d4', false),
('tecnologia', 'laptop', '#6366f1', false),
('entretenimiento', 'film', '#ec4899', false),
('compras', 'shopping-bag', '#f43f5e', false),
('salud', 'heart-pulse', '#14b8a6', false),
('suscripciones', 'repeat', '#a855f7', false),
('otros', 'more-horizontal', '#64748b', false)
ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
