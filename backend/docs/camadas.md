# Camadas do pipeline — referência detalhada

Mapa camada → código. O orquestrador diário é
[`motor/pipeline/orchestrator.py`](../motor/pipeline/orchestrator.py)
(`DailyOrchestrator.run_daily`). Arquivos de configuração ficam em
[`backend/config/`](../config/); prompts versionados em
[`motor/prompts/v1/`](../motor/prompts/v1/).

## Camada 0 — Baseline histórico

| Item | Valor |
|------|-------|
| Módulo | `motor/pipeline/historical_baseline.py`, `fulfillment_tracker.py`, `chronological_archive.py` |
| Seed | `config/profecias_baseline_seed.json` |
| CLI | `python -m motor.cli seed-baseline [--force]` |
| Saída | Tabelas `baseline_*` / `arquivo_profetico`; payload `baseline_historico` |

Inventário de profecias já cumpridas (o "marco zero") executado antes do
primeiro run diário. O `FulfillmentTracker` detecta profecias recém-cumpridas
a cada batch; o `ChronologicalArchiveService` cataloga os eventos do dia no
arquivo cronológico.

## Camada 1 — Ingestão

| Item | Valor |
|------|-------|
| Módulo | `motor/pipeline/ingestion/collector.py`, `extended_sources.py` |
| Config | `config/feeds.yaml`, `config/acled_seed.json` |
| Saída | `RawDocument` → tabela `documentos` (dedup por `content_hash` + semântico por embedding — `SEMANTIC_DEDUP_*`) |

Fontes: RSS (`feeds.yaml`), GDELT (`gdelt_themes`), ACLED (API ou seed),
PDFs/OCR (`OCR_IMAGES_DIR`), API.Bible, Reddit, Google Trends, feeds
WEF/BIS (CBDC). Detalhes em [fontes-dados.md](fontes-dados.md).

## Camada 2 — Pré-processamento

| Item | Valor |
|------|-------|
| Módulo | `motor/pipeline/preprocessing/processor.py`, `dedup.py`, `nlp_enrich.py`, `ocr.py` |
| Saída | Chunks (~800 chars, overlap 10%) persistidos por documento |

Limpeza HTML, normalização, remoção de duplicados, chunking e tags de tópico
heurísticas.

## Camada 3 — Embeddings + RAG teológico

| Item | Valor |
|------|-------|
| Módulo | `motor/pipeline/embeddings/service.py` |
| Modelo | `BAAI/bge-m3` (`BGE_MODEL_NAME`); fallback hash loga `embedding_hash_fallback_active` |
| Corpus | `config/corpus_teologico_seed.json` → `corpus_teologico` (pgvector) |
| Env | `EMBED_CHUNK_LIMIT` (cap de chunks embutidos por run) |
| Rerank | `RERANKER_*` — cross-encoder BGE opcional rerankeia candidatos do RAG; `FULFILLMENT_CE_WEIGHT` pondera o match profecia↔evento do `FulfillmentTracker` |
| Drift | CLI `run-data-drift` + prompt `embeddings_curation.txt` (mensal) |

Cria memória pesquisável dos chunks e do corpus teológico; o RAG ancora as
camadas hermenêuticas na Escritura.

## Camada 3.5 — Gate de relevância

| Item | Valor |
|------|-------|
| Módulo | `motor/ml/relevance.py` (`RelevanceGate`) |
| Env | `RELEVANCE_GATE_ENABLED`, `EXTRACTION_TOP_K`, `RELEVANCE_MIN_SCORE` |

Ordena os chunks por relevância escatológica (zero-shot BGE sobre
`config/classifier_prototypes.json` / fallback lexical) antes de gastar
chamadas de LLM — auditoria em `audit_log` como `camada_3_gate`.

## Camadas 4–7 — LLMs (Groq → OpenRouter → Ollama)

| Camada | Papel | Prompt | Modelo (alias) |
|--------|-------|--------|----------------|
| 4 | Extração JSON estruturada | `extraction.txt` | `GROQ_MODEL_EXTRACTION` (llama-3.1-8b-instant) |
| 5 | Linha temporal | `timeline.txt` | `GROQ_MODEL_TIMELINE` (mistral-nemo) |
| 6 | Raciocínio SE/ENTÃO | `reasoning.txt` | `GROQ_MODEL_REASONING` (deepseek-r1-distill) |
| 7 | Hermenêutica bíblica | `hermeneutics.txt` | `GROQ_MODEL_HERMENEUTICS` (gemma2-9b-it) |

