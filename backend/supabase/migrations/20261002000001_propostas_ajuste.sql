-- Propostas de ajuste de modelos/config geradas por LLM — trilha de
-- auditoria com revisão humana. A LLM propõe (status='pendente'), o admin
-- aprova/rejeita via API; aplicação no alvo é manual e registrada em
-- aplicado_em. Mesmo padrão de governança de parametros_fase.

CREATE TABLE IF NOT EXISTS propostas_ajuste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 'prototipo' | 'lexico' | 'threshold' | 'parametro_hmm' | 'peso_mcda'
    -- | 'criterio_fase' | 'prompt_template' | 'local_model_map' | 'flag' | 'field_spec'
    tipo TEXT NOT NULL,
    -- ex.: 'classifier_prototypes.evento.conflito_militar', 'settings.phase_confidence_min'
    alvo TEXT NOT NULL,
    valor_atual JSONB,
    valor_proposto JSONB NOT NULL,
    justificativa TEXT,
    modelo TEXT,                        -- alias do modelo gerador (ex.: groq_model_timeline)
    origem TEXT NOT NULL,               -- 'data_drift_monthly' | 'manual' | futuro: 'shadow_disagreement'
    status TEXT NOT NULL DEFAULT 'pendente',  -- pendente | aprovada | rejeitada | aplicada
    revisado_em TIMESTAMPTZ,
    revisado_por TEXT,
    revisao_motivo TEXT,
    aplicado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propostas_ajuste_status
    ON propostas_ajuste (status, created_at DESC);
