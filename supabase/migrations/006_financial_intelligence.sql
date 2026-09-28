-- ============================================================================
-- NEXUS FINANCE — MIGRATION 006: FINANCIAL INTELLIGENCE & ALERT CENTER
-- Creates tables for financial events, alerts, insights, and alert preferences.
-- Enforces complete RLS isolation and performance indexes.
-- ============================================================================

-- 1. Financial Events Table
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

-- 2. Financial Alerts Table
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

-- 3. Financial Insights Table
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

-- 4. Alert Preferences Table
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

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_financial_events_user_time 
  ON public.financial_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_category 
  ON public.financial_events(user_id, category);

CREATE INDEX IF NOT EXISTS idx_financial_alerts_user_status 
  ON public.financial_alerts(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_dedup 
  ON public.financial_alerts(user_id, type, metric, date);

CREATE INDEX IF NOT EXISTS idx_financial_insights_user_time 
  ON public.financial_insights(user_id, timestamp DESC);

-- 6. Enable RLS
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_events' AND policyname = 'Users can manage their own financial events'
  ) THEN
    CREATE POLICY "Users can manage their own financial events"
      ON public.financial_events FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_alerts' AND policyname = 'Users can manage their own financial alerts'
  ) THEN
    CREATE POLICY "Users can manage their own financial alerts"
      ON public.financial_alerts FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_insights' AND policyname = 'Users can manage their own financial insights'
  ) THEN
    CREATE POLICY "Users can manage their own financial insights"
      ON public.financial_insights FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alert_preferences' AND policyname = 'Users can manage their own alert preferences'
  ) THEN
    CREATE POLICY "Users can manage their own alert preferences"
      ON public.alert_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
