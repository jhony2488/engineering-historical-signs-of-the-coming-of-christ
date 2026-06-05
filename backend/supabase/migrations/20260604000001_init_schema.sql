-- Extensões
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Camada 1
CREATE TABLE IF NOT EXISTS documentos_brutos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    fonte TEXT NOT NULL,
    url TEXT DEFAULT '',
    categoria TEXT DEFAULT 'geral',
    content_hash TEXT UNIQUE NOT NULL,
    coletado_em TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Camada 2
CREATE TABLE IF NOT EXISTS trechos_processados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id TEXT NOT NULL,
    indice INT NOT NULL,
    texto TEXT NOT NULL,
    idioma TEXT DEFAULT 'unknown',
    topicos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corpus teológico + Camada 3
CREATE TABLE IF NOT EXISTS corpus_teologico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referencia TEXT UNIQUE NOT NULL,
    texto TEXT NOT NULL,
    tema TEXT,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embeddings_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trecho_id TEXT NOT NULL,
    embedding vector(1024),
    modelo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
    ON embeddings_eventos USING hnsw (embedding vector_cosine_ops);

-- Camadas 4-7
CREATE TABLE IF NOT EXISTS eventos_estruturados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trecho_id TEXT,
    dados JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linhas_temporais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dados JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inferencias_raciocinio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dados JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interpretacoes_hermeneuticas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dados JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saída diária (append-only)
CREATE TABLE IF NOT EXISTS resultados_escatologicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    fase_atual TEXT NOT NULL,
    probabilidade_fase FLOAT NOT NULL,
    indice_global FLOAT NOT NULL,
    confianca FLOAT NOT NULL,
    json_analise_ia JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resultados_data_brin
    ON resultados_escatologicos USING BRIN (data_referencia);

CREATE INDEX IF NOT EXISTS idx_resultados_json_gin
    ON resultados_escatologicos USING GIN (json_analise_ia);

-- Auditoria imutável
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camada TEXT NOT NULL,
    modelo TEXT,
    prompt_version TEXT,
    input_hash TEXT,
    decisao TEXT NOT NULL,
    detalhes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nível 2 (weekly|monthly|quarterly|semiannual|annual)
-- Nível 3 (*_hybrid: quarterly_hybrid|semiannual_hybrid|annual_hybrid)
CREATE TABLE IF NOT EXISTS snapshots_periodo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    janela TEXT NOT NULL,
    data_referencia DATE NOT NULL,
    dados JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rankings
CREATE TABLE IF NOT EXISTS candidatos_perfil (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    personagem TEXT NOT NULL CHECK (personagem IN ('besta_mar', 'besta_terra')),
    scores_criterio JSONB NOT NULL DEFAULT '{}',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ranking_probabilistico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    posicao INT NOT NULL,
    candidato_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    personagem TEXT NOT NULL,
    probabilidade_atual FLOAT NOT NULL,
    tendencia_24h FLOAT DEFAULT 0,
    fator_principal TEXT,
    scores_criterio JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grafo profético
CREATE TABLE IF NOT EXISTS grafo_nos (
    node_id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    attrs JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grafo_arestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL REFERENCES grafo_nos(node_id),
    target_id TEXT NOT NULL REFERENCES grafo_nos(node_id),
    relacao TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parâmetros HMM/Bayes versionados
CREATE TABLE IF NOT EXISTS parametros_fase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    versao INT NOT NULL,
    ativo BOOLEAN DEFAULT FALSE,
    emissoes JSONB NOT NULL,
    transicoes JSONB NOT NULL,
    aprovado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS read-only para anon (dashboard futuro)
ALTER TABLE resultados_escatologicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_probabilistico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_resultados" ON resultados_escatologicos
    FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_ranking" ON ranking_probabilistico
    FOR SELECT TO anon USING (true);