# Requisitos de Contribuição — Front-end

Obrigado por contribuir com o dashboard escatológico. Este documento define o que esperamos de todo colaborador antes de abrir ou revisar um Pull Request no `front-end/`.

## Princípios do projeto

- **Análise, não adivinhação de datas** — a interface apresenta convergência de sinais e convicção estatística, nunca calendários proféticos.
- **Leitura, não escrita** — o front-end **não** altera resultados do motor; apenas consome dados já processados pelo batch (`backend/`).
- **Resiliência** — toda tela deve funcionar com mock (`NEXT_PUBLIC_USE_MOCK=true`) ou fallback automático quando API/DB falhar.
- **Performance percebida** — cache local diário (`localStorage`) e dados pré-processados (Nível 2/3) têm prioridade sobre recomputação.
- **Acessibilidade teológica** — textos claros, sem sensacionalismo; distinção visual entre dado observado e interpretação da IA.

## Ambiente de desenvolvimento

### Requisitos mínimos

| Ferramenta | Versão |
|------------|--------|
| Node.js | 20+ (LTS recomendado) |
| npm | 10+ |
| Git | 2.x |

### Setup

```bash
cd front-end
npm install
cp .env.example .env.local
```

Configure pelo menos:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DATA_SOURCE=db
NEXT_PUBLIC_USE_MOCK=true          # desenvolvimento sem Supabase
```

Para testar com banco real:

```env
DATABASE_URL=postgresql://...pooler...:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...:5432/postgres
NEXT_PUBLIC_USE_MOCK=false
```

Pré-requisito: migration do backend aplicada (`backend/supabase/migrations/`). Ver [prisma/README.md](../prisma/README.md).

```bash
npx prisma generate
npm run db:seed    # opcional — 90 dias + Top-10 + snapshots
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Comandos obrigatórios antes do PR

```bash
npm run lint
npm run test
npm run build
```

Todos devem passar sem erros.

## Escopo de mudanças

### O que pode ser alterado livremente

- `src/components/` — widgets do painel, tabelas, gráficos
- `src/app/` — páginas, layouts SEO, route handlers em `api/db/`
- `src/lib/` — cache, API client, tipos, helpers SEO
- `src/middleware.ts` — headers de segurança (com cuidado)
- `public/` — favicon, OG image, manifest
- `prisma/seed.ts` — dados de demonstração (não alterar schema sem issue)
- `src/**/__tests__/` — testes Vitest

### O que exige discussão prévia (issue)

- Mudança em `src/lib/types.ts` que quebre contrato com `json_analise_ia` do backend
- Novas tabelas ou colunas no `prisma/schema.prisma`
- Alteração de `NEXT_PUBLIC_*` que exija novas variáveis em produção
- Remoção de fallback mock ou mudança de comportamento do cache
- Novas dependências pesadas (D3, Cytoscape, mapas, etc.) — `@mlc-ai/web-llm`
  e `@huggingface/transformers` já foram aprovadas p/ IA on-device
- Autenticação, sessão ou armazenamento de tokens no cliente

### O que o front-end **não** deve fazer

- Executar pipeline de IA ou chamar Groq/OpenRouter diretamente — a única
  inferência permitida é **on-device** (`src/lib/local-ai/`), sem rede nem
  credenciais, nunca identificada na UI como "local"
- Gravar em `resultados_escatologicos` (append-only é responsabilidade do motor)
- Expor `SUPABASE_SERVICE_ROLE_KEY` ou credenciais de escrita no cliente
- Armazenar tokens de autenticação em `localStorage`

## Arquitetura e convenções

### Estrutura de pastas

```
front-end/
├── public/                 # assets estáticos
├── prisma/                 # schema, seed (leitura Supabase)
├── docs/                   # documentação
└── src/
    ├── app/                # App Router (páginas + api/db)
    ├── components/
    │   ├── dashboard/      # widgets do painel
    │   ├── charts/         # Recharts
    │   └── ui/             # Header, layout compartilhado
    ├── lib/
    │   ├── api.ts          # fetch com cache + fallback
    │   ├── cache.ts        # localStorage
    │   ├── types.ts        # contrato TypeScript
    │   ├── db/             # queries Prisma
    │   └── seo/            # metadata helpers
    └── middleware.ts
```

