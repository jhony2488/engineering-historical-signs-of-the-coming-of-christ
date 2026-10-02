# Modelos locais e classificadores — pré-treinados × paramétricos × treinados

Referência consolidada dos modelos de ML do motor (`motor/ml/`, `motor/math/`):
o que já vem pronto, o que é só configuração de pesos e o que realmente treina.

## Resposta rápida

| Componente | Modelo | Precisa treinar? | Como calibrar |
|------------|--------|------------------|---------------|
| Embeddings | `BAAI/bge-m3` (`BGE_MODEL_NAME`) | Não | Trocar o nome do modelo |
| Reranker cross-encoder | `BAAI/bge-reranker-v2-m3` (`RERANKER_MODEL_NAME`) | Não | Trocar o nome do modelo |
| Tom espiritual | `cardiffnlp/twitter-xlm-roberta-base-sentiment` (`SENTIMENT_MODEL_NAME`) + keywords | Não | `motor/config/spiritual_tone_weights.json` (blend, mapping, léxico) |
| Gate de relevância / shadow classifier | Zero-shot sobre BGE-M3 | Não | `config/classifier_prototypes.json` (descrições de rótulos) |
| Bayes | `motor/math/bayesian.py` | Não | Priors/likelihoods calculados por run |
| HMM de fases | `motor/math/hmm.py` (Viterbi) | **Opcional** (EM offline) | `parametros_fase` no Supabase ou `train-phase-hmm` |
| MCDA rankings | `motor/math/mcda.py` | Não | Pesos `WEIGHTS_MAR`/`WEIGHTS_TERRA` (exige issue prévia) |
| Classificador de extração | sklearn (LogReg/Ridge) sobre BGE-M3 | **Sim** (destilação) | `export-extraction-dataset` → `train-event-classifier` |
| GNN | SAGEConv 2 camadas | **Opcional** (link prediction) | `train-gnn` → `config/gnn_weights.pt` |

## Modelos pré-treinados (HuggingFace, CPU, lazy-load)

Baixados do HF Hub na primeira execução (cache em `~/.cache/huggingface`,
já cacheado pelos workflows). Nenhum fine-tuning:

- **`BAAI/bge-m3`** — embeddings densos (1024d). Base do RAG teológico,
  dedup semântico, zero-shot dos classificadores e da destilação sklearn.
- **`BAAI/bge-reranker-v2-m3`** — cross-encoder para rerank do RAG e match
  evento↔profecia (`RERANKER_ENABLED`, `FULFILLMENT_CE_WEIGHT`).
- **`cardiffnlp/twitter-xlm-roberta-base-sentiment`** — sentimento
  multilíngue (positive/negative/neutral) mapeado para expansão/contração.
  Configurável via `SENTIMENT_MODEL_NAME` — ao trocar, manter o label space.

Fallbacks quando o modelo não carrega (sem rede, sem extras `[ml]`):
embeddings caem para hash determinístico (log `embedding_hash_fallback_active`),
reranker degrada para ordem de cosseno, tom espiritual usa só keywords
(`spiritual_keywords_v1`).

## Zero-shot por protótipos — "treinar" = editar JSON

`RelevanceGate` (camada 3.5) e `EventShadowClassifier` (shadow da camada 4)
classificam por **cosseno entre o embedding do texto e embeddings de
descrições textuais de rótulos** em
[`config/classifier_prototypes.json`](../config/classifier_prototypes.json)
(`relevance_positive/negative`, `evento`, `regiao`, `dimensao`, `topico`).

Calibrar = editar as descrições no JSON — sem treino, sem artefato. Sem
embeddings, degradam para heurística lexical de keywords
(`PROPHECY_SIGNAL_KEYWORDS`, `MACRO_KEYWORDS`, …).

## Paramétricos — só pesos, nunca treinam

- **Bayes** (`math/bayesian.py`): teorema puro; prior + likelihoods vêm dos
  eventos do dia e do resultado anterior.
