-- ======================================================================
-- NEXUS TENNIS PREDICTIVE LAB (NTPL) — MIGRATION 008: DATA ARCHITECTURE
-- Strictly Isolated Quantitative Schema: `nexus_tennis`
-- Enforces:
-- 1. Immutable Match Fact Table with deterministic SHA-256 fingerprinting.
-- 2. Point-in-time Feature Store indexing for zero data leakage.
-- 3. Shin Method vig-free market odds storage.
-- 4. Epistemic uncertainty modifiers from observational news events.
-- ======================================================================

CREATE SCHEMA IF NOT EXISTS nexus_tennis;

-- ─── 1. PLAYERS MASTER ───
CREATE TABLE IF NOT EXISTS nexus_tennis.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_slug VARCHAR(100) UNIQUE NOT NULL,
    atp_id VARCHAR(32) DEFAULT NULL,
    wta_id VARCHAR(32) DEFAULT NULL,
    full_name VARCHAR(150) NOT NULL,
    country_code CHAR(3) NOT NULL,
    birth_date DATE DEFAULT NULL,
    hand CHAR(1) NOT NULL DEFAULT 'R' CHECK (hand IN ('R', 'L', 'U')),
    backhand VARCHAR(2) NOT NULL DEFAULT '2H' CHECK (backhand IN ('1H', '2H')),
    height_cm SMALLINT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 2. TOURNAMENTS MASTER ───
CREATE TABLE IF NOT EXISTS nexus_tennis.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    tour VARCHAR(3) NOT NULL CHECK (tour IN ('ATP', 'WTA')),
    surface VARCHAR(10) NOT NULL CHECK (surface IN ('Hard', 'Clay', 'Grass', 'Carpet')),
    is_indoor BOOLEAN NOT NULL DEFAULT FALSE,
    altitude_meters SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 3. MATCHES (IMMUTABLE FACT TABLE) ───
CREATE TABLE IF NOT EXISTS nexus_tennis.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_fingerprint CHAR(64) UNIQUE NOT NULL,
    tournament_id UUID NOT NULL REFERENCES nexus_tennis.tournaments(id) ON DELETE RESTRICT,
    match_date DATE NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    round VARCHAR(10) NOT NULL CHECK (round IN ('R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'RR')),
    winner_id UUID NOT NULL REFERENCES nexus_tennis.players(id) ON DELETE RESTRICT,
    loser_id UUID NOT NULL REFERENCES nexus_tennis.players(id) ON DELETE RESTRICT,
    score VARCHAR(64) DEFAULT NULL,
    duration_minutes SMALLINT DEFAULT NULL,
    winner_stats JSONB DEFAULT NULL,
    loser_stats JSONB DEFAULT NULL,
    data_quality_score VARCHAR(6) NOT NULL DEFAULT 'MEDIUM' CHECK (data_quality_score IN ('HIGH', 'MEDIUM', 'LOW')),
    data_source VARCHAR(64) NOT NULL DEFAULT 'jeff_sackmann_cc_by_nc_sa_4',
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 4. ODDS (CLOSING & LIVE WITH SHIN METHOD) ───
CREATE TABLE IF NOT EXISTS nexus_tennis.odds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES nexus_tennis.matches(id) ON DELETE CASCADE,
    bookmaker VARCHAR(64) NOT NULL,
    decimal_odds_a NUMERIC(8, 4) NOT NULL CHECK (decimal_odds_a > 1.000),
    decimal_odds_b NUMERIC(8, 4) NOT NULL CHECK (decimal_odds_b > 1.000),
    raw_implied_prob_a NUMERIC(6, 5) GENERATED ALWAYS AS (1.0 / decimal_odds_a) STORED,
    raw_implied_prob_b NUMERIC(6, 5) GENERATED ALWAYS AS (1.0 / decimal_odds_b) STORED,
    market_overround NUMERIC(6, 5) GENERATED ALWAYS AS ((1.0 / decimal_odds_a + 1.0 / decimal_odds_b) - 1.0) STORED,
    shin_implied_prob_a NUMERIC(6, 5) NOT NULL,
    shin_implied_prob_b NUMERIC(6, 5) NOT NULL,
    shin_insider_fraction NUMERIC(6, 5) NOT NULL DEFAULT 0.00000,
    odds_type VARCHAR(12) NOT NULL DEFAULT 'CLOSING' CHECK (odds_type IN ('OPENING', 'INTERMEDIATE', 'CLOSING')),
    captured_at TIMESTAMPTZ NOT NULL,
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 5. NEWS EVENTS (OBSERVATIONAL & EPISTEMIC ONLY) ───
CREATE TABLE IF NOT EXISTS nexus_tennis.news_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES nexus_tennis.players(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES nexus_tennis.tournaments(id) ON DELETE SET NULL,
    headline TEXT NOT NULL,
    source_domain VARCHAR(120) NOT NULL,
    source_url TEXT NOT NULL,
    injury_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (injury_status IN ('UNKNOWN', 'QUESTIONABLE', 'DOCUMENTED_ISSUE')),
    epistemic_uncertainty_modifier NUMERIC(4, 3) NOT NULL DEFAULT 0.000 CHECK (epistemic_uncertainty_modifier BETWEEN 0.000 AND 0.500),
    published_at TIMESTAMPTZ DEFAULT NULL,
    available_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 6. POINT-IN-TIME FEATURE STORE ───
CREATE TABLE IF NOT EXISTS nexus_tennis.feature_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    feature_group VARCHAR(32) NOT NULL CHECK (feature_group IN ('BASELINE_RATING', 'FATIGUE_EWMA', 'CONTEXTUAL_SURFACE', 'MARKET_SHIN')),
    feature_name VARCHAR(64) NOT NULL,
    feature_version VARCHAR(16) NOT NULL,
    as_of_timestamp TIMESTAMPTZ NOT NULL,
    feature_value NUMERIC(12, 6) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ─── 7. PERFORMANCE & TEMPORAL INTEGRITY INDEXES ───
CREATE INDEX IF NOT EXISTS idx_nt_matches_fingerprint ON nexus_tennis.matches(match_fingerprint);
CREATE INDEX IF NOT EXISTS idx_nt_matches_scheduled ON nexus_tennis.matches(scheduled_at, match_date);
CREATE INDEX IF NOT EXISTS idx_nt_matches_available ON nexus_tennis.matches(available_at);
CREATE INDEX IF NOT EXISTS idx_nt_odds_match_available ON nexus_tennis.odds(match_id, available_at DESC);
CREATE INDEX IF NOT EXISTS idx_nt_feature_store_asof ON nexus_tennis.feature_store(entity_id, feature_name, feature_version, as_of_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nt_news_player_available ON nexus_tennis.news_events(player_id, available_at DESC);

-- ─── 8. ROW LEVEL SECURITY (RLS) ───
ALTER TABLE nexus_tennis.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.news_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.feature_store ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated research users
CREATE POLICY "Allow read access to authenticated users for tennis players"
    ON nexus_tennis.players FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for tennis tournaments"
    ON nexus_tennis.tournaments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for tennis matches"
    ON nexus_tennis.matches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for tennis odds"
    ON nexus_tennis.odds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for tennis news"
    ON nexus_tennis.news_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for tennis features"
    ON nexus_tennis.feature_store FOR SELECT TO authenticated USING (true);
