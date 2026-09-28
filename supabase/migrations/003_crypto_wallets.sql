-- ============================================================================
-- NEXUS FINANCE - Migration 003: Crypto Intelligence & Wallet Intelligence
-- Compatible with PostgreSQL 15+ and Supabase (Row Level Security enabled)
-- Strictly READ-ONLY for wallets. Zero private keys / zero seed phrases.
-- ============================================================================

-- 1. CRYPTO HOLDINGS (Registro manual o importado de activos crypto)
CREATE TABLE IF NOT EXISTS public.crypto_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset VARCHAR(100) NOT NULL, -- e.g., 'Bitcoin', 'Ethereum', 'Solana'
    symbol VARCHAR(20) NOT NULL, -- e.g., 'BTC', 'ETH', 'SOL', 'USDC'
    quantity NUMERIC(28, 10) NOT NULL CHECK (quantity >= 0),
    purchase_price_usd NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (purchase_price_usd >= 0),
    purchase_price_cop NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price_cop >= 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform VARCHAR(100) NOT NULL DEFAULT 'Manual', -- 'Binance', 'Coinbase', 'Phantom', 'Metamask', 'Ledger', etc.
    wallet_id UUID, -- Optional foreign key to linked wallet for deduplication
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WALLETS (Billeteras públicas registradas en modo SOLO LECTURA)
-- NOTA DE SEGURIDAD: Almacena EXCLUSIVAMENTE direcciones públicas.
-- NUNCA almacena ni solicita claves privadas, contraseñas ni frases semilla.
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g., 'Phantom Personal SOL', 'Ledger EVM Cold'
    address VARCHAR(255) NOT NULL, -- Dirección pública (0x... o Base58)
    blockchain VARCHAR(50) NOT NULL DEFAULT 'evm', -- 'evm', 'solana', 'bitcoin'
    network_name VARCHAR(100) NOT NULL DEFAULT 'Ethereum Mainnet', -- 'Ethereum', 'Polygon', 'Arbitrum', 'Solana Mainnet'
    label VARCHAR(50) NOT NULL DEFAULT 'Personal', -- 'Hot Wallet', 'Cold Storage', 'DeFi', 'Trading'
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, address, blockchain)
);

-- Foreign key link for deduplication
ALTER TABLE public.crypto_holdings 
    DROP CONSTRAINT IF EXISTS fk_crypto_holdings_wallet;

ALTER TABLE public.crypto_holdings
    ADD CONSTRAINT fk_crypto_holdings_wallet
    FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

-- 3. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_symbol ON public.crypto_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON public.wallets(blockchain);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- crypto_holdings policies
CREATE POLICY "Users can view their own crypto holdings"
    ON public.crypto_holdings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crypto holdings"
    ON public.crypto_holdings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto holdings"
    ON public.crypto_holdings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crypto holdings"
    ON public.crypto_holdings FOR DELETE
    USING (auth.uid() = user_id);

-- wallets policies
CREATE POLICY "Users can view their own wallets"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
    ON public.wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
    ON public.wallets FOR DELETE
    USING (auth.uid() = user_id);
