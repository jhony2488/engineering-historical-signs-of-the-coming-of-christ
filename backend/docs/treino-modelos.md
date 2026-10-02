# Treino e recalibração de modelos locais — runbook

Guia operacional para treinar/retreinar os modelos **não-LLM** do motor
(`motor/ml/`, `motor/math/`) quando o histórico acumulado justificar.
Taxonomia completa: [modelos-locais.md](modelos-locais.md).

## Princípios

- **Treino nunca roda no batch diário** — `run-daily` só *consome* modelos
  e parâmetros já ativos. Treinar é sempre um comando CLI manual.
- **Dados vêm do próprio pipeline** — `resultados_escatologicos`,
  `eventos_estruturados`, `grafo_arestas`. Sem dataset externo e sem
  rotulação manual.
- **Versionamento, não substituição** — `parametros_fase` guarda histórico
  por `versao`; artefatos de arquivo (`*.joblib`, `gnn_weights.pt`) podem
  ser copiados com sufixo de data se você quiser rollback manual.
- **Ativação é decisão humana** — nenhum treino se autopromove para
  produção.
- **Tudo é revertível** — `ativo=false`, deletar artefato,
  `EXTRACTION_MODE=llm`.

## Tabela-resumo

| Modelo | Mínimo de dados | Comando | Artefato | Como ativa | Rollback |
|--------|-----------------|---------|----------|------------|----------|
| HMM de fases | `HMM_EM_MIN_DAYS` (30) dias de `resultados_escatologicos` | `train-phase-hmm --persist` | linha nova em `parametros_fase` | `ativo=true` manual no Supabase | `ativo=false` na nova / `true` na anterior |
| Classificador de extração | `DISTILL_MIN_ROWS` (300) extrações validadas | `export-extraction-dataset` → `train-event-classifier` | `config/event_classifier/*.joblib` + `meta.json` | `EXTRACTION_MODE=classifier_first` | `EXTRACTION_MODE=llm` |
| GNN | grafo com arestas acumuladas | `train-gnn` | `config/gnn_weights.pt` | automático no próximo run (`backend=pyg_trained`) | remover o arquivo |
| Zero-shot / tom espiritual | — | editar JSON | `config/classifier_prototypes.json`, `motor/config/spiritual_tone_weights.json` | imediato (arquivo lido a cada chamada) | `git checkout` do arquivo |

## HMM de fases (`train-phase-hmm`)

**Quando treinar:** a partir de ~30 dias de runs. Sinais de que vale
retreinar: fases travadas num único estado por semanas, ou distribuição de
observações muito diferente das emissões default.

```bash
python -m motor.cli train-phase-hmm --limit 365 --persist
```

O comando reconstrói uma observação por dia a partir de
`resultados_escatologicos` (`metricas.avg_tension`, `avg_impact`,
`contracao_ratio` → `discretize_observation`), roda Baum-Welch (EM) NumPy a
partir das matrizes da versão ativa e imprime log-likelihood, iterações e
convergência. Com `--persist`, grava em `parametros_fase` com
`ativo=false, aprovado=false` e `versao` incrementada.

**Revisão:** compare `emissoes`/`transicoes` da versão nova com a ativa no
Supabase (Table Editor ou `select * from parametros_fase order by versao
desc`). Desconfie de transmat degenerada (uma linha com ~1.0 na diagonal e
o resto zerado = overfitting em série curta).

**Ativação:** `ativo=true` na nova versão (e `false` na antiga). O próximo
`run-daily` já usa — sem deploy. Rollback é o inverso.

## Classificador de extração (`export-extraction-dataset` → `train-event-classifier`)

**Termômetro de quando vale:** o shadow mode (`EVENT_SHADOW_ENABLED`,
default ligado) loga concordância local×LLM em `audit_log` como
`camada_4_shadow`. Concordância alta e consistente em `energia`/`dimensao`
= o destilado provavelmente consegue assumir.

```bash
python -m motor.cli export-extraction-dataset --out config/extraction_dataset.jsonl
python -m motor.cli train-event-classifier --dataset config/extraction_dataset.jsonl --out-dir config/event_classifier
```

**Revisão:** `config/event_classifier/meta.json` traz `accuracy` por campo
de classificação e `mae` para `grau_tensao`/`impacto_global` no holdout.
Campos com `skipped: true` tinham classe única — acumule mais dados.

**Ativação:** `EXTRACTION_MODE=classifier_first`. A partir daí o
classificador responde primeiro e o LLM só é chamado quando
`confianca_extracao < CLASSIFIER_CONFIDENCE_MIN` (0.6). Campos narrativos
(`descricao`) continuam extrativos — o LLM segue responsável quando
consultado.

## GNN (`train-gnn`)

**Quando treinar:** quando `grafo_arestas` tiver densidade real acumulada
(o seed sozinho é pequeno demais para o link prediction aprender algo
útil). Requer `pip install -e ".[gnn]"`.

```bash
python -m motor.cli train-gnn --epochs 200
```

Treina encoder SAGEConv 2 camadas: arestas reais = positivos, pares
aleatórios sem aresta = negativos (`GNN_NEG_RATIO`), BCE + Adam
(`GNN_TRAIN_LR`, `GNN_TRAIN_EPOCHS`). Salva em `GNN_WEIGHTS_PATH`
(default `config/gnn_weights.pt`).

**Ativação:** automática — o próximo `run-daily`/`to_api_payload` carrega
os pesos e reporta `gnn_backend: "pyg_trained"`. **Rollback:** remover ou
renomear o arquivo; o backend volta para `pytorch_geometric`/`numpy_proxy`.

Dica: `GNN_TEXT_FEATURES_ENABLED=true` mistura projeção determinística do
embedding BGE do texto do nó nas features — mais semântica, mais custo.

## Protótipos zero-shot e tom espiritual

Não treinam — "calibrar" é editar descrições e pesos:

- `config/classifier_prototypes.json` — descrições por rótulo (gate de
  relevância, shadow classifier). Editar texto = recalibrar.
- `motor/config/spiritual_tone_weights.json` — léxico expansão/contração,
  `roberta_mapping`, `blend_weights`.

Versionamento = git. Efeito é imediato (arquivos lidos a cada chamada).

## Cadência sugerida

| Frequência | Ação |
|------------|------|
| Mensal | Revisar concordância `camada_4_shadow`; `train-phase-hmm --persist` se ≥30 dias novos |
| A cada ~300 extrações novas | `export-extraction-dataset` + `train-event-classifier` |
| Sob demanda | `train-gnn` quando o grafo crescer significativamente |
| Contínuo | Refinar `classifier_prototypes.json` ao ver mismatch recorrente nos audits |

## Automação futura (fora de escopo)

Um workflow mensal (`monthly-model-recalibration.yml`) poderia rodar
`train-phase-hmm --persist` e abrir a nova versão para revisão — automação
do **gatilho**, nunca da **ativação**. Não implementado; exige issue.