Implementação: `motor/pipeline/llm/layers.py` (`LLMPipeline`) sobre
`motor/adapters/llm_router.py` (`LLMRouter`: Local GGUF se `LOCAL_LLM_ENABLED`
→ Ollama se `OLLAMA_ENABLED` → Groq → OpenRouter → dry-run). O tier local
(`motor/adapters/local_llm.py`) tenta a cascata GGUF por alias —
7B→3B→1.5B na camada 4 — com perfil de parâmetros por modelo; esgotada,
cai na nuvem. Toda chamada registra em `audit_log`
(modelo, prompt versionado `PROMPT_VERSION`, hash, decisão).

Classificadores locais auxiliares (`motor/ml/`): `event_classifier.py`
(shadow mode da camada 4, audit `camada_4_shadow`), `reranker.py`
(cross-encoder BGE para rerank do RAG e match profecia↔evento),
`spiritual_tone.py`/`spiritual_tone_classifier.py` (tom expansão/contração),
`distill.py` (destilação sklearn — ver `EXTRACTION_MODE=classifier_first`).
O que é pré-treinado, paramétrico ou treinado: ver
[modelos-locais.md](modelos-locais.md).

A camada 4 passa `evento_estruturado.schema.json` como `json_schema` na
chamada LLM — enforcement de formato na API (Groq/OpenRouter strict,
Ollama `format`); as demais camadas seguem em `json_object`.

## Camada 8 — Correlação matemática

| Item | Valor |
|------|-------|
| Módulo | `motor/pipeline/correlation/engine.py` |
| Matemática | `motor/math/bayesian.py`, `hmm.py` (Viterbi), `mcda.py` |
| Domínio | `motor/domain/` — `phases.py`, `energies.py`, `macro_micro.py`, `false_leader.py`, `beasts.py`, `apocalyptic_signals.py`, `spiritual_proximity.py`, `phase_transition.py` |
| Pesos | `WEIGHT_BAYES=0.35`, `WEIGHT_HMM=0.35`, `WEIGHT_LLM=0.30` |
| Thresholds | `FALSE_LEADER_INCONGRUENCE_THRESHOLD`, `PHASE_CONFIDENCE_MIN`, `PHASE_TRANSITION_MARGIN_MAX` |
| Saída | `resultado_correlacao.schema.json` → `resultados_escatologicos` |

Consolida extração, timeline, raciocínio e hermenêutica em: fase estimada
(HMM/Viterbi sobre a série diária de observações — histórico de
`resultados_escatologicos` + eventos do dia), convicção Bayesiana, índice
global, alerta de falso líder, scores Besta do Mar/Terra, proximidade
espiritual e transição de fase. Matrizes do HMM vêm de `parametros_fase`
(versão ativa) e podem ser recalibradas via EM offline
(`train-phase-hmm`).

## Rankings Top-10 (MCDA)

`motor/math/mcda.py::rank_candidates` sobre `config/candidatos_seed.json`,
com prior Bayesiano do PAP do dia anterior (`ranking_probabilistico`).
Cada item valida `ranking_candidato.schema.json`. Campos: `posicao`,
`probabilidade_atual` (PAP 0–100), `tendencia_24h`, `fator_principal`,
`scores_criterio`.

## Grafo (GNN v1)

`motor/ml/graph.py` (`PropheticGraph`) + `motor/ml/gnn.py` — SAGEConv 2
camadas via PyTorch Geometric quando o extra `[gnn]` está instalado;
caso contrário, proxy NumPy. Os pesos são treináveis offline por link
prediction auto-supervisionada (`train-gnn` → `config/gnn_weights.pt`,
carregado lazy como `pyg_trained`). Persiste `grafo_nos`/`grafo_arestas`
e expõe `graph_convergence` nas métricas.

## Camada 10 — Ameaças por país

`motor/pipeline/threat_analysis.py` sobre ~15 países de
`config/countries_focus.json`. Métricas: instabilidade jurídica, controle
financeiro, ameaça à liberdade religiosa, intensidade de conflito.
Saída: `ameacas_pais` (validada por `ameaca_pais.schema.json`) + payload
`ameacas_paises`. Enriquecida por ecos (L11) e Joshua Project
(`joshua_analysis.py`).

## Camada 11 — Ecos históricos

`motor/pipeline/historical_echo.py` com seed
`config/historical_echoes_seed.json`. Similaridade por keywords + DTW leve +
embeddings; ajusta a urgência das prescrições da L10.

## Camada 12 — ABM leve

