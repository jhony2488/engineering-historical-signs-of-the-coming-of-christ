# CLOUD.md — Agentes em nuvem e infraestrutura

Guia para agentes de IA executando em ambientes cloud (Devin, Copilot coding
agent, CI runners, etc.) e mapa da infraestrutura em nuvem do projeto.

---

## Parte 1 — Setup para agentes em nuvem

### Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Python | 3.11+ |
| Node.js | 20+ (LTS) |
| npm | 10+ |
| Docker | opcional (Redis local) |
| Git | 2.x com assinatura SSH configurada |

### Bootstrap completo

```bash
# 1. Hooks (raiz) — instala Husky via script "prepare"
npm install

# 2. Backend
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
# source .venv/bin/activate                      # Linux/macOS
pip install -e ".[ml,dev]"
cp .env.example .env

# 3. Front-end
cd ../front-end
npm install
npm run db:generate        # OBRIGATÓRIO — ver pegadinhas abaixo
cp .env.example .env.local
```

### Pegadinhas do ambiente

- **`ignore-scripts=true`** em `front-end/.npmrc`: nenhum lifecycle script
  roda no `npm install` (incluindo `postinstall` do Prisma). Sempre execute
  `npm run db:generate` depois de instalar dependências do front-end.
- **`min-release-age=7`** em `front-end/.npmrc`: pacotes publicados há menos
  de 7 dias não resolvem — erros `ETARGET` em deps novas são esperados.
- **`allow-git=none`**: dependências via URL git são bloqueadas.
- **Hooks Husky**: se `git commit` não disparar o lint, rode `npx husky` na raiz.
- **Lockfile ausente**: `package-lock.json` não é versionado — use
  `npm install`, não `npm ci`.

### Variáveis de ambiente

**Mínimas para trabalhar offline (sem secrets):**

```env
# backend/.env
LLM_DRY_RUN=true

# front-end/.env.local
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DATA_SOURCE=db
```

**Completas** — ver [backend/.env.example](backend/.env.example) e
[front-end/.env.example](front-end/.env.example). Nunca copie valores reais
para logs, diffs ou respostas.

### Comandos de verificação

```bash
# Raiz — cobre as duas stacks (o que os hooks rodam)
npm run lint
npm run test

# Backend
cd backend && pytest -v && python -m ruff check motor api tests
python -m motor.cli validate-schemas
python -m motor.cli run-daily --dry-run

# Front-end
cd front-end && npm run lint && npm run test && npm run build
```

### Escopo seguro de atuação

- **Livre**: `motor/pipeline/`, `motor/domain/`, `motor/math/`, `motor/schemas/`
  (com versionamento), `tests/`, `docs/`, `front-end/src/` (componentes, lib,
  rotas `api/db/`), `public/`.
- **Exige discussão prévia**: schema JSON publicado, pesos MCDA, thresholds de
  fase, migrations PostgreSQL, provedor LLM primário, `src/lib/types.ts`,
  `middleware.ts`, remoção do fallback mock.
- **Proibido**: commitar secrets/`.env`, gravar no banco pelo front-end,
  diretivas de ignore fora de testes, mais de 20 arquivos por PR.

---

## Parte 2 — Infraestrutura em nuvem

### PostgreSQL + pgvector

- Banco PostgreSQL único para persistência, acessado diretamente pelo backend — sem S3/cold files.
- DDL fonte única: [`backend/migrations/`](backend/migrations/) —
  migration inicial `20260604000001_init_schema.sql`.
- Schema Prisma do front-end **espelha** as tabelas — nunca criar DDL via
  `prisma migrate dev` sem alinhar com o backend.
- Setup do zero: [backend/docs/setup-postgres.md](backend/docs/setup-postgres.md).
- Backend usa somente `DATABASE_URL`; o front-end usa `DATABASE_URL` e
  `DIRECT_URL` no servidor Next.js.

### GitHub Actions — batch agendado

10 workflows em [`.github/workflows/`](.github/workflows/), todos cron ou
`workflow_dispatch` (detalhes em
[backend/docs/github-actions.md](backend/docs/github-actions.md)):

