-- Camada 0 — Baseline histórico (profecias cumpridas antes do monitoramento diário)

CREATE TABLE IF NOT EXISTS baseline_escatologico (
    id TEXT PRIMARY KEY DEFAULT 'global',
    versao TEXT NOT NULL,
    estatisticas JSONB NOT NULL,
    overview JSONB NOT NULL,
    categorias JSONB NOT NULL DEFAULT '[]',
    profecias_pendentes JSONB NOT NULL DEFAULT '[]',
    sinais_gerais JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arquivo_profetico (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('cumprida', 'parcial', 'pendente')),
    categoria TEXT NOT NULL,
    referencias JSONB NOT NULL DEFAULT '[]',
    periodo_cumprimento TEXT,
    fase_escatologica TEXT,
    energia TEXT CHECK (energia IN ('expansao', 'contracao', 'misto')),
    dimensao TEXT CHECK (dimensao IN ('macro', 'micro', 'misto')),
    descricao TEXT,
    dados JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arquivo_profetico_status ON arquivo_profetico (status);
CREATE INDEX IF NOT EXISTS idx_arquivo_profetico_categoria ON arquivo_profetico (categoria);

ALTER TABLE baseline_escatologico ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_profetico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_baseline" ON baseline_escatologico
    FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_arquivo_profetico" ON arquivo_profetico
    FOR SELECT TO anon USING (true);
