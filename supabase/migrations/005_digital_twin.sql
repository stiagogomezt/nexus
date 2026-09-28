-- ============================================================================
-- NEXUS FINANCE — MIGRATION 005: FINANCIAL DIGITAL TWIN & SNAPSHOT ENRICHMENT
-- Non-destructive migration: Adds granular columns to financial_snapshots
-- and ensures complete RLS isolation for Digital Twin time-series data.
-- ============================================================================

-- 1. Enrich existing financial_snapshots table with granular category assets
ALTER TABLE public.financial_snapshots
  ADD COLUMN IF NOT EXISTS liquid_assets NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS crypto_assets NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS bank_assets NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS investments_value NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_debt NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS snapshot_frequency VARCHAR(20) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS state_payload JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for efficient chronological time-series retrieval
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user_date 
  ON public.financial_snapshots(user_id, snapshot_date DESC);

-- 3. Verify RLS is enabled
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- 4. Ensure RLS Policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_snapshots' 
    AND policyname = 'Users can manage their own financial snapshots'
  ) THEN
    CREATE POLICY "Users can manage their own financial snapshots"
      ON public.financial_snapshots
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;
