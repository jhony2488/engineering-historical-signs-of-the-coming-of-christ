# Provedores de modelos (Groq → OpenRouter → Ollama)

O `doc.txt` original previa **Ollama** local (Llama, Mistral Nemo, DeepSeek-R1, Gemma 2).
Na fase zero-custo, o motor usa **Groq Cloud** (tier gratuito) com **fallback OpenRouter**.
**Ollama** entra na fila quando `OLLAMA_ENABLED=true` (local/RunPod).

| Camada doc | Modelo doc | Alias config | Groq (mapa) | OpenRouter | Ollama |
|------------|------------|--------------|-------------|------------|--------|
| Extração (4) | Llama 3.1/3.2 | `llama-3.1-8b-instant` | llama-3.1-8b-instant | meta-llama/... | llama3.1:8b |
| Timeline (5) | Mistral Nemo 12B | `mistral-nemo` | llama-3.3-70b-versatile* | mistralai/mistral-nemo | mistral-nemo:12b |
| Raciocínio (6) | DeepSeek-R1 | `deepseek-r1-distill` | deepseek-r1-distill-llama-70b | deepseek/... | deepseek-r1:8b |
| Hermenêutica (7) | Gemma 2 | `gemma2-9b-it` | gemma2-9b-it | google/gemma-2-9b-it | gemma2:9b |

\* Groq free tier não oferece Mistral Nemo; usa Llama 70B como proxy até OpenRouter/Ollama.

Ordem do `LLMRouter`: **Ollama (se habilitado) → Groq → OpenRouter → dry-run**.

## Modelos locais (não-LLM)

Paralelos ao router acima, `motor/ml/` roda classificadores pequenos em CPU —
sem chave de API, instalados via `pip install -e ".[ml]"`:

| Modelo | Uso |
|--------|-----|
| `BAAI/bge-m3` (`BGE_MODEL_NAME`) | Embeddings + classificação zero-shot por protótipos (`config/classifier_prototypes.json`) — gate de relevância e shadow classifier |
| `BAAI/bge-reranker-v2-m3` (`RERANKER_MODEL_NAME`) | Cross-encoder: rerank do RAG teológico e match profecia↔evento |
| Bundle sklearn (`config/event_classifier/`) | Extração local destilada da Camada 4 — ativo com `EXTRACTION_MODE=classifier_first` |

Sem `sentence-transformers`/`scikit-learn` instalados, o pipeline cai nos
fallbacks léxicos/hash e segue normalmente — os classificadores nunca são
obrigatórios.

```bash
# .env
GROQ_MODEL_EXTRACTION=llama-3.1-8b-instant
GROQ_MODEL_TIMELINE=mistral-nemo
GROQ_MODEL_REASONING=deepseek-r1-distill
GROQ_MODEL_HERMENEUTICS=gemma2-9b-it
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
```

## Saída estruturada por provedor

O formato JSON das respostas é enforced na **configuração da chamada**, não
só no prompt — `LLMRouter.complete(json_mode=..., json_schema=...)`:

| Provedor | `json_mode=True` | `json_schema` informado |
|----------|------------------|-------------------------|
| Groq | `response_format=json_object` | `response_format=json_schema` (strict) |
| OpenRouter | `response_format=json_object` | `response_format=json_schema` (strict) |
| Ollama | `format="json"` | `format=<schema dict>` |

A camada 4 passa `evento_estruturado.schema.json` como `json_schema`;
demais camadas usam `json_object` (schemas próprios = follow-up, exige
issue prévia). `SchemaValidator` continua validando pós-parse.

## Modelos locais (HuggingFace, sem chave de API)

Além dos LLMs, o motor usa modelos HF pré-treinados locais em CPU:

| Papel | Modelo | Env |
|-------|--------|-----|
| Embeddings | `BAAI/bge-m3` | `BGE_MODEL_NAME` |
| Reranker | `BAAI/bge-reranker-v2-m3` | `RERANKER_MODEL_NAME` |
| Sentimento (tom espiritual) | `cardiffnlp/twitter-xlm-roberta-base-sentiment` | `SENTIMENT_MODEL_NAME` |

Detalhes (o que treina e o que só recebe parâmetros):
[modelos-locais.md](modelos-locais.md).
