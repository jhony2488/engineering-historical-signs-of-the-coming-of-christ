# GitHub Actions

Workflows na raiz do repositório (`.github/workflows/`), executando comandos em `backend/`.

## daily-batch.yml

| Item | Valor |
|------|-------|
| Cron | `0 7 * * *` UTC (~04:00 BRT) |
| Comando | `python -m motor.cli run-daily` |
| Timeout | 120 min |

### Secrets necessários

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY` (fallback)

### Disparo manual

Actions → **Daily Batch** → **Run workflow**

## weekly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Segunda `30 8 * * 1` UTC |
| Comando | `python -m motor.cli run-synthesis --window weekly` |

Agrega deltas e chama LLM sobre JSON resumido (Motor Nível 2).

## monthly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Dia 1, `0 9 1 * *` UTC |
| Comando | `python -m motor.cli run-synthesis --window monthly` |

## quarterly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Jan/Abr/Jul/Out dia 1, `0 10 1 1,4,7,10 *` UTC |
| Comando | `python -m motor.cli run-synthesis --window quarterly` |

## semiannual-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | 1º de janeiro e 1º de julho, `15 9 1 1,7 *` UTC |
| Comando | `python -m motor.cli run-synthesis --window semiannual` |

Motor Nível 2 — síntese semestral (180 dias).

## quarterly-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | Jan/Abr/Jul/Out dia 1, `45 10 1 1,4,7,10 *` UTC |
| Comando | `python -m motor.cli run-hybrid-analysis --window quarterly` |

Motor Nível 3 — análise híbrida trimestral (`quarterly_hybrid`). Executa após `quarterly-synthesis.yml` (10:00 UTC).

## semiannual-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | 1º de julho `0 11 1 7 *` UTC; 1º de janeiro `30 12 1 1 *` UTC (após annual-hybrid) |
| Comando | `python -m motor.cli run-hybrid-analysis --window semiannual` |

Motor Nível 3 — análise híbrida semestral (`semiannual_hybrid`). Executa após `semiannual-synthesis.yml` (09:15 UTC).

## annual-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | 1º de janeiro, `0 11 1 1 *` UTC |
| Comandos | `run-synthesis --window annual` → `run-hybrid-analysis --window annual` |

Motor Nível 3 — análise híbrida anual: cruza snapshots semanal/mensal/trimestral/anual com RAG teológico (`annual_hybrid`).

## motor-nivel-3-dispatch.yml

Disparo manual com escolha de janela (`quarterly` | `semiannual` | `annual`) e opção de rodar síntese Nível 2 antes do híbrido.

## Calendário resumido (UTC)

| Janela | Nível 2 (síntese) | Nível 3 (híbrido) |
|--------|-------------------|-------------------|
| Semanal | Seg `30 8 * * 1` | — |
| Mensal | Dia 1 `0 9 1 * *` | — |
| Trimestral | Dia 1 trim. `0 10 1 1,4,7,10 *` | Dia 1 trim. `45 10 1 1,4,7,10 *` |
| Semestral | `15 9 1 1,7 *` | Jul `0 11 1 7 *`; Jan `30 12 1 1 *` |
| Anual | Jan 1 `0 11 1 1 *` (em annual-hybrid) | Jan 1 `0 11 1 1 *` |

> O motor possui três níveis operacionais (diário, síntese, híbrido). Não há Motor Nível 4 no código — janelas mensais usam apenas Nível 2.

## CI sem chaves LLM

Defina variável de repositório `LLM_DRY_RUN=true` para pipelines de teste sem consumo de API.

## Cache

O workflow diário cacheia `~/.cache/huggingface` para o modelo BGE-M3.