| Workflow | Cron (UTC) | Função |
|----------|-----------|--------|
| `daily-batch.yml` | `0 7 * * *` | Motor Nível 1 — batch diário |
| `weekly-synthesis.yml` | Seg `30 8 * * 1` | Nível 2 — síntese semanal |
| `monthly-synthesis.yml` | Dia 1 `0 9 1 * *` | Nível 2 — síntese mensal |
| `monthly-data-drift.yml` | Dia 1 `0 6 1 * *` | Detecção de data drift |
| `quarterly-synthesis.yml` | Dia 1 trim. `0 10 …` | Nível 2 — trimestral |
| `quarterly-hybrid.yml` | Dia 1 trim. `45 10 …` | Nível 3 — híbrido trimestral |
| `semiannual-synthesis.yml` | `15 9 1 1,7 *` | Nível 2 — semestral |
| `semiannual-hybrid.yml` | Jul `0 11 1 7 *`; Jan `30 12 1 1 *` | Nível 3 — híbrido semestral |
| `annual-hybrid.yml` | Jan 1 `0 11 1 1 *` | Nível 3 — síntese + híbrido anual |
| `motor-nivel-3-dispatch.yml` | manual | Disparo manual com janela |

**Secrets de repositório**: `DATABASE_URL`,
`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `ADMIN_API_KEY`.
**Variáveis opcionais (repo `vars`)**: `LLM_DRY_RUN`, `LOCAL_LLM_ENABLED`,
`PROMPTS_LANG`, `TRANSLATE_NARRATIVES`, `CLASSIFIER_HINTS_ENABLED` — defaults
no workflow ligam o tier SLM local + prompts EN.
**Cache**: `~/.cache/huggingface` (BGE-M3, reranker, NLLB) e
`backend/models_cache/` (GGUFs do SLM, chave = `local_llm.py`) no workflow
diário; os GGUFs são baixados por `scripts/download_models.py --all`.

> O CI de PR/push roda os testes de front-end e back-end e valida assinatura
> SSH dos commits. Lint e build continuam nos hooks locais.

### Provedores LLM

Ordem do router: **Local GGUF → Ollama → Groq → OpenRouter → dry-run**.

| Provedor | Papel | Variável |
|----------|-------|----------|
| Local GGUF (llama.cpp) | SLM in-process, cascata 7B→3B→1.5B por alias | `LOCAL_LLM_ENABLED`, `LOCAL_MODELS_DIR` |
| Ollama | Opcional/local | `OLLAMA_ENABLED`, `OLLAMA_BASE_URL` |
| Groq | Primário cloud | `GROQ_API_KEY` |
| OpenRouter | Fallback | `OPENROUTER_API_KEY` |

Detalhes: [backend/docs/model-providers.md](backend/docs/model-providers.md).

### Redis (opcional)

`docker compose up -d` em `backend/` — fila de jobs. Não obrigatório para
desenvolvimento.

### Deploy do front-end (Netlify)

- Build: `npm run build` (inclui `prisma generate`) · publish: `.next`.
- Variáveis obrigatórias: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`,
  `DIRECT_URL`, `NEXT_PUBLIC_DATA_SOURCE=db`.
- `next.config.ts` faz rewrite de `/api/backend/*` → FastAPI quando
  `DATA_SOURCE=fastapi`.

### Serviços externos opcionais

| Serviço | Uso | Variáveis |
|---------|-----|-----------|
| Resend / SMTP | Digest diário por e-mail | `RESEND_API_KEY`, `SMTP_*`, `EMAIL_DRY_RUN` |
| ACLED | Fonte de conflitos | `ACLED_API_KEY`, `ACLED_EMAIL` |
| API.Bible | Corpus teológico | `API_BIBLE_KEY`, `API_BIBLE_ID` |
| Joshua Project | Dados de povos (sync via BFF) | `JOSHUA_API_KEY`, `JOSHUA_SYNC_TOKEN` |
| GA4 | Analytics + métricas em `/insights` | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA_*` |
| IndexNow/Google | Indexação SEO | `INDEXNOW_*`, `GOOGLE_INDEXING_*` |