### Fontes de dados

| Modo | Variável | Fluxo |
|------|----------|-------|
| `db` (padrão) | `NEXT_PUBLIC_DATA_SOURCE=db` | Browser → `/api/db/*` → Prisma → Supabase |
| `fastapi` | `NEXT_PUBLIC_DATA_SOURCE=fastapi` | Browser → `/api/backend/*` → rewrite → motor Python |

Novas rotas de leitura devem seguir o padrão `src/app/api/db/.../route.ts` com `Cache-Control: stale-while-revalidate` quando aplicável.

### Componentes React

- **Server Components** por padrão; `"use client"` apenas quando necessário (estado, efeitos, Recharts).
- Props tipadas com interfaces em `types.ts` ou co-localizadas no arquivo.
- Estilo via **Tailwind** — evite CSS inline ou novos arquivos CSS sem necessidade.
- Componentes de apresentação não devem chamar Prisma diretamente; use `lib/api.ts` ou route handlers.

### Nomenclatura

| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Arquivos componente | `PascalCase.tsx` | `PhaseTimeline.tsx` |
| Hooks / libs | `camelCase.ts` | `metadata.ts` |
| Rotas App Router | `kebab-case` ou grupo | `historico/page.tsx` |
| Tipos / interfaces | `PascalCase` | `ResultadoEscatologico` |
| Fases | `FASE_I` … `FASE_IV` | alinhado ao backend |
| Janelas temporais | `weekly`, `monthly`, … | `JanelaTemporal` em `types.ts` |
| Testes | `*.test.ts(x)` | `cache.test.ts` |

### Imports

Use o alias `@/` configurado em `tsconfig.json`:

```typescript
import { fetchResultadoAtual } from "@/lib/api";
import { Header } from "@/components/ui/Header";
```

Ordem sugerida: React/Next → bibliotecas externas → `@/lib` → `@/components` → tipos locais.

## Padrões de código

### TypeScript

- `strict: true` — sem `any` em código novo (exceção documentada em mocks de teste).
- Tipos de domínio centralizados em `src/lib/types.ts`.
- Ao consumir `jsonAnaliseIa` (JSONB), use optional chaining — campos podem faltar em registros antigos.

### Cache (`lib/cache.ts`)

- Expiração por **dia civil** (não por TTL em horas).
- Chaves prefixadas com `sinais_` — não reutilizar para outros fins.
- Nunca cachear credenciais ou dados sensíveis.

### SEO

- Metadata por rota em `layout.tsx` via `buildPageMetadata()` de `lib/seo/metadata.ts`.
- Toda página pública deve ter `title`, `description`, `canonical` e Open Graph.
- JSON-LD em layouts quando fizer sentido (WebApplication, Dataset, ItemList).

### Segurança

- Headers em `src/middleware.ts` — alterações exigem justificativa no PR.
- Variáveis `NEXT_PUBLIC_*` são **públicas** — nunca coloque secrets nelas.
- `DATABASE_URL` só em server-side (route handlers, Prisma); nunca importar em Client Components.
- CSP atual permite `unsafe-inline` por compatibilidade Next.js — não afrouxar sem revisão.

### Acessibilidade (mínimo)

- Botões e links com texto discernível (evitar ícones soltos sem `aria-label`).
- Tabelas com `<th>` e hierarquia de headings coerente (`h1` → `h2`).
- Contraste adequado nas cores do tema escuro (`ink-*`, `gold-*`).

## Testes

Framework: **Vitest** + **Testing Library**.

| Tipo | Onde | Quando escrever |
|------|------|-----------------|
| Unitário | `src/lib/__tests__/` | cache, api, phases, seo, db mappers |
| Componente | `src/components/__tests__/` | renderização, props, estados vazios |
| Middleware | `src/__tests__/` | headers de segurança |
| Rotas SEO | `src/app/__tests__/` | sitemap, robots |

Exemplo mínimo:

```typescript
import { describe, expect, it } from "vitest";
import { formatPercent } from "@/lib/phases";

describe("formatPercent", () => {
  it("formata decimal como porcentagem", () => {
    expect(formatPercent(0.583)).toBe("58.3%");
  });
});
```

Para componentes com `next/link`, o mock já está em `vitest.setup.ts`.

