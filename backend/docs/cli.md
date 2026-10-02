# CLI do motor — referência

Todos os comandos rodam a partir de `backend/` via `python -m motor.cli
<comando>` (Typer). Veja `python -m motor.cli --help` para ajuda inline.

## Pipeline

### `run-daily`

Motor Nível 1 — pipeline diário completo (camadas 0–15 + relatório).

| Opção | Descrição |
|-------|-----------|
| `--date YYYY-MM-DD` | Data de referência (default: hoje) |
| `--force` | Reprocessa mesmo se já existir resultado para a data |
| `--dry-run` | Ativa `LLM_DRY_RUN` — simula sem chamar LLMs |

Sem `--force`, o comando é idempotente: se já existe registro para a data,
retorna o resultado existente (`daily_run_skip`).

```bash
python -m motor.cli run-daily --dry-run
python -m motor.cli run-daily --date 2026-06-04 --force
```

### `run-synthesis`

Motor Nível 2 — síntese de padrões sobre deltas agregados.

```bash
python -m motor.cli run-synthesis --window weekly
# weekly | monthly | quarterly | semiannual | annual
```

### `run-hybrid-analysis`

Motor Nível 3 — análise híbrida multi-janela com RAG teológico.

```bash
python -m motor.cli run-hybrid-analysis --window annual
# quarterly | semiannual | annual
```

## Ingestão e baseline

### `ingest-only`

Apenas a Camada 1 — coleta documentos de todas as fontes e persiste.

### `seed-baseline`

Camada 0 — inicializa o overview de profecias cumpridas.

| Opção | Descrição |
|-------|-----------|
| `--force` | Reaplica o seed do baseline histórico |

## Manutenção e correção

### `validate-schemas`

Valida os JSON Schemas de `motor/schemas/` com payloads de exemplo.

### `revert-day`

Insere registro corretivo em `resultados_escatologicos` **sem apagar** o
original (append-only) — marca `status: reverted`, `revisao_humana: true`.

```bash
python -m motor.cli revert-day --date 2026-06-04 --motivo revisao_manual
```

### `run-data-drift` / `run-drift-recalibration`

Refinamento mensal dos critérios de fase (data drift) — revisa se os sinais
ainda fazem sentido com a realidade corrente. `run-drift-recalibration` é
alias de `run-data-drift`. Workflow: `monthly-data-drift.yml`.

### `archive-cold-storage`

No-op intencional — a política atual é retenção somente no Postgres
(`postgres_only`); não exporta arquivos/S3.

## Classificadores locais (destilação)

### `export-extraction-dataset`

Exporta pares trecho↔extração LLM para destilação do classificador local.

```bash
python -m motor.cli export-extraction-dataset --out config/extraction_dataset.jsonl --min-rows 300
```

### `train-event-classifier`

Treina classificadores locais (BGE + sklearn) destilados da camada 4.
Após o treino, `EXTRACTION_MODE=classifier_first` usa o modelo local antes
do LLM (`CLASSIFIER_CONFIDENCE_MIN`).

```bash
python -m motor.cli train-event-classifier --dataset config/extraction_dataset.jsonl --out-dir config/event_classifier
```

## Jobs

### `worker-jobs`

Worker Redis que consome a fila `motor:jobs:pending` (substituto leve de
Celery para jobs enfileirados pelos endpoints admin da API).

```bash
python -m motor.cli worker-jobs --once --max-jobs 50
```

| Opção | Descrição |
|-------|-----------|
| `--once` | Processa um lote e encerra |
| `--max-jobs N` | Limite de jobs por execução (default: 50) |
