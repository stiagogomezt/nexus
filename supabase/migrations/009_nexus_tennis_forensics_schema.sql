-- ======================================================================
-- NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — MIGRATION 009: AUTOPSY & GOVERNANCE
-- Strictly Isolated Quantitative Schema: `nexus_tennis`
-- 
-- Enforces:
-- 1. Immutable forensic autopsy records comparing pre-match prediction vs actual outcome.
-- 2. Hierarchical performance deltas (Point, Game, Set, Match).
-- 3. Strict separation of algorithmic attribution (SHAP) from court analytics.
-- 4. Miss classification tree & mathematical counterfactual sensitivity audit.
-- 5. Shadow-deployment model lifecycle and telemetry governance.
-- ======================================================================

CREATE SCHEMA IF NOT EXISTS nexus_tennis;

-- ─── 1. FORENSIC RECORDS (IMMUTABLE AUTOPSY LOG) ───
CREATE TABLE IF NOT EXISTS nexus_tennis.forensic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_fingerprint CHAR(64) NOT NULL,
    match_date DATE NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    model_sha256 CHAR(64) NOT NULL,
    predicted_probability_a FLOAT NOT NULL CHECK (predicted_probability_a >= 0.0 AND predicted_probability_a <= 1.0),
    actual_winner_is_a BOOLEAN NOT NULL,
    brier_score_contribution FLOAT NOT NULL CHECK (brier_score_contribution >= 0.0 AND brier_score_contribution <= 1.0),
    log_loss_contribution FLOAT NOT NULL CHECK (log_loss_contribution >= 0.0),
    miss_typology VARCHAR(32) NOT NULL CHECK (
        miss_typology IN (
            'WITHIN_TOLERANCE',
            'OVERCONFIDENCE',
            'UNDERCONFIDENCE',
            'SURFACE_MISS',
            'MATCHUP_MISS',
            'FORM_MISS',
            'LOAD_MISS',
            'NEWS_MISS',
            'MARKET_MISS',
            'DATA_QUALITY_ISSUE'
        )
    ),
    multilevel_deltas JSONB NOT NULL,
    shap_attribution JSONB NOT NULL,
    court_analytics_summary TEXT NOT NULL,
    counterfactual_vector JSONB NOT NULL,
    epistemic_bounds_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_forensic_match_fp ON nexus_tennis.forensic_records(match_fingerprint);
CREATE INDEX IF NOT EXISTS idx_forensic_model_ver ON nexus_tennis.forensic_records(model_version);
CREATE INDEX IF NOT EXISTS idx_forensic_miss_type ON nexus_tennis.forensic_records(miss_typology);
CREATE INDEX IF NOT EXISTS idx_forensic_created_at ON nexus_tennis.forensic_records(created_at DESC);

-- ─── 2. CONTINUOUS MODEL TELEMETRY (ROLLING SLICE AUDITS) ───
CREATE TABLE IF NOT EXISTS nexus_tennis.model_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version VARCHAR(64) NOT NULL,
    slice_type VARCHAR(32) NOT NULL,
    sample_size INT NOT NULL CHECK (sample_size >= 0),
    brier_score FLOAT NOT NULL CHECK (brier_score >= 0.0),
    murphy_reliability FLOAT NOT NULL,
    murphy_resolution FLOAT NOT NULL,
    murphy_uncertainty FLOAT NOT NULL,
    log_loss FLOAT NOT NULL CHECK (log_loss >= 0.0),
    expected_calibration_error FLOAT NOT NULL,
    accuracy FLOAT NOT NULL CHECK (accuracy >= 0.0 AND accuracy <= 1.0),
    drift_detected BOOLEAN NOT NULL DEFAULT FALSE,
    drift_details JSONB DEFAULT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_telemetry_model_slice ON nexus_tennis.model_telemetry(model_version, slice_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON nexus_tennis.model_telemetry(recorded_at DESC);

-- ─── 3. SHADOW CANDIDATES & PROMOTION AUDIT TRAIL ───
CREATE TABLE IF NOT EXISTS nexus_tennis.shadow_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_version VARCHAR(64) UNIQUE NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SHADOW_TESTING' CHECK (
        status IN (
            'PENDING_EVALUATION',
            'SHADOW_TESTING',
            'APPROVED_STAGING',
            'PROMOTED_PRODUCTION',
            'REJECTED',
            'ARCHIVED'
        )
    ),
    benchmark_brier FLOAT DEFAULT NULL,
    benchmark_log_loss FLOAT DEFAULT NULL,
    walk_forward_folds INT DEFAULT NULL,
    beta_calibration_params JSONB DEFAULT NULL,
    promotion_notes TEXT DEFAULT NULL,
    approved_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shadow_candidate_status ON nexus_tennis.shadow_candidates(status);

-- ─── ROW LEVEL SECURITY (RLS) ───
ALTER TABLE nexus_tennis.forensic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.model_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_tennis.shadow_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to forensic_records"
    ON nexus_tennis.forensic_records FOR SELECT USING (true);

CREATE POLICY "Allow public read access to model_telemetry"
    ON nexus_tennis.model_telemetry FOR SELECT USING (true);

CREATE POLICY "Allow public read access to shadow_candidates"
    ON nexus_tennis.shadow_candidates FOR SELECT USING (true);
