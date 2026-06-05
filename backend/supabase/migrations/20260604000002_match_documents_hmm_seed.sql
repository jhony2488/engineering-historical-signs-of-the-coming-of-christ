-- pgvector RAG: busca por similaridade no corpus teológico
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1024),
    match_count int DEFAULT 3
)
RETURNS TABLE (
    referencia text,
    texto text,
    tema text,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        c.referencia,
        c.texto,
        c.tema,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM corpus_teologico c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Parâmetros HMM v1 (matrizes default do motor)
INSERT INTO parametros_fase (versao, ativo, emissoes, transicoes, aprovado)
SELECT
    1,
    true,
    '[
        [0.125,0.125,0.125,0.125,0.1875,0.1875,0.1875,0.1875],
        [0.125,0.125,0.125,0.125,0.1875,0.1875,0.1875,0.1875],
        [0.125,0.125,0.125,0.125,0.1875,0.1875,0.1875,0.1875],
        [0.125,0.125,0.125,0.125,0.1875,0.1875,0.1875,0.1875]
    ]'::jsonb,
    '{
        "startprob": [0.5, 0.3, 0.15, 0.05],
        "matrix": [
            [0.7, 0.2, 0.08, 0.02],
            [0.1, 0.6, 0.25, 0.05],
            [0.05, 0.15, 0.55, 0.25],
            [0.02, 0.08, 0.2, 0.7]
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (SELECT 1 FROM parametros_fase WHERE versao = 1);
