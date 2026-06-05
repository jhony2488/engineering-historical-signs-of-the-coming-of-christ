# Front-end — Dashboard Escatológico

Next.js 15 + TypeScript + Tailwind CSS + Recharts.

> Contribuição: [docs/REQUISITOS_CONTRIBUICAO.md](docs/REQUISITOS_CONTRIBUICAO.md)

## Funcionalidades

- **Painel principal** — fases I–IV, medidor de proximidade, energias, macro/micro
- **Falso líder** — alerta de incongruência discurso vs estrutura
- **Bestas** — scores mar e terra
- **Rankings Top-10** — PAP com tendência 24h
- **Histórico** — gráfico e tabela com janelas semanal/mensal/trimestral/anual
- **Cache localStorage** — expiração diária (cache-first)
- **Fallback demo** — dados mock quando API indisponível

## Setup

```bash
cd front-end
npm install
cp .env.example .env.local
# Configure DATABASE_URL (Supabase) — ver prisma/README.md
npm run db:seed   # opcional, após migration backend
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Testes

```bash
npm run test        # Vitest — 34 testes unitários
npm run test:watch  # modo watch
```

Cobertura: `lib/` (cache, api, phases, mock, seo, db), `middleware`, componentes (`Header`, `RankingTable`, `PhaseTransitionAlert`) e rotas SEO (`sitemap`, `robots`).

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (SEO/canonical) |
| `NEXT_PUBLIC_DATA_SOURCE` | `db` (Prisma) ou `fastapi` (motor Python) |
| `DATABASE_URL` | PostgreSQL Supabase (Prisma) |
| `DIRECT_URL` | Conexão direta Supabase (migrations) |
| `NEXT_PUBLIC_API_URL` | FastAPI quando `DATA_SOURCE=fastapi` |
| `NEXT_PUBLIC_USE_MOCK` | `true` força dados de demonstração |

O `next.config.ts` faz rewrite de `/api/backend/*` → FastAPI.

## Fontes de dados

**Modo `db` (padrão):** Next.js → Prisma → Supabase (`/api/db/*`)

**Modo `fastapi`:** Next.js → rewrite → motor Python (`/api/backend/*`)

1. Migration: `backend/supabase/migrations/...sql`
2. Batch: `python -m motor.cli run-daily --dry-run`
3. Seed front: `npm run db:seed`

## SEO e middleware

- `src/middleware.ts` — headers de segurança (CSP, HSTS, X-Frame-Options)
- `src/lib/seo/metadata.ts` — Open Graph, Twitter, JSON-LD
- Layouts por rota: `(painel)/`, `historico/`, `rankings/`
- Assets: `public/favicon.svg`, `og-default.svg`, `robots.txt`

## Deploy (Netlify)

- Build: `npm run build`
- Publish: `.next` (ou use adapter Netlify para Next.js)
- Env: `NEXT_PUBLIC_API_URL` apontando para API em produção

## Estrutura

```
public/            # favicon, og-image, robots, manifest
prisma/            # schema, migrations, seed
src/
├── app/           # páginas, layouts SEO, api/db
├── middleware.ts
├── components/
└── lib/           # api, prisma, db, seo, cache
```
