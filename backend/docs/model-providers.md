# Provedores de modelos (Ollama → Groq/OpenRouter)

O `doc.txt` original previa **Ollama** local (Llama, Mistral Nemo, DeepSeek-R1, Gemma 2).
Na fase zero-custo atual, o motor usa **Groq Cloud** (tier gratuito) com **fallback OpenRouter**.

| Camada doc | Modelo doc | Implementação atual |
|------------|------------|---------------------|
| Extração (4) | Llama 3.1/3.2 | `GROQ_MODEL_EXTRACTION` (default `llama-3.1-8b-instant`) |
| Timeline (5) | Mistral Nemo 12B | `GROQ_MODEL_TIMELINE` (default `llama-3.3-70b-versatile`) |
| Raciocínio (6) | DeepSeek-R1 | `GROQ_MODEL_REASONING` |
| Hermenêutica (7) | Gemma 2 | `GROQ_MODEL_HERMENEUTICS` |
| Fallback | — | `LLMRouter` → OpenRouter → dry-run |

Para migrar a Ollama/RunPod no futuro, implemente um adapter em `motor/adapters/ollama.py`
e registre-o no `LLMRouter` sem alterar o pipeline.
