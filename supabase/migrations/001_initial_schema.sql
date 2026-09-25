-- ============================================================================
-- NEXUS FINANCE - Comprehensive Initial Database Schema
-- Compatible with PostgreSQL 15+ and Supabase (with Row Level Security)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES & USER SETTINGS
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
-- 2. FINANCIAL ACCOUNTS (Bank accounts, digital wallets, cash, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Bancolombia Ahorros', 'Nequi', 'Efectivo', 'Nu'
    account_type VARCHAR(50) NOT NULL DEFAULT 'bank', -- 'bank', 'wallet', 'cash', 'broker'
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'COP',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INCOME SOURCES & DETAILED INCOME TRANSACTIONS
-- Specifically modeled for:
-- Primary: Shuffler (salary, bonus, surcharge, extra hours, other)
-- Secondary: Pizza Hut (hours worked, hourly pay, extra hours, surcharge, other)
-- Supports adding other sources dynamically
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(100) NOT NULL, -- 'Shuffler', 'Pizza Hut', or user-defined custom source
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    
    -- Specific income breakdowns
    income_type VARCHAR(50) NOT NULL DEFAULT 'salary', 
    -- 'salary', 'bonus', 'surcharge', 'extra_hours', 'hourly_wage', 'other'
    
    base_salary NUMERIC(15, 2) DEFAULT 0.00,
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00,
    surcharges_amount NUMERIC(15, 2) DEFAULT 0.00, -- recargos nocturnos/festivos
    extra_hours_amount NUMERIC(15, 2) DEFAULT 0.00, -- horas extras
    other_payments_amount NUMERIC(15, 2) DEFAULT 0.00,

    -- Side job / hourly tracking (especially for Pizza Hut)
    hours_worked NUMERIC(6, 2) DEFAULT 0.00,
    hourly_rate NUMERIC(12, 2) DEFAULT 0.00,
    
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. EXPENSES CATEGORIES & EXPENSE TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system presets
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'tag',
    color VARCHAR(20) DEFAULT '#6366f1',
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL, 
    -- 'vivienda', 'alimentacion', 'transporte', 'educacion', 'servicios', 
    -- 'tecnologia', 'entretenimiento', 'compras', 'salud', 'suscripciones', 'otros'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) DEFAULT 'debit', -- 'debit', 'credit', 'cash', 'transfer'
    is_recurring BOOLEAN DEFAULT FALSE,
    is_essential BOOLEAN DEFAULT FALSE, -- For emergency fund calculations
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BUDGETS (Monthly budget tracking by category)
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
-- 6. FINANCIAL GOALS (Metas de Ahorro e Inversión)
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
    priority VARCHAR(20) DEFAULT 'media', -- 'alta', 'media', 'baja'
    category VARCHAR(50) DEFAULT 'ahorro', -- 'patrimonio', 'viajes', 'vivienda', 'vehiculo', 'emergencia', 'otro'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused'
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
-- 7. DEBTS (Gestión de Deudas y Pasivos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity VARCHAR(150) NOT NULL, -- e.g., 'Banco Falabella', 'Nu Colombia', 'Sufi'
    name VARCHAR(150) NOT NULL, -- e.g., 'Tarjeta de Crédito', 'Préstamo Libre Inversión'
    debt_type VARCHAR(50) NOT NULL DEFAULT 'credit_card', -- 'credit_card', 'loan', 'consumer', 'mortgage', 'other'
    initial_balance NUMERIC(15, 2) NOT NULL CHECK (initial_balance >= 0),
    current_balance NUMERIC(15, 2) NOT NULL CHECK (current_balance >= 0),
    interest_rate_ea NUMERIC(6, 2) NOT NULL DEFAULT 0.00, -- Tasa Efectiva Anual (E.A. %)
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
-- 8. ASSETS & LIABILITIES (Para cálculo de Patrimonio Neto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, 
    -- 'cash', 'bank_accounts', 'savings', 'investments', 'cdt', 'real_estate', 'vehicles', 'other'
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
    -- 'credit_cards', 'personal_loans', 'mortgages', 'education', 'other_debts'
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. INVESTMENTS (Módulo de Seguimiento de Inversiones - Separado del ahorro)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'stocks', 'etf', 'mutual_funds', 'cdt', 'bonds', 'crypto', 'other'
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 1.000000,
    purchase_price NUMERIC(15, 2) NOT NULL,
    current_price NUMERIC(15, 2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100), -- e.g., 'trii', 'tyba', 'Hapi', 'Binance', 'Bancolombia'
    commission NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. BETTING TRACKER (Módulo Independiente - Separado de gastos e inversiones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.betting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100) NOT NULL, -- 'Betplay', 'Wplay', 'Rushbet', 'Stake', etc.
    sport VARCHAR(100) NOT NULL, -- 'Fútbol', 'Baloncesto', 'Tenis', 'Casino', 'eSports', etc.
    bet_type VARCHAR(100), -- 'Simple', 'Combinada', 'En Vivo', 'Over/Under'
    stake_amount NUMERIC(15, 2) NOT NULL CHECK (stake_amount >= 0),
    odds NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    result VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'won', 'lost', 'pending', 'push', 'cashed_out'
    return_amount NUMERIC(15, 2) DEFAULT 0.00,
    net_profit NUMERIC(15, 2) DEFAULT 0.00, -- return_amount - stake_amount
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. HISTORICAL FINANCIAL SNAPSHOTS (Patrimonio, Flujo libre mes a mes)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can ONLY access and modify their own financial records
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

-- Helper macro for standard user policies
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'accounts', 'incomes', 'expenses', 
        'budgets', 'goals', 'goal_contributions', 'debts', 
        'debt_payments', 'assets', 'liabilities', 
        'investments', 'betting_transactions', 'financial_snapshots'
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

-- Special policy for profiles where id = auth.uid()
DROP POLICY IF EXISTS profiles_user_policy ON public.profiles;
CREATE POLICY profiles_user_policy ON public.profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Categories policy (system default categories have user_id IS NULL)
DROP POLICY IF EXISTS categories_user_policy ON public.categories;
CREATE POLICY categories_user_policy ON public.categories
    FOR ALL
    TO authenticated
    USING (user_id IS NULL OR auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
