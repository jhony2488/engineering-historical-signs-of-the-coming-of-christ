-- Camadas 10–15: ameaças por país, ABM, adversarial, proveniência, recomendações adaptativas

CREATE TABLE IF NOT EXISTS ameacas_pais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    country_code TEXT NOT NULL,
    country_name TEXT NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    metrics JSONB NOT NULL DEFAULT '{}',
    prescriptions JSONB NOT NULL DEFAULT '{}',
    historical_echo JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (data_referencia, country_code)
);

CREATE INDEX IF NOT EXISTS idx_ameacas_pais_data ON ameacas_pais (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_ameacas_pais_risk ON ameacas_pais (risk_score DESC);

CREATE TABLE IF NOT EXISTS simulacoes_abm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    country_code TEXT NOT NULL,
    resultado JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (data_referencia, country_code)
);

CREATE INDEX IF NOT EXISTS idx_simulacoes_abm_data ON simulacoes_abm (data_referencia DESC);

CREATE TABLE IF NOT EXISTS adversarial_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    country_code TEXT,
    resilience_score DOUBLE PRECISION NOT NULL CHECK (resilience_score >= 0 AND resilience_score <= 1),
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adversarial_reviews_data ON adversarial_reviews (data_referencia DESC);

CREATE TABLE IF NOT EXISTS provenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    stage TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    parent_hash TEXT,
    result_hash TEXT,
    merkle_root TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provenance_data ON provenance_log (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_provenance_parent ON provenance_log (parent_hash);
CREATE INDEX IF NOT EXISTS idx_provenance_stage ON provenance_log (stage);

CREATE TABLE IF NOT EXISTS recomendacoes_adaptativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    country_code TEXT,
    urgency TEXT NOT NULL CHECK (urgency IN ('agora', 'semana', 'mes', 'condicional')),
    triggers JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recomendacoes_adaptativas_data ON recomendacoes_adaptativas (data_referencia DESC);

ALTER TABLE ameacas_pais ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacoes_abm ENABLE ROW LEVEL SECURITY;
ALTER TABLE adversarial_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recomendacoes_adaptativas ENABLE ROW LEVEL SECURITY;