`motor/pipeline/abm_simulation.py` — agentes Governo/Finanças/Cidadão/
Corporação/Mídia em Python puro; 100 runs × 24 meses por país foco.
Saída: `simulacoes_abm` (`fragility_index`, `probabilistic_outcomes`,
gatilhos).

## Camada 13 — Red team adversarial

`motor/pipeline/adversarial_validation.py` — Top-5 países de maior risco;
bootstrap removendo ~20% dos eventos + síntese LLM. Saída:
`adversarial_reviews` (`resilience_score`, contrateste). `resilience < 0.5`
força urgência condicional na L15.

## Camada 14 — Proveniência (ledger Postgres)

`motor/pipeline/provenance.py` — cadeia SHA-256 por estágio
(`ingestion → extraction → correlation → threats → simulation →
adversarial → report`) em `provenance_log` + Merkle root do dia.
**Postgres only** — sem publicação on-chain. Se `verify_chain` falhar → L15
força `urgency: condicional`. UI: "Verificar integridade" no `/globo`.

## Camada 15 — Recomendações adaptativas

`motor/pipeline/adaptive_recommendations.py` — triggers `SE métrica > limiar
ENTÃO ação em N horas`; urgência `agora | semana | mes | condicional`.
Saída: `recomendacoes_adaptativas`.

## Camada 9 — Relatórios + persistência final

`motor/pipeline/reports/generator.py` (Jinja2 → `relatorio_html`,
`relatorio_pdf_b64`). O payload final valida
`resultado_escatologico.schema.json` **antes** de gravar em
`resultados_escatologicos` (append-only; correções via `revert-day`).
Status `pending_review` quando há transição de fase e
`AUTO_APPROVE_CRITERIA=false` — aprovação via endpoints admin de review.
Ao final, `newsletter_service.py` envia o digest diário (Resend,
`EMAIL_DRY_RUN`).

## Motores Nível 2 e 3 (fora do run diário)

| Nível | Módulo | Janelas |
|-------|--------|---------|
| 2 — Síntese | `motor/pipeline/synthesis.py` | `weekly`, `monthly`, `quarterly`, `semiannual`, `annual` |
| 3 — Híbrido | `motor/pipeline/hybrid_analysis.py` | `quarterly`, `semiannual`, `annual` |

Agregam deltas de `resultados_escatologicos` em `snapshots_periodo`; o
Nível 3 cruza snapshots com RAG teológico. Utilitários:
`motor/pipeline/data_drift.py` (drift mensal), `neutrality_filter.py`,
`scenario_whatif.py` (Monte Carlo), `archive.py` (cold storage — no-op
postgres_only), `graph_service.py` (payload do grafo para a API).

## Fora de escopo

Camadas 17–22 (rede de nós, consenso, tokenomia, DAO, Nostr, mesh) e
publicação on-chain do Merkle root — não implementadas neste núcleo.

## Camada 16 — Análise de simbolismo (proposta)

**Status**: Proposta — não implementado

|| Item | Valor |
||------|-------|
|| Módulo | `motor/pipeline/symbolic_analysis.py` |
|| Fonte | The Economist (capas + artigos) |
|| Modelo | Multimodal (GPT-4V, Gemini Vision, ou local com CLIP) |
|| Prompt | `prompts/v1/symbolic_analysis_pt.md` |
|| Saída | `analise_simbolismo` (tabela PostgreSQL) + scores para Bestas/Falso Líder |

**Objetivo**: Interpretar simbolismo visual e narrativas ocultas em contexto escatológico cristão.

**Fluxo**:
1. Ingestão The Economist → OCR da capa (se imagem)
2. Camada 16 (Symbolic Analysis):
   - Interpretação simbólica via LLM multimodal
   - Identificação de agenda narrativa (centralização de poder, controle financeiro, tecnologia de vigilância, etc.)
   - Correlação com corpus teológico (RAG)
   - Mapeamento para "bestas" e "falso líder" (se aplicável)
3. Banco + Dashboard

**Prompts**:
- Análise visual: "Interprete o simbolismo desta capa em contexto escatológico cristão"
- Correlação:
  - Se simbolismo = "besta do mar" (financeiro) → score_bestas.mar
  - Se simbolismo = "besta da terra" (ideológico/tecnológico) → score_bestas.terra
  - Se narrativa = "falso líder" → score_falso_líder

**Implementação proposta**:
- Adapter `the_economist.py` (scraper com BeautifulSoup/Playwright)
- Schema para `capas_the_economist` (tabela PostgreSQL)
- CLI: `python -m motor.cli analyze-the-economist`
- Dashboard: nova página/seção em `front-end/src/app/simbolismo/`
