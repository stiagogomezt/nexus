-- ============================================================================
-- NEXUS FINANCE - Migration 004: Banking & Open Finance Intelligence
-- Compatible with PostgreSQL 15+ and Supabase (Row Level Security enabled)
-- Strictly READ-ONLY. Zero bank passwords, zero PINs, zero private tokens.
-- Ready for Colombian Open Finance (Decreto 0368 de 2026 / FAPI 2.0).
-- ============================================================================

-- 1. BANK CONNECTIONS (Conexiones y Consentimientos Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'open_finance', -- 'open_finance', 'prometeo', 'belvo', 'csv', 'manual'
    institution_id VARCHAR(100) NOT NULL, -- 'bancolombia', 'nequi', 'davivienda', 'nu', 'bogota'
    institution_name VARCHAR(150) NOT NULL, -- 'Bancolombia', 'Nequi', 'Nu Colombia'
    institution_logo VARCHAR(255),
    consent_status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'expired', 'error'
    consent_scopes TEXT[] DEFAULT ARRAY['accounts', 'balances', 'transactions'],
    consent_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'success', 'partial', 'failed'
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BANK ACCOUNTS (Cuentas bancarias verificadas y de bajo monto)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    institution_id VARCHAR(100) NOT NULL,
    institution_name VARCHAR(150) NOT NULL,
    account_name VARCHAR(150) NOT NULL, -- e.g. 'Cuenta de Ahorros Principal', 'Bolsillo Nequi'
    account_type VARCHAR(50) NOT NULL DEFAULT 'savings', -- 'savings', 'checking', 'credit_card', 'digital_wallet'
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    masked_account_number VARCHAR(50) NOT NULL, -- e.g. '***5421' (NUNCA número completo)
    current_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(18, 2), -- Aplica solo para tarjetas de crédito
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, institution_id, masked_account_number)
);

-- 3. BANK TRANSACTIONS (Movimientos normalizados y clasificados)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    external_transaction_id VARCHAR(255), -- Hash o ID provisto por la entidad/extracto
    date DATE NOT NULL,
    posted_at TIMESTAMPTZ,
    description TEXT NOT NULL,
    clean_merchant VARCHAR(150),
    amount NUMERIC(18, 2) NOT NULL, -- Positivo siempre, el signo lo dicta transaction_type
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    transaction_type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'transfer', 'adjustment'
    category VARCHAR(100) DEFAULT 'otros',
    category_source VARCHAR(50) DEFAULT 'rule', -- 'manual', 'rule', 'ai', 'provider'
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

-- 4. BANK CONSENTS AUDIT LOG (Trazabilidad inmutable de consentimientos)
CREATE TABLE IF NOT EXISTS public.bank_consents_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'granted', 'renewed', 'revoked', 'expired'
    scopes TEXT[] NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON public.bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date ON public.bank_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ext_id ON public.bank_transactions(external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_consents_user ON public.bank_consents_log(user_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_consents_log ENABLE ROW LEVEL SECURITY;

-- bank_connections policies
CREATE POLICY "Users can view their own bank connections"
    ON public.bank_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank connections"
    ON public.bank_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank connections"
    ON public.bank_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank connections"
    ON public.bank_connections FOR DELETE
    USING (auth.uid() = user_id);

-- bank_accounts policies
CREATE POLICY "Users can view their own bank accounts"
    ON public.bank_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
    ON public.bank_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
    ON public.bank_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- bank_transactions policies
CREATE POLICY "Users can view their own bank transactions"
    ON public.bank_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank transactions"
    ON public.bank_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank transactions"
    ON public.bank_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank transactions"
    ON public.bank_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- bank_consents_log policies
CREATE POLICY "Users can view their own consent audit log"
    ON public.bank_consents_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent logs"
    ON public.bank_consents_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);
