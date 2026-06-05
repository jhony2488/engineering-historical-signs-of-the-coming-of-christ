-- Atualizações dinâmicas de profecias cumpridas (detectadas no run diário)

ALTER TABLE baseline_escatologico
    ADD COLUMN IF NOT EXISTS atualizacoes JSONB NOT NULL DEFAULT '[]';

ALTER TABLE arquivo_profetico
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS cumprida_em DATE;

CREATE INDEX IF NOT EXISTS idx_arquivo_profetico_updated ON arquivo_profetico (updated_at DESC);
