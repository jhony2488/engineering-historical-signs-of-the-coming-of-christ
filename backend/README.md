# Backend — Motor de IA Escatológico

Motor Python de processamento batch para **Engenharia de Sinais Históricos da vinda de Cristo**.

> Documentação completa em [`docs/`](docs/) · Contribuição: [`docs/REQUISITOS_CONTRIBUICAO.md`](docs/REQUISITOS_CONTRIBUICAO.md)

## Arquitetura (9 camadas)

| Camada | Responsabilidade | Tecnologia |
|--------|------------------|------------|
| 1 | Ingestão RSS/GDELT/ACLED | `feedparser`, `httpx` + dedup semântico BGE |
| 2 | Pré-processamento e chunking | `BeautifulSoup`, heurísticas |
| 3 | Embeddings + RAG teológico | BGE-M3, pgvector, BGE reranker (opcional) |
| 3.5 | Gate de relevância de chunks | Zero-shot BGE-M3 / lexical (`motor/ml/relevance.py`) |
| 4 | Extração estruturada JSON | Groq Llama + shadow classifier (`motor/ml/event_classifier.py`) |
| 5 | Linha temporal | Groq Mistral/Llama |
| 6 | Raciocínio SE/ENTÃO | Groq DeepSeek/Llama |
| 7 | Hermenêutica bíblica | Groq Gemma/Llama + RAG |
| 8 | Correlação Bayes + HMM + MCDA | `numpy` (Viterbi puro) |
| 9 | Relatórios HTML/JSON | Jinja2 |

**GNN v1:** SAGEConv via PyTorch Geometric (extra `[gnn]`, pesos treináveis por
link prediction via `train-gnn`) ou proxy NetworkX — ver
[`docs/modelos-locais.md`](docs/modelos-locais.md).

**Classificadores locais (`motor/ml/`):** relevância zero-shot, shadow classifier da
camada 4, cross-encoder (RAG rerank + match profecia↔evento), dedup semântico e
destilação sklearn sobre embeddings BGE (`EXTRACTION_MODE=classifier_first` após
`export-extraction-dataset` + `train-event-classifier`). Taxonomia
pré-treinado × paramétrico × treinado: [`docs/modelos-locais.md`](docs/modelos-locais.md).

## Setup local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e ".[ml,dev]"
copy .env.example .env
```

Opcional — SLM local in-process (llama.cpp GGUF, camada 4):

```bash
pip install -e ".[local]"
python scripts/download_models.py --all   # cascata 7B→3B→1.5B → models_cache/
# LOCAL_LLM_ENABLED=true no .env
```

### PostgreSQL com pgvector

1. Inicie o PostgreSQL com pgvector pelo `docker compose up -d postgres` ou use
   um servidor PostgreSQL com a extensão pgvector disponível.
2. Aplique as migrations SQL de [`migrations/`](migrations/) usando o script Python:

   ```bash
   python scripts/run_migrations.py
   ```

   Este script usa a conexão PostgreSQL já configurada via `DATABASE_URL`
   e aplica todas as migrations em ordem alfabética.

   **Alternativa com psql (se instalado):**

   **PowerShell (Windows):**
   ```powershell
   Get-ChildItem migrations\*.sql |
     Sort-Object Name |
     ForEach-Object { psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName }
   ```

   **Bash (Linux/Mac/WSL):**
   ```bash
   for f in migrations/*.sql; do
     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```

   **Via Docker Compose (local):**
   As migrations são aplicadas automaticamente ao criar um volume novo:
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   ```

3. Configure `DATABASE_URL` em `backend/.env`; o motor e a API conectam
   diretamente ao PostgreSQL, sem SDK nem credenciais de uma API gerenciada.

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
| `DATABASE_URL` | Conexão direta do motor e da API ao PostgreSQL com pgvector |
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
