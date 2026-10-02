# Variáveis de ambiente — Backend

Referência completa de [`backend/.env.example`](../.env.example). Copie para
`backend/.env` e ajuste — nunca commite valores reais.

## Supabase

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrita no batch — **nunca no front-end** |
| `SUPABASE_ANON_KEY` | Leitura pública (dashboard) |

## LLMs

Ordem do `LLMRouter`: **Local GGUF → Ollama → Groq → OpenRouter → dry-run**
(locais habilitáveis; dry-run sempre cobre). Detalhes:
[model-providers.md](model-providers.md).

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GROQ_API_KEY` | — | Provedor primário (fallback final) |
| `OPENROUTER_API_KEY` | — | Fallback |
| `LLM_DRY_RUN` | `false` | `true` simula LLMs sem chaves (CI/dev) |
| `GROQ_MODEL_EXTRACTION` | `llama-3.1-8b-instant` | Camada 4 |
| `GROQ_MODEL_TIMELINE` | `mistral-nemo` | Camada 5 |
| `GROQ_MODEL_REASONING` | `deepseek-r1-distill` | Camada 6 |
| `GROQ_MODEL_HERMENEUTICS` | `gemma2-9b-it` | Camada 7 |
| `OLLAMA_ENABLED` | `false` | Habilita Ollama local/RunPod |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Endpoint Ollama |

## SLM local in-process (llama.cpp)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `LOCAL_LLM_ENABLED` | `false` | Habilita o tier GGUF (extra `[local]`) |
| `LOCAL_MODELS_DIR` | `models_cache` | Diretório dos GGUF (nunca commitado) |
| `LOCAL_LLM_CTX` | `0` | `0` = usa o perfil do candidato |
| `LOCAL_LLM_THREADS` | `0` | `0` = usa o perfil do candidato |

Cascata e perfis por modelo: `LOCAL_MODEL_MAP` em
[`motor/adapters/local_llm.py`](../motor/adapters/local_llm.py). Download:
`python scripts/download_models.py`.

## Idioma do pipeline (prompts EN + tradução)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `PROMPTS_LANG` | `pt` | `pt`=prompts `v1` \| `en`=`v2_en` (interno em inglês) |
| `TRANSLATE_NARRATIVES` | `false` | Traduz campos narrativos EN→PT antes de persistir |
| `TRANSLATOR_MODEL` | `facebook/nllb-200-distilled-600M` | Modelo MT (lazy, CPU) |
| `CLASSIFIER_HINTS_ENABLED` | `false` | Shadow classifier preenche categóricos inválidos |

## Redis (opcional)

| Variável | Descrição |
|----------|-----------|
| `REDIS_URL` | Fila de jobs (`motor:jobs:pending`) e cache |

## API FastAPI

| Variável | Default | Descrição |
|----------|---------|-----------|
| `ADMIN_API_KEY` | `change-me-in-production` | Header `X-Admin-Key` nos endpoints `/admin/*` |
| `API_RATE_LIMIT` | `30/minute` | Rate limit por IP (slowapi) |

## Batch

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BATCH_CRON_TZ` | `America/Sao_Paulo` | Fuso do agendamento |
| `BATCH_HOUR` | `4` | Hora do batch diário |
| `MAX_DOCUMENTS_PER_DAY` | `50` | Cap de documentos por run |
| `EMBEDDING_BATCH_SIZE` | `8` | Lote de embeddings |
| `BGE_MODEL_NAME` | `BAAI/bge-m3` | Modelo de embeddings |
| `EMBED_CHUNK_LIMIT` | `40` | Cap de chunks embutidos por run |
| `OCR_IMAGES_DIR` | — | Diretório de imagens para OCR |
| `ALLOW_GDELT_SYNTHETIC_FALLBACK` | `true` | Permite docs sintéticos se GDELT falhar |
| `FEEDS_CONFIG_PATH` | `config/feeds.yaml` | Caminho do arquivo de feeds RSS |
| `ARCHIVE_DIR` | `backend/archive/` | Diretório legado de cold storage (no-op) |
| `COLD_STORAGE_YEARS` | `2` | Janela de retenção legada (Postgres-only hoje) |

## Thresholds e pesos (Camada 8)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `FALSE_LEADER_INCONGRUENCE_THRESHOLD` | `0.7` | Limiar do alerta de falso líder |
| `PHASE_CONFIDENCE_MIN` | `0.55` | Confiança mínima para publicar fase |
| `PHASE_TRANSITION_MARGIN_MAX` | `0.15` | Margem máxima para transição |
| `AUTO_APPROVE_CRITERIA` | `false` | `false` → transição exige revisão humana |
| `WEIGHT_BAYES` / `WEIGHT_HMM` / `WEIGHT_LLM` | `0.35/0.35/0.30` | Pesos da correlação |

> Alterar pesos/thresholds exige issue prévia (ver
> [REQUISITOS_CONTRIBUICAO.md](REQUISITOS_CONTRIBUICAO.md)).

## Fontes externas (opcionais)

| Variável | Descrição |
|----------|-----------|
| `ACLED_API_KEY` + `ACLED_EMAIL` | API de conflitos; sem elas usa `config/acled_seed.json` |
| `API_BIBLE_KEY` + `API_BIBLE_ID` | Corpus teológico expandido |
| `REDDIT_ENABLED` + `REDDIT_USER_AGENT` | Dados micro (Reddit) |
| `GOOGLE_TRENDS_ENABLED` | Dados micro (Trends) |
| `JOSHUA_API_KEY` | Joshua Project — usada pelo sync no BFF Next (`/api/joshua/sync`); presente no `.env.example` por referência |

## Classificadores locais (`motor/ml/`)

Sem chave de API — rodam em CPU. Taxonomia completa (pré-treinados ×
paramétricos × treinados): [modelos-locais.md](modelos-locais.md).

| Variável | Default | Descrição |
|----------|---------|-----------|
| `RELEVANCE_GATE_ENABLED` | `true` | Gate de relevância antes da extração |
| `EXTRACTION_TOP_K` | `10` | Chunks enviados à camada 4 |
| `RELEVANCE_MIN_SCORE` | `0.0` | Score mínimo do gate |
| `EVENT_SHADOW_ENABLED` | `true` | Shadow classifier vs. LLM (audit `camada_4_shadow`) |
| `RERANKER_ENABLED` | `true` | Cross-encoder BGE (rerank RAG + match profecia↔evento) |
| `RERANKER_MODEL_NAME` | `BAAI/bge-reranker-v2-m3` | Modelo reranker |
| `RERANKER_CANDIDATE_MULTIPLIER` | `4` | Candidatos por item no rerank |
| `FULFILLMENT_CE_WEIGHT` | `0.5` | Peso do cross-encoder no fulfillment tracker |
| `SEMANTIC_DEDUP_ENABLED` | `true` | Dedup semântico por embedding na ingestão |
| `SEMANTIC_DEDUP_THRESHOLD` | `0.92` | Limiar de similaridade |
| `EXTRACTION_MODE` | `llm` | `llm` ou `classifier_first` (destilação) |
| `CLASSIFIER_CONFIDENCE_MIN` | `0.6` | Confiança mínima do classificador local |
| `DISTILL_MIN_ROWS` | `300` | Linhas mínimas para destilação |
| `SENTIMENT_MODEL_NAME` | `cardiffnlp/twitter-xlm-roberta-base-sentiment` | Modelo HF de sentimento do tom espiritual (manter labels positive/negative/neutral) |

### HMM — EM offline (`train-phase-hmm`)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `HMM_EM_MIN_DAYS` | `30` | Dias mínimos de histórico para treinar |
| `HMM_EM_MAX_ITER` | `100` | Iterações máximas do Baum-Welch |
| `HMM_EM_TOL` | `1e-4` | Tolerância de convergência (Δ log-likelihood) |

### GNN — link prediction (`train-gnn`, extra `[gnn]`)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GNN_WEIGHTS_PATH` | `config/gnn_weights.pt` | Artefato dos pesos treinados |
| `GNN_TRAIN_EPOCHS` | `200` | Épocas de treino |
| `GNN_TRAIN_LR` | `0.01` | Learning rate (Adam) |
| `GNN_NEG_RATIO` | `1` | Negativos por aresta positiva |
| `GNN_TEXT_FEATURES_ENABLED` | `false` | Mistura projeção do embedding BGE do texto do nó nas features |

## Site e e-mail (digest diário)

| Variável | Descrição |
|----------|-----------|
| `SITE_URL` | URL pública do dashboard (links no e-mail) |
| `EMAIL_FROM` | Remetente |
| `EMAIL_DRY_RUN` | `true` simula envio |
| `RESEND_API_KEY` | Resend (recomendado) |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` | Alternativa SMTP |
