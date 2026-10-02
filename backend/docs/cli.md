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

## Scripts auxiliares

### `scripts/download_models.py`

Baixa os GGUFs do tier SLM local para `backend/models_cache/` (cascata de
`LOCAL_MODEL_MAP`). Não é comando Typer — roda como script.

```bash
python scripts/download_models.py          # 1º candidato de cada alias
python scripts/download_models.py --all    # cascata inteira (7B→3B→1.5B)
python scripts/download_models.py --list   # status sem baixar
```

## Classificadores locais (destilação)

Contexto completo sobre quais modelos treinam e quais são pré-treinados:
[modelos-locais.md](modelos-locais.md). Runbook operacional do ciclo de
treino/revisão/ativação: [treino-modelos.md](treino-modelos.md).

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

### `train-phase-hmm`

Recalibra o HMM de fases via EM (Baum-Welch) sobre a série diária de
observações reconstruída de `resultados_escatologicos` (mínimo
`HMM_EM_MIN_DAYS` dias). Com `--persist`, grava nova versão em
`parametros_fase` **inativa e não aprovada** — ativação manual
(`ativo=true`) após revisão.

```bash
python -m motor.cli train-phase-hmm --limit 365 --persist
```

| Opção | Descrição |
|-------|-----------|
| `--persist` | Grava versão inativa em `parametros_fase` |
| `--limit N` | Dias de histórico considerados (default: 365) |

### `train-gnn`

Treina o `PropheticGNN` por link prediction auto-supervisionada sobre o
grafo persistido (`grafo_nos`/`grafo_arestas`) e salva os pesos em
`GNN_WEIGHTS_PATH` (default `config/gnn_weights.pt`). Requer
`pip install -e ".[gnn]"`.

```bash
python -m motor.cli train-gnn --epochs 200 --out config/gnn_weights.pt
```

| Opção | Descrição |
|-------|-----------|
| `--epochs N` | Épocas de treino (default: `GNN_TRAIN_EPOCHS`) |
| `--out PATH` | Destino dos pesos (default: `GNN_WEIGHTS_PATH`) |

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