- **MCDA** (`math/mcda.py`): pesos fixos `WEIGHTS_MAR`/`WEIGHTS_TERRA`.
- **Tom espiritual**: blend keywords + sentimento cujos pesos e mapeamento
  vivem em `motor/config/spiritual_tone_weights.json` — ajuste fino sem
  re-treinar o modelo.
- **HMM** (`math/hmm.py`): matrizes default no código **ou** lidas de
  `parametros_fase` (versão `ativo=true`): `transicoes.startprob`,
  `transicoes.matrix`, `emissoes`. No run diário, `fit_or_default` faz só um
  blend leve de emissões com a distribuição do dia — não é EM.

## Treinados de verdade

### Destilação sklearn (camada 4)

`export-extraction-dataset` exporta pares trecho↔extração validada do LLM
(mínimo `DISTILL_MIN_ROWS=300`); `train-event-classifier` treina
`LogisticRegression`/`Ridge` sobre embeddings BGE-M3 e grava
`config/event_classifier/*.joblib` + `meta.json`. Ativado por
`EXTRACTION_MODE=classifier_first` (`CLASSIFIER_CONFIDENCE_MIN` decide quando
cair para o LLM).

### HMM — EM (Baum-Welch) offline

`train-phase-hmm` reconstrói a série diária de observações a partir de
`resultados_escatologicos` (`metricas.avg_tension`, `avg_impact`,
`contracao_ratio` → `discretize_observation`), roda EM NumPy
(`HMM_EM_MIN_DAYS`, `HMM_EM_MAX_ITER`, `HMM_EM_TOL`) e, com `--persist`,
grava nova versão em `parametros_fase` com `ativo=false, aprovado=false` —
a ativação é manual após revisão, coerente com o fluxo de aprovação humana.

No run diário, o orquestrador também passa o histórico de observações ao
`CorrelationEngine` — o Viterbi enxerga a sequência de dias, não só os
eventos do dia corrente.

### GNN — link prediction auto-supervisionado

`PropheticGNN` usa `torch_geometric` quando o extra `[gnn]` está instalado
(`pip install -e ".[gnn]"`); sem ele, proxy NumPy/NetworkX. O encoder
SAGEConv **não aprende nada sozinho** — pesos aleatórios produzem só uma
propagação estrutural. `train-gnn` treina por link prediction sobre
`grafo_arestas` (arestas reais = positivos, pares sem aresta = negativos,
BCE) e salva `config/gnn_weights.pt` (`GNN_WEIGHTS_PATH`), carregado lazy —
backend reportado como `pyg_trained` no payload do grafo.

Hiperparâmetros: `GNN_TRAIN_EPOCHS`, `GNN_TRAIN_LR`, `GNN_NEG_RATIO`.
`GNN_TEXT_FEATURES_ENABLED=true` mistura projeção determinística do
embedding BGE do texto do nó nas features (além do one-hot de tipo + peso).

## Saída estruturada LLM — formato via config, não via prompt

As chamadas LLM não dependem só do texto do prompt para o formato de saída:
`LLMRouter.complete(json_mode=True)` vira `response_format=json_object`
(Groq/OpenRouter) ou `format="json"` (Ollama) na chamada de API.

Camada 4 vai além: passa `json_schema=evento_estruturado.schema.json` —
enforcement do **formato exato** na geração (`json_schema` strict no
Groq/OpenRouter, `format=<schema>` no Ollama). Isso tira o contrato do
contexto do modelo e evita respostas malformadas de modelos menores.
`_parse_json` + `SchemaValidator` continuam como rede de segurança.
Camadas 5–7 seguem em `json_object` até terem schemas próprios (contrato —
exige issue prévia).

## Limites conhecidos

- O GNN treinado opera sobre grafos pequenos (~500 nós); features de texto
  via BGE elevam a qualidade, mas aumentam o custo por run.
- RoBERTa/XLM-R de sentimento é genérico — o eixo expansão/contração é
  mantido pelo léxico escatológico (`blend_weights`).
- Modelos destilados dependem de volume de runs acumulados no Supabase.