**Regra:** toda correção de bug em `lib/` ou componente reutilizado deve incluir ou atualizar teste.

## Commits

Mensagens em português ou inglês, imperativo, focando o **porquê**:

```
feat(historico): exibe snapshot trimestral do Nível 2
fix(cache): invalida histórico no primeiro acesso do dia
test(api): cobre fallback mock quando fetch falha
docs: atualiza requisitos de contribuição front-end
```

Prefixos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`.

## Pull Requests

### Checklist do autor

- [ ] Branch atualizada a partir da `main` (ou `master`)
- [ ] Escopo focado — um PR por feature ou correção
- [ ] `npm run lint`, `npm run test` e `npm run build` passando
- [ ] Testes adicionados ou atualizados para comportamento novo
- [ ] `.env.example` atualizado se novas variáveis `NEXT_PUBLIC_*` ou `DATABASE_URL`
- [ ] Screenshots ou gravação curta para mudanças visuais
- [ ] Nenhum secret, token ou `.env.local` no diff
- [ ] Tipos em `types.ts` alinhados ao schema JSON do backend (se aplicável)

### Título e descrição

**Título:** resumo em uma linha (`feat: painel exibe tendência 24h no ranking`)

**Descrição mínima:**

```markdown
## O que mudou
- ...

## Por quê
- ...

## Como testar
1. npm run dev
2. Acessar /historico com NEXT_PUBLIC_USE_MOCK=true
3. npm run test

## Screenshots (se UI)
```

### Revisão

- Pelo menos **1 aprovação** antes do merge
- Revisor verifica: tipos, fallback mock, SEO, ausência de secrets, build
- Mudanças em `middleware.ts` ou `types.ts` exigem atenção redobrada

## Contrato com o backend

O dashboard consome principalmente `ResultadoEscatologico` (ver `src/lib/types.ts`).

Campos críticos que componentes assumem:

- `fase_atual`, `indice_global`, `confianca`, `probabilidade_fase`
- `correlacao` — HMM, falso líder, bestas, `transicao_fase`
- `ranking_mar`, `ranking_terra` — Top-10 com `probabilidade_atual`, `tendencia_24h`
- `eventos_analisados`, `interpretacao`
- `schema_version`, `status`

Ao adicionar dependência de campo novo:

1. Adicione tipo opcional em `types.ts`
2. Use fallback na UI (`??`, `?.`, valores padrão)
3. Coordene com issue no backend se o campo for obrigatório no schema JSON

Documentação do motor: [backend/docs/api-contrato.md](../../backend/docs/api-contrato.md) e [backend/docs/REQUISITOS_CONTRIBUICAO.md](../../backend/docs/REQUISITOS_CONTRIBUICAO.md).

## Prisma e seed

- Schema Prisma espelha tabelas do Supabase — **migrations DDL ficam no backend**.
- Baseline Prisma: `prisma/migrations/20260605000001_baseline/`
- Seed detalhado: 90 dias, 20 candidatos, rankings, snapshots — `npm run db:seed`
- Não rode `prisma migrate dev` que crie DDL conflitante sem alinhar com `backend/supabase/migrations/`

## Deploy

- Build de produção: `npm run build` (inclui `prisma generate`)
- Variáveis obrigatórias em Netlify/Vercel: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_DATA_SOURCE=db` em produção quando Supabase estiver disponível

## Reportar bugs

Inclua:

1. URL e rota afetada (`/`, `/historico`, `/rankings`)
2. Valor de `NEXT_PUBLIC_DATA_SOURCE` e `NEXT_PUBLIC_USE_MOCK`
3. Versão do Node (`node --version`)
4. Screenshot ou mensagem de erro do console (sem secrets)
5. Se o problema ocorre com mock, DB ou FastAPI

## Código de conduta

- Respeito mútuo em issues e reviews
- Críticas focadas no código, não na pessoa
- Debates doutrinários não pertencem a PRs técnicos — use issues com tag `discussion` quando necessário

## Referências

- [README do front-end](../README.md)
- [Prisma / Supabase](../prisma/README.md)
- [Requisitos backend](../../backend/docs/REQUISITOS_CONTRIBUICAO.md)
- [Arquitetura do motor](../../backend/docs/arquitetura.md)

## Dúvidas

Abra uma issue com a tag `question` ou `front-end`.
