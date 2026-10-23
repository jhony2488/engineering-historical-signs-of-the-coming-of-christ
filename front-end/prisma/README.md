# Prisma — Front-end

Leitura direta do **Supabase PostgreSQL** (mesmo banco do `backend/`).

## Pré-requisito

Execute primeiro a migration do backend:

```
backend/migrations/20260604000001_init_schema.sql
```

## Setup

```bash
cp .env.example .env.local
# Preencha DATABASE_URL e DIRECT_URL (Supabase → Settings → Database)

npm install
npx prisma generate
npx prisma migrate resolve --applied 20260605000001_baseline
npm run db:seed
```

## Scripts

| Comando | Ação |
|---------|------|
| `npm run db:generate` | Gera Prisma Client |
| `npm run db:migrate` | Aplica migrations Prisma |
| `npm run db:seed` | Seed candidatos + resultado demo |
| `npm run db:studio` | UI visual do banco |

## API Routes (Next.js)

| Rota | Tabela |
|------|--------|
| `GET /api/db/resultado/atual` | `resultados_escatologicos` |
| `GET /api/db/resultado/historico` | `resultados_escatologicos` |
| `GET /api/db/ranking/[personagem]` | `ranking_probabilistico` |

O dashboard acessa o banco por meio dos route handlers do Next.js.
