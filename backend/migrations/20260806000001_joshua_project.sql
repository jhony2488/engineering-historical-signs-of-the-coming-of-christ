-- PostgreSQL migration: dados brutos Joshua Project + análise missiológica.

CREATE TABLE IF NOT EXISTS joshua_project_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    people_id TEXT NOT NULL,
    people_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    country_name TEXT,
    population INTEGER DEFAULT 0,
    joshua_scale INTEGER CHECK (joshua_scale >= 1 AND joshua_scale <= 5),
    primary_language TEXT,
    bible_translation_status TEXT,
    jesus_film_available BOOLEAN DEFAULT FALSE,
    audio_recordings_available BOOLEAN DEFAULT FALSE,
    percent_christian DOUBLE PRECISION,
    percent_evangelical DOUBLE PRECISION,
    percent_adherent DOUBLE PRECISION,
    source_url TEXT,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data_hash TEXT NOT NULL,
    UNIQUE (people_id)
);

CREATE INDEX IF NOT EXISTS idx_joshua_country ON joshua_project_data (country_code);
CREATE INDEX IF NOT EXISTS idx_joshua_scale ON joshua_project_data (joshua_scale);
CREATE INDEX IF NOT EXISTS idx_joshua_updated ON joshua_project_data (updated_at DESC);

CREATE TABLE IF NOT EXISTS missiological_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    joshua_data_id UUID REFERENCES joshua_project_data(id) ON DELETE SET NULL,
    people_id TEXT NOT NULL,
    country_code TEXT NOT NULL,
    energy_classification JSONB NOT NULL DEFAULT '{}',
    expansion_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (expansion_score >= 0 AND expansion_score <= 1),
    contraction_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (contraction_score >= 0 AND contraction_score <= 1),
    missiological_risk DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (missiological_risk >= 0 AND missiological_risk <= 1),
    progress_trend TEXT,
    phase_correlation JSONB NOT NULL DEFAULT '{}',
    inferred_phase TEXT,
    llm_analysis JSONB NOT NULL DEFAULT '{}',
    hermeneutic_interpretation TEXT,
    alerts JSONB NOT NULL DEFAULT '[]',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    model_version TEXT DEFAULT 'heuristic-v1'
);

CREATE INDEX IF NOT EXISTS idx_missiological_country ON missiological_analysis (country_code);
CREATE INDEX IF NOT EXISTS idx_missiological_phase ON missiological_analysis (inferred_phase);
CREATE INDEX IF NOT EXISTS idx_missiological_analyzed ON missiological_analysis (analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_missiological_people ON missiological_analysis (people_id);
