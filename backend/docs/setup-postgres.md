# Setup PostgreSQL com pgvector

## 1. Provisionar PostgreSQL

Use o PostgreSQL do `docker compose` local ou outro servidor PostgreSQL que
tenha a extensão pgvector instalada. O backend acessa o banco diretamente pelo
protocolo PostgreSQL, sem SDK ou API intermediária.

## 2. Executar as migrations

Na primeira inicialização, o Compose aplica as migrations automaticamente ao
criar um volume de dados novo. Para um banco existente, execute todos os
arquivos SQL em ordem:

```powershell
Get-ChildItem backend\migrations\*.sql |
  Sort-Object Name |
  ForEach-Object { psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName }
```

As migrations criam:

- Extensão `vector` (pgvector)
- Tabelas das camadas do motor
- Índices BRIN, GIN e HNSW
- Seeds de candidatos e `parametros_fase` — calibração versionada do HMM
  (`ativo=true` = versão em uso; novas versões do `train-phase-hmm` entram
  inativas até aprovação)
- `20261002000001_propostas_ajuste.sql` — propostas de ajuste geradas por
  LLM para revisão humana (`pendente` → `aprovada`/`rejeitada`/`aplicada`),
  acessadas pelos endpoints `/api/v1/admin/propostas-ajuste*`

## 3. Variável de ambiente

```env
DATABASE_URL=postgresql://sinais:sinais@localhost:5433/sinais
```

Esse valor corresponde ao PostgreSQL local do Compose. Para um servidor
remoto, use a URL fornecida pelo provedor e habilite TLS quando necessário
(por exemplo, `?sslmode=require`).

## 4. Verificar

```bash
python -m motor.cli run-daily --dry-run
```

Com `DATABASE_URL` configurada e sem `--dry-run`, confira no PostgreSQL:

- `resultados_escatologicos` — 1 linha por dia
- `audit_log` — logs por camada LLM
- `ranking_probabilistico` — Top-10 mar e terra

## 5. GitHub Actions

Adicione os secrets no repositório:

| Secret | Valor |
|--------|-------|
| `DATABASE_URL` | String de conexão PostgreSQL com pgvector |
| `GROQ_API_KEY` | chave Groq |
| `OPENROUTER_API_KEY` | fallback (opcional mas recomendado) |

Variável opcional: `LLM_DRY_RUN=true` para CI sem chaves LLM.
