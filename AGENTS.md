# AGENTS.md — Guia para agentes de IA (e contribuidores)

Contexto e regras para qualquer agente de IA — ou pessoa — que trabalhe neste
repositório. Leia também o [CONTRIBUTING.md](CONTRIBUTING.md) antes de alterar
código.

## O que é este projeto

**Engenharia de Sinais Históricos da vinda de Cristo** — sistema de análise
escatológica que traduz escatologia em engenharia de sinais: processamento
batch diário de fontes históricas/noticiosas (RSS, GDELT, ACLED), correlação
com profecias e publicação de rankings/fases em um dashboard.

## Princípios inegociáveis

- **Análise, não adivinhação de datas** — o sistema mede convergência de
  sinais, nunca prevê calendários.
- **Append-only** — resultados escatológicos nunca são sobrescritos;
  correções usam `revert-day` ou novo registro.
- **Schema primeiro** — todo JSON persistido passa validação em
  `backend/motor/schemas/`.
- **Escritura como âncora** — camadas hermenêuticas consultam o corpus
  teológico (RAG) antes de concluir.
- **Custo zero no início** — priorize Groq free tier, GitHub Actions e
  Supabase free; evite infra 24/7.
- **Front-end só lê** — o dashboard nunca executa pipeline de IA, nunca chama
  LLMs e nunca grava em `resultados_escatologicos`.

## Mapa do monorepo

| Caminho | Conteúdo |
|---------|----------|
| `backend/motor/` | Motor Python — pipeline (ingestão → embeddings/RAG → LLMs → Bayes/HMM/MCDA → relatórios + extensões L10–15). Subpacotes: `pipeline/` (camadas), `domain/` (fases, energias, bestas, falso líder), `math/` (Bayes, HMM, MCDA), `ml/` (relevance, reranker, GNN, classificadores), `adapters/` (Groq/OpenRouter/Ollama, Supabase, Redis, e-mail), `schemas/`, `prompts/v1/` |
| `backend/api/` | API FastAPI (`api/main.py`) — ~20 endpoints; manter `docs/api-contrato.md` sincronizado |
| `backend/config/` | Seeds e feeds (`feeds.yaml`, `candidatos_seed.json`, `corpus_teologico_seed.json`, `countries_focus.json`, `acled_seed.json`, …) |
| `backend/supabase/migrations/` | DDL do Postgres (fonte única de schema) |
| `backend/tests/` | Testes pytest |
| `backend/docs/` | Documentação técnica do motor |
| `front-end/src/app/` | App Router — páginas (`(painel)`, `historico`, `rankings`, `globo`, `grafo`, `profecias`, `simulador`, `revisao`, `joshua`, …) e route handlers `api/db/`, `api/admin/`, `api/auth/`, `api/joshua/` |
| `front-end/src/components/` | Componentes React (dashboard, charts, globo, grafo, ui) |
| `front-end/src/lib/` | `api.ts`, `cache.ts`, `types.ts`, `db/`, `seo/`, `auth/`, `mock*.ts` |
| `front-end/prisma/` | Schema Prisma (espelha Supabase — não crie DDL aqui) + seed |
| `front-end/docs/` | Documentação do dashboard |
| `.github/workflows/` | 10 workflows agendados (batch diário, sínteses, drift, híbridos) |
| `.husky/` + `package.json` raiz | Hooks: `pre-commit` → lint, `pre-push` → test (ambas as stacks) |

## Índice de documentação

| Documento | Descrição |
|-----------|-----------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Regras globais de contribuição |
| [CLOUD.md](CLOUD.md) | Setup de agentes em nuvem + infra (Supabase, Actions, deploy) |
| [backend/docs/REQUISITOS_CONTRIBUICAO.md](backend/docs/REQUISITOS_CONTRIBUICAO.md) | Regras específicas do backend |
| [front-end/docs/REQUISITOS_CONTRIBUICAO.md](front-end/docs/REQUISITOS_CONTRIBUICAO.md) | Regras específicas do front-end |
| [backend/docs/arquitetura.md](backend/docs/arquitetura.md) | As 9 camadas do motor e fluxo batch |
| [backend/docs/camadas.md](backend/docs/camadas.md) | Referência detalhada camada → módulo → config → saída |
| [backend/docs/cli.md](backend/docs/cli.md) | Comandos `python -m motor.cli` |
| [backend/docs/api-contrato.md](backend/docs/api-contrato.md) | Contrato REST consumido pelo dashboard |
| [backend/docs/fontes-dados.md](backend/docs/fontes-dados.md) | Fontes de ingestão (RSS, GDELT, ACLED, API.Bible, Joshua) |
| [backend/docs/variaveis-ambiente.md](backend/docs/variaveis-ambiente.md) | Referência de env vars do motor |
| [backend/docs/schemas-json.md](backend/docs/schemas-json.md) | Contratos JSON Schema e versionamento |
| [backend/docs/setup-supabase.md](backend/docs/setup-supabase.md) | Setup do Supabase e migrations |
| [backend/docs/model-providers.md](backend/docs/model-providers.md) | Provedores LLM (Groq, OpenRouter, Ollama) |
| [backend/docs/github-actions.md](backend/docs/github-actions.md) | Workflows, crons e secrets |
| [backend/README.md](backend/README.md) | Visão geral e CLI do motor |
| [front-end/README.md](front-end/README.md) | Visão geral do dashboard |
| [front-end/docs/arquitetura.md](front-end/docs/arquitetura.md) | App Router, rotas BFF, cache e componentes |
| [front-end/prisma/README.md](front-end/prisma/README.md) | Schema Prisma e seed |

