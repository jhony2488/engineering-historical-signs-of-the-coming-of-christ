# Provedores de modelos (Local GGUF → Ollama → Gemini → Groq → DeepSeek → OpenRouter)

O `doc.txt` original previa **Ollama** local (Llama, Mistral Nemo, DeepSeek-R1, Gemma 2).
Na fase zero-custo, o motor usa **Groq Cloud** (tier gratuito) com **fallback OpenRouter**.
Antes deles, dois tiers locais podem responder primeiro (ambos opcionais):
**SLM GGUF in-process** (`LocalLlamaClient`, extra `[local]`) e **Ollama**
(quando `OLLAMA_ENABLED=true`).

**Novos provedores gratuitos (2025):**
- **Google AI Studio (Gemini):** 1.500 req/dia, usado para camadas 4, 5, 7
- **DeepSeek API:** 500K tokens/dia, especializado em raciocínio (camada 6)

| Camada doc | Modelo doc | Alias config | Gemini | DeepSeek | Groq (mapa) | OpenRouter | Ollama |
|------------|------------|--------------|--------|----------|-------------|------------|--------|
| Extração (4) | Llama 3.1/3.2 | `llama-3.1-8b-instant` | gemini-2.5-flash-lite | deepseek-chat | llama-3.1-8b-instant | meta-llama/... | llama3.1:8b |
| Timeline (5) | Mistral Nemo 12B | `mistral-nemo` | gemini-3-flash | deepseek-chat | llama-3.3-70b-versatile* | mistralai/mistral-nemo | mistral-nemo:12b |
| Raciocínio (6) | DeepSeek-R1 | `deepseek-r1-distill` | gemini-3-flash | deepseek-reasoner | deepseek-r1-distill-llama-70b | deepseek/... | deepseek-r1:8b |
| Hermenêutica (7) | Gemma 2 | `gemma2-9b-it` | gemini-3-flash | deepseek-chat | gemma2-9b-it | google/gemma-2-9b-it | gemma2:9b |

\* Groq free tier não oferece Mistral Nemo; usa Llama 70B como proxy até OpenRouter/Ollama.

Ordem do `LLMRouter`: **Local GGUF (se habilitado) → Ollama → Gemini → Groq → DeepSeek → OpenRouter → dry-run**.

## Estratégia híbrida (custo zero)

Por padrão, o motor usa provedores otimizados por camada:
- Camadas 4, 5, 7: Gemini Flash (mais rápido, 1.500 req/dia)
- Camada 6: DeepSeek Reasoner (especializado em raciocínio, 500K tokens/dia)

Sem API keys configuradas, o sistema degrada para Groq → OpenRouter → dry-run.

## SLM local in-process (llama.cpp / GGUF)

`motor/adapters/local_llm.py` (`LocalLlamaClient`) roda modelos GGUF em CPU
no próprio processo — sem servidor, análogo ao WebLLM mas sem GPU. Ativado
por `LOCAL_LLM_ENABLED=true` + arquivos em `LOCAL_MODELS_DIR`
(`backend/models_cache/`, ignorado pelo git).

Cada alias de camada resolve para uma **cascata ordenada de candidatos** em
`LOCAL_MODEL_MAP`, cada um com perfil de parâmetros próprio (modelos menores
→ `temperature=0`, `n_ctx` menor, `repeat_penalty` maior). Falha de arquivo
ausente, load ou inferência → próximo candidato; esgotada a cascata, o
router segue para Ollama → Groq.

| Alias | Candidatos (ordem) | Perfis |
|-------|--------------------|--------|
| `llama-3.1-8b-instant` (camada 4) | Qwen2.5-7B Q4_K_M → 3B Q4_K_M → 1.5B Q4_K_M | 7B: ctx 8192, temp 0.1; 3B: ctx 8192, temp 0; 1.5B: ctx 4096, temp 0 |

```bash
pip install -e ".[local]"   # llama-cpp-python
python scripts/download_models.py          # 1º candidato de cada alias
python scripts/download_models.py --all    # cascata inteira
python scripts/download_models.py --list   # status sem baixar
```

Aliases sem entrada em `LOCAL_MODEL_MAP` (camadas 5–7 por ora) pulam o tier
local e vão direto para a nuvem.

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
| Local GGUF | `response_format=json_object` | `response_format` + schema → gramática GBNF |
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
| Tradução EN→PT | `facebook/nllb-200-distilled-600M` | `TRANSLATOR_MODEL` |

## Idioma do pipeline (`PROMPTS_LANG`)

`pt` (default, `prompts/v1/`) | `en` (`prompts/v2_en/`). Com `en`, os campos
narrativos são gerados em inglês e traduzidos EN→PT por NLLB-200 antes de
persistir (`TRANSLATE_NARRATIVES=true`) — schemas e enums permanecem em PT.
Glossário e mapa de referências bíblicas EN→PT em `motor/i18n/translator.py`.

Detalhes (o que treina e o que só recebe parâmetros):
[modelos-locais.md](modelos-locais.md).
