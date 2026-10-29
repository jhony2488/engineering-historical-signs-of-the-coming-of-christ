# Front-end — Dashboard Escatológico

Next.js 15 + TypeScript + Tailwind CSS + Recharts.

> Contribuição: [docs/REQUISITOS_CONTRIBUICAO.md](docs/REQUISITOS_CONTRIBUICAO.md) ·
> Arquitetura detalhada: [docs/arquitetura.md](docs/arquitetura.md) ·
> Índice: [docs/README.md](docs/README.md)

## Funcionalidades

- **Painel principal** — fases I–IV, medidor de proximidade, energias, macro/micro
- **Falso líder** — alerta de incongruência discurso vs estrutura
- **Bestas** — scores mar e terra
- **Rankings Top-10** — PAP com tendência 24h
- **Histórico** — gráfico e tabela com janelas semanal/mensal/trimestral/anual
- **Cache localStorage** — expiração diária (cache-first)
- **Fallback demo** — dados mock quando API indisponível
- **IA on-device** — resumos/explicações gerados no navegador (WebLLM +
  Transformers.js, tiers por capacidade; invisível sem suporte) — ver
  [docs/arquitetura.md](docs/arquitetura.md#ia-on-device-pwa)
- **PWA** — instalável, shell offline e persistência dos modelos baixados

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
npm run test        # Vitest — ~190 testes unitários
npm run test:watch  # modo watch
```

Cobertura: `lib/` (cache, api, phases, mock, seo, db, local-ai), `middleware`, componentes (`Header`, `RankingTable`, `PhaseTransitionAlert`, `local-ai/*`) e rotas SEO (`sitemap`, `robots`).

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (SEO/canonical) |
| `DATABASE_URL` | PostgreSQL Supabase (Prisma) |
| `DIRECT_URL` | Conexão direta Supabase (migrations) |
| `NEXT_PUBLIC_USE_MOCK` | `true` força dados de demonstração |
| `NEXT_PUBLIC_LOCAL_AI` | `auto` (default) ou `off` — IA on-device |

## Fontes de dados

**Banco:** Browser → rotas `/api/db/*` do Next.js → Prisma → Supabase

1. Migration: `backend/migrations/...sql`
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
- Env: `DATABASE_URL` e `DIRECT_URL` apontando para o Supabase

## Deploy Multiplataforma

### Android (Capacitor)

- APK para download direto (sem Play Store)
- Build: `npm run android:build`
- CI: workflow em `.github/workflows/build-android.yml` (tags `v*`)
- Requisitos: Java JDK 17, Android SDK
- Capacitor config: `capacitor.config.ts`
- Plataforma `android/` é inicializada apenas no CI/CD (não versionada)

> **Nota:** Não há build automático de iOS via Capacitor. iOS é suportado apenas via PWA (instalação manual no navegador Safari).

### Desktop (Tauri)

- Windows, Linux, macOS via GitHub Releases
- Build: `npm run tauri:build`
- CI: workflow em `.github/workflows/build-desktop.yml` (tags `v*`)
- Requisitos: Rust toolchain
- **Nota**: Desktop usa SSG + API FastAPI em produção
- Plataforma `src-tauri/` é inicializada apenas no CI/CD (não versionada)
- Script de inicialização: `npm run tauri:init`

### Processo de Release

1. Atualize a versão em `package.json`
2. Commit com mensagem: `chore: bump version to X.Y.Z`
3. Crie e push a tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. Os workflows de build serão executados automaticamente
5. Após a conclusão, verifique o GitHub Release com os artefatos

### PWA Features

- **Service Worker**: Caching strategies, offline support, background sync
- **Push Notifications**: Subscribe/unsubscribe via `/api/push/*` endpoints
- **Install Prompts**: Detecta beforeinstallprompt, suporta iOS com instruções manuais
- **Offline Page**: `offline.html` com auto-retry a cada 30 segundos
- **Globe Fallbacks**: WebGPU → WebGL → WebAssembly → Canvas 2D

## Estrutura

```
public/            # favicon, og-image, robots, manifest, sw.js, offline.html,
                   # icons/ (PWA), models/ (gitignored — `npm run ai:download-models`)
prisma/            # schema, migrations, seed
scripts/           # download-local-models.ts, gen-pwa-icons.mjs
src/
├── app/           # páginas, layouts SEO, api/db
├── middleware.ts
├── components/    # inclui local-ai/ e pwa/
└── lib/           # api, prisma, db, seo, cache, local-ai/
```
