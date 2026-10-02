# Contrato API — FastAPI v1

Base URL local: `http://localhost:8000` · implementação:
[`api/main.py`](../api/main.py). Todos os endpoints públicos respeitam
`API_RATE_LIMIT` (default `30/minute`, por IP).

## Saúde

### `GET /health`

```json
{ "status": "ok", "service": "motor-escatologico" }
```

## Resultados diários

### `GET /api/v1/resultado/atual`

Retorna o último `json_analise_ia` processado. **404** se nenhum batch foi
executado.

**Resposta 200** — campos principais:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `schema_version` | string | Versão do contrato JSON |
| `data_referencia` | date | Data do batch |
| `fase_atual` | enum | `FASE_I` … `FASE_IV` |
| `probabilidade_fase` | float | 0–1 |
| `indice_global` | float | 0–1 |
| `confianca` | float | 0–1 |
| `correlacao` | object | Bayes, HMM, alertas, falso líder, bestas |
| `ranking_mar` / `ranking_terra` | array | Top-10 Besta do Mar / da Terra |
| `ameacas_paises` | array | Camada 10 |
| `simulacoes_abm` / `adversarial` / `recomendacoes_adaptativas` | array | Camadas 12/13/15 |
| `provenance` | object | Merkle root + estágios (Camada 14) |
| `baseline_historico` | object | Profecias cumpridas (Camada 0) |
| `relatorio_html` | string | HTML embutido |
| `status` | enum | `complete` / `pending_review` / `reverted` / `rejected` |

### `GET /api/v1/resultado/historico`

| Param | Tipo | Default |
|-------|------|---------|
| `desde` | `YYYY-MM-DD` | — |
| `limit` | int (1–365) | 90 |

Array de payloads `json_analise_ia` ordenados por data.

## Rankings

### `GET /api/v1/ranking/{personagem}`

`personagem`: `besta_mar`, `besta_terra`, `mar` ou `terra` · query opcional
`data=YYYY-MM-DD`. Fallback para o ranking do último resultado.

```json
{
  "posicao": 1,
  "candidato_id": "cand-001",
  "nome": "Coalizão de Mediação Global",
  "personagem": "besta_mar",
  "probabilidade_atual": 72.1,
  "tendencia_24h": 0.0,
  "fator_principal": "Destaque em influencia_unificacao"
}
```

## Baseline (Camada 0)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/baseline/historico` | Overview de profecias cumpridas (inicializa se vazio) |
| `GET /api/v1/baseline/arquivo?status=&limit=` | Arquivo profético (`status`: `cumprida`/`parcial`/`pendente`; `limit` ≤ 500) |
| `GET /api/v1/baseline/atualizacoes?limit=` | Profecias detectadas após o baseline (limit ≤ 100) |

## Snapshots (Motores Nível 2/3)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/snapshot/{janela}` | Snapshot mais recente — 404 se inexistente |
| `GET /api/v1/snapshot/{janela}/historico?limit=` | Histórico (limit ≤ 52) |

`janela`: `weekly`, `monthly`, `quarterly`, `semiannual`, `annual` e variantes
`*_hybrid` do Nível 3.

## Grafo e cenários

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/grafo` | Payload do grafo profético (nós/arestas) |
| `GET /api/v1/cenarios` | Cenários ativos construídos do grafo |
| `POST /api/v1/cenarios/what-if` | Simulação Monte Carlo — body `{ativos: [], base_indice: 0.58, trials: 200}` (rate `20/minute`) |

## Ameaças por país

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/ameacas/paises?data=` | Lista de ameaças (fallback: último resultado) |
| `GET /api/v1/ameacas/paises/{code}?data=` | Detalhe: `ameaca` + `abm` + `adversarial` + `recomendacoes` + `provenance` — 404 se país ausente |

## Missiológico (Joshua Project)

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/v1/missiological/analyze` | Roda análise sobre `joshua_project_data` e persiste (rate `10/minute`) |
| `GET /api/v1/missiological/results?country=&limit=` | Resultados; fallback computa on-the-fly |

## Proveniência e relatório

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/provenance/day/{day}` | Entradas `provenance_log` + `verify_chain` do dia (`YYYY-MM-DD`) |
| `GET /api/v1/relatorio/pdf` | PDF do último resultado (`application/pdf`); 503 se gerador indisponível |

## Endpoints admin

Header obrigatório: `X-Admin-Key: <ADMIN_API_KEY>` (401 se inválido).

| Endpoint | Rate | Descrição |
|----------|------|-----------|
| `POST /api/v1/admin/run-daily?ref_date=&force=` | `5/minute` | Enfileira batch diário → `{status: accepted, job_id}` |
| `POST /api/v1/admin/run-synthesis?window=` | `5/minute` | Motor Nível 2 (`weekly`…`annual`) → `job_id` |
| `POST /api/v1/admin/run-hybrid-analysis?window=` | `3/minute` | Motor Nível 3 (`quarterly`/`semiannual`/`annual`) → `job_id` |
| `GET /api/v1/admin/jobs/{job_id}` | padrão | Status do job na fila Redis |
| `POST /api/v1/admin/approve-review?data_referencia=` | `10/minute` | Aprova transição `pending_review` → `complete` |
| `POST /api/v1/admin/reject-review?data_referencia=` | `10/minute` | Rejeita transição → `status: rejected` (append-only) |

## Integração Next.js

1. Cache localStorage com expiração diária (mesmo dia = não chamar API)
2. Buscar `/api/v1/resultado/atual` após horário do batch (~04:00 BRT)
3. Histórico para gráficos: `/api/v1/resultado/historico?desde=2026-01-01`
4. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend — use esta API ou
   Supabase `anon` com RLS
