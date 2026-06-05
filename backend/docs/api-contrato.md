# Contrato API — FastAPI v1

Base URL local: `http://localhost:8000`

## Endpoints públicos

### `GET /health`

```json
{ "status": "ok", "service": "motor-escatologico" }
```

### `GET /api/v1/resultado/atual`

Retorna o último `json_analise_ia` processado.

**Resposta 200** — campos principais:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `schema_version` | string | Versão do contrato JSON |
| `data_referencia` | date | Data do batch |
| `fase_atual` | enum | `FASE_I` … `FASE_IV` |
| `probabilidade_fase` | float | 0–1 |
| `indice_global` | float | 0–1 |
| `confianca` | float | 0–1 |
| `correlacao` | object | Bayes, HMM, alertas |
| `ranking_mar` | array | Top-10 Besta do Mar |
| `ranking_terra` | array | Top-10 Besta da Terra |
| `relatorio_html` | string | HTML embutido |

**Resposta 404** — nenhum batch executado ainda.

### `GET /api/v1/resultado/historico`

Query params:

| Param | Tipo | Default |
|-------|------|---------|
| `desde` | `YYYY-MM-DD` | — |
| `limit` | int | 90 |

Retorna array de payloads `json_analise_ia` ordenados por data.

### `GET /api/v1/ranking/{personagem}`

`personagem`: `besta_mar`, `besta_terra`, `mar` ou `terra`

Query opcional: `data=YYYY-MM-DD`

**Item do ranking:**

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

## Endpoint admin

### `POST /api/v1/admin/run-daily`

Header obrigatório: `X-Admin-Key: <ADMIN_API_KEY>`

Query params:

| Param | Descrição |
|-------|-----------|
| `ref_date` | `YYYY-MM-DD` (opcional) |
| `force` | `true` para reprocessar data existente |

**Resposta 202:**

```json
{ "status": "accepted", "data_referencia": "2026-06-04" }
```

## Rate limit

Padrão: `30/minute` por IP (configurável via `API_RATE_LIMIT`).

## Integração Next.js

1. Cache localStorage com expiração diária (mesmo dia = não chamar API)
2. Buscar `/api/v1/resultado/atual` após horário do batch (~04:00 BRT)
3. Histórico para gráficos: `/api/v1/resultado/historico?desde=2026-01-01`
4. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend — use esta API ou Supabase `anon` com RLS
