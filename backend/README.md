# Backend — Motor de IA Escatológico

Motor Python de processamento batch para **Engenharia de Sinais Históricos da vinda de Cristo**.

> Documentação completa em [`docs/`](docs/) · Contribuição: [`docs/REQUISITOS_CONTRIBUICAO.md`](docs/REQUISITOS_CONTRIBUICAO.md)

## Arquitetura (9 camadas)

| Camada | Responsabilidade | Tecnologia |
|--------|------------------|------------|
| 1 | Ingestão RSS/GDELT/ACLED | `feedparser`, `httpx` |
| 2 | Pré-processamento e chunking | `BeautifulSoup`, heurísticas |
| 3 | Embeddings + RAG teológico | BGE-M3, pgvector |
| 4 | Extração estruturada JSON | Groq Llama |
| 5 | Linha temporal | Groq Mistral/Llama |
| 6 | Raciocínio SE/ENTÃO | Groq DeepSeek/Llama |
| 7 | Hermenêutica bíblica | Groq Gemma/Llama + RAG |
| 8 | Correlação Bayes + HMM + MCDA | `numpy` (Viterbi puro) |
| 9 | Relatórios HTML/JSON | Jinja2 |

**GNN v1:** centralidade via NetworkX (substituível por PyG/DGL no RunPod).

## Setup local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e ".[ml,dev]"
copy .env.example .env
```

### Supabase (do zero)

1. Crie projeto em [supabase.com](https://supabase.com)
2. SQL Editor → execute [`supabase/migrations/20260604000001_init_schema.sql`](supabase/migrations/20260604000001_init_schema.sql)
3. Copie `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` para `.env`

### Redis (opcional)

```bash
docker compose up -d
```

## Comandos CLI

```bash
python -m motor.cli validate-schemas
python -m motor.cli run-daily --dry-run
python -m motor.cli run-daily --date 2026-06-04 --force
python -m motor.cli run-synthesis --window weekly
python -m motor.cli run-synthesis --window monthly
python -m motor.cli run-synthesis --window annual
python -m motor.cli run-hybrid-analysis --window annual
python -m motor.cli ingest-only
python -m motor.cli revert-day --date 2026-06-04
```

## API FastAPI

```bash
uvicorn api.main:app --reload --port 8000
```

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Liveness |
| GET | `/api/v1/resultado/atual` | Último resultado diário |
| GET | `/api/v1/resultado/historico?desde=2026-01-01` | Série temporal |
| GET | `/api/v1/ranking/besta_mar` | Top-10 Besta do Mar |
| GET | `/api/v1/ranking/besta_terra` | Top-10 Besta da Terra |
| POST | `/api/v1/admin/run-daily` | Header `X-Admin-Key` |

### Exemplo de resposta (`/api/v1/resultado/atual`)

```json
{
  "schema_version": "1.0.0",
  "data_referencia": "2026-06-04",
  "fase_atual": "FASE_II",
  "probabilidade_fase": 0.62,
  "indice_global": 0.58,
  "confianca": 0.71,
  "correlacao": {
    "alerta_falso_lider": false,
    "score_besta_mar": 0.55,
    "score_besta_terra": 0.48
  },
  "ranking_mar": [
    {"posicao": 1, "nome": "Coalizão de Mediação Global", "probabilidade_atual": 72.1, "tendencia_24h": 0.0}
  ]
}
```

## GitHub Actions

Workflows em [`.github/workflows/`](../.github/workflows/):

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | Persistência |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrita batch |
| `GROQ_API_KEY` | LLM primário |
| `OPENROUTER_API_KEY` | Fallback |
| `ADMIN_API_KEY` | API admin |

Variável opcional: `LLM_DRY_RUN=true` para CI sem chaves.

## Testes

```bash
pytest -v
```

## Contrato Next.js

- Cache localStorage com expiração diária no frontend
- Consumir `GET /api/v1/resultado/atual` após batch noturno (~04:00 BRT)
- Rankings: tabela dinâmica com `probabilidade_atual` e `tendencia_24h`