## Comandos essenciais

### Backend (`backend/`)

```bash
pip install -e ".[ml,dev]"              # instala motor + deps ML + dev
cp .env.example .env                    # configure LLM_DRY_RUN=true sem chaves
python -m motor.cli validate-schemas    # valida schemas JSON
python -m motor.cli run-daily --dry-run # simula batch sem escrever
pytest -v                               # testes
python -m ruff check motor api tests    # lint
python -m ruff format motor api tests   # format
uvicorn api.main:app --reload           # API em :8000
```

### Front-end (`front-end/`)

```bash
npm install
npm run db:generate        # OBRIGATÓRIO — .npmrc usa ignore-scripts=true
cp .env.example .env.local # NEXT_PUBLIC_USE_MOCK=true roda sem Supabase
npm run dev                # :3000
npm run lint               # ESLint
npm run test               # Vitest
npm run build              # inclui prisma generate
npm run storybook          # Storybook em :6006
```

### Raiz

```bash
npm run lint   # ESLint (front) + Ruff (back) — usado pelo pre-commit
npm run test   # Vitest + pytest — usado pelo pre-push
```

## Regras de atuação para agentes

1. **Leia primeiro**: CONTRIBUTING.md + o REQUISITOS_CONTRIBUICAO.md da stack
   que você vai tocar.
2. **Branches**: sempre a partir de `master`, padrão `tipo/descricao-resumida`.
3. **Commits**: inglês, imperativo, prefixo `feat:`/`bug:`/`doc:`/`chore:`,
   **assinados com SSH**.
4. **PRs**: máximo 20 arquivos; descrever o quê e o porquê; ≥1 revisor.
5. **Secrets**: nunca commitar `.env`, tokens ou chaves; nunca expor
   `SUPABASE_SERVICE_ROLE_KEY`/`GROQ_API_KEY`/`ADMIN_API_KEY` no front-end.
6. **Diretivas de ignore** (`eslint-disable`, `@ts-ignore`, `# noqa`,
   `# type: ignore`): somente em arquivos de teste.
7. **Testes**: toda mudança de comportamento toca testes; sem dependência de
   rede/GPU/LLM real.
8. **Exige issue prévia** (não altere sem discussão):
   - contrato JSON do dashboard (`resultado_escatologico.schema.json`),
     pesos MCDA, thresholds de fase, provedor LLM primário
   - `src/lib/types.ts` (quebra de contrato), `prisma/schema.prisma`,
     headers de `middleware.ts`, remoção do fallback mock
9. **Docs em pt-BR** — toda a documentação é em português; ao alterar
   endpoints de `api/main.py`, sincronize `backend/docs/api-contrato.md`; ao
   alterar CLI/env vars, sincronize `cli.md`/`variaveis-ambiente.md`.
10. **Verificação antes de finalizar**: `npm run lint` e `npm run test` na raiz.

## Viabilidade — estado atual do projeto

### O que funciona sem credenciais

- Motor completo em modo dry-run: `LLM_DRY_RUN=true` +
  `python -m motor.cli run-daily --dry-run`
- Dashboard completo com mock: `NEXT_PUBLIC_USE_MOCK=true` + `npm run dev`
- Lint, format e testes de ambas as stacks sem nenhuma chave

### Credenciais necessárias por componente

| Componente | Secrets |
|------------|---------|
| Motor (batch real) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` (+ `OPENROUTER_API_KEY` fallback) |
| API admin | `ADMIN_API_KEY` |
| Front-end modo `db` | `DATABASE_URL`, `DIRECT_URL` (Supabase) |
| Workflows agendados | os mesmos do motor, via GitHub Secrets |

### Gaps conhecidos (não bloqueiam dev local)

- **Sem CI de PR** — os 10 workflows são cron/`workflow_dispatch` (batch);
  lint/testes/build são garantidos só pelos hooks Husky locais.
- **`package-lock.json` não versionado** — está no `.gitignore`; `npm ci` não
  funciona e builds não são reproduzíveis.
- **`doc.txt`** (especificação original do projeto, ~56KB) existe localmente
  mas não está versionado — referencie o conteúdo nos docs sem linkar o arquivo.
- **`front-end/.env copy.local`** — arquivo solto não versionado; verificar se
  não contém segredos antes de qualquer commit.
