-- ============================================================
-- NEXUS FINANCE — MIGRATION 007: PROACTIVE FINANCIAL COPILOT
-- Adds persistent conversation memory and notification preferences
-- Strictly isolated by user_id with Row Level Security (RLS)
-- ============================================================

-- 1. AI CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Conversación Financiera',
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. AI MESSAGES TABLE
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

-- 3. COPILOT NOTIFICATION PREFERENCES TABLE
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

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_preferences ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES (Users can only access their own data)
CREATE POLICY "Users can manage their own AI conversations"
    ON public.ai_conversations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI messages"
    ON public.ai_messages
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own copilot preferences"
    ON public.copilot_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
