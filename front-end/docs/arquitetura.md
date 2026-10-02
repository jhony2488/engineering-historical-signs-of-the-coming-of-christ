# Arquitetura do Front-end

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind. O dashboard é
**somente leitura**: nunca executa pipeline de IA, nunca chama LLM de API e
nunca grava em `resultados_escatologicos`. (Exceção: inferência on-device —
ver [IA on-device](#ia-on-device-pwa).)

## Fluxo de dados

```text
Browser → lib/api.ts (cache localStorage + fallback mock)
        ├── DATA_SOURCE=db     → /api/db/*      → route handlers → Prisma → Supabase
        └── DATA_SOURCE=fastapi → /api/backend/* → rewrite (next.config.ts) → FastAPI :8000
```

- `lib/api.ts` resolve a URL conforme `NEXT_PUBLIC_DATA_SOURCE`
  (`resolveUrl` + `PATHS`).
- `NEXT_PUBLIC_USE_MOCK=true` ou qualquer falha de fetch → mocks de
  `lib/mock*.ts` (a UI nunca quebra).
- Funções `*SWR` entregam cache stale imediatamente e revalidam em
  background (`revalidating: true` em `FetchMeta`).

### Cache local (`lib/cache.ts`)

- Expiração por **dia civil** (`isCacheExpired`), não por TTL.
- Chaves prefixadas `sinais_*` — ver `cacheKeys` e os helpers
  `snapshotCacheKeys`, `rankingCacheKeys`, `snapshotHistoricoCacheKeys`.
- Route handlers `/api/db/*` também usam `Cache-Control:
  stale-while-revalidate`.

## Páginas (App Router)

| Rota | Conteúdo |
|------|----------|
| `(painel)/` | Painel principal — fase, proximidade, energias, macro/micro, rankings, falso líder |
| `historico/` | Série temporal + sínteses por janela (Nível 2/3) |
| `rankings/` | Top-10 Besta do Mar / da Terra com tendência 24h |
| `globo/` | Globo 3D de ameaças por país (`ThreatGlobe`, Three.js) + drawer com Joshua/proveniência |
| `grafo/` | Grafo profético (`CytoscapeGraph`) |
| `profecias/` | Arquivo profético / baseline |
| `simulador/` | Cenários what-if |
| `revisao/` | Revisão humana de transições `pending_review` (admin) |
| `joshua/` | Análise missiológica (povos não alcançados) |
| `insights/` | Analytics GA4 |
| `newsletter/`, `inscricao/` | Inscrição/cancelamento do digest diário |
| `login/` | Autenticação admin (sessão via `lib/auth/`) |

## Route handlers

### `/api/db/*` — modo `db` (Prisma → Supabase)

| Rota | Tabela / dado |
|------|----------------|
| `resultado/atual`, `resultado/historico` | `resultados_escatologicos` |
| `ranking/[personagem]` | `ranking_probabilistico` |
| `snapshot/[janela]`, `snapshot/[janela]/historico` | `snapshots_periodo` |
| `baseline/historico`, `baseline/arquivo`, `baseline/atualizacoes` | baseline + `arquivo_profetico` |
| `ameacas`, `ameacas/[code]` | `ameacas_pais` (+ ABM/adversarial) |
| `cenarios`, `cenarios/what-if` | cenários do grafo + simulação |
| `grafo` | `grafo_nos`/`grafo_arestas` |
| `provenance/verify/[date]` | `provenance_log` + verificação |
| `relatorio/pdf` | PDF do último relatório |
| `newsletter/subscribe`, `newsletter/unsubscribe` | `newsletter_subscribers` |

Queries ficam em `src/lib/db/` (`resultados.ts`, `snapshots.ts`,
`baseline.ts`, `ameacas.ts`, `grafo.ts`, `joshua.ts`, `newsletter.ts`).

### `/api/joshua/*` — BFF Joshua Project

| Rota | Descrição |
|------|-----------|
| `GET /api/joshua/sync` | Sync com Joshua Project — protegido por `JOSHUA_SYNC_TOKEN` |
| `GET /api/joshua/data` | Dados sincronizados (`joshua_project_data`) |

### `/api/auth/*` e `/api/admin/*`

- `auth/login`, `auth/logout` — sessão admin (`lib/auth/session.ts`,
  rate limit em `login-rate-limit.ts`).
- `admin/revisao/{pending,approve,reject,audit}` — workflow de revisão
  humana das transições de fase.
- `admin/newsletter/{send,subscribers}`, `admin/analytics` —
  administração.

## Camadas de `src/lib/`

| Arquivo/pasta | Papel |
|---------------|-------|
| `api.ts` | Fetchers com cache-first, SWR e fallback mock |
| `cache.ts` | localStorage com expiração diária (`sinais_*`) |
| `types.ts` | **Contrato TypeScript** com `json_analise_ia` — mudanças exigem issue |
| `phases.ts`, `windows.ts` | Domínio: fases I–IV, janelas temporais |
| `mock*.ts` | Fallbacks de demonstração (nunca remover sem issue) |
| `db/` | Queries Prisma por domínio |
| `seo/metadata.ts` | `buildPageMetadata`, OG, JSON-LD |
| `auth/` | Sessão, headers de segurança, rate limit de login |
| `email/` | Envio de digest (Resend/SMTP) |
| `analytics/` | GA4 (`events.ts`, `ga-data.ts`) |
| `validation/schemas.ts` | Schemas Zod para inputs |
| `api-guard.ts`, `rate-limit.ts`, `sanitize.ts` | Guards server-side |

## Componentes (`src/components/`)

| Pasta | Conteúdo |
|-------|----------|
| `dashboard/` | `PhaseTimeline`, `ProximityMeter`, `EnergyPanel`, `MacroMicroPanel`, `FalseLeaderAlert`, `BeastScores`, `RankingTable`, `EventsList`, `InterpretationPanel`, `PhaseTransitionAlert` |
| `charts/` | `ConvictionChart` (Recharts) |
| `historico/` | `SynthesisPanel` |
| `baseline/` | `PropheticBaselinePanel` |
| `globo/` | `ThreatGlobe` (Three.js) |
| `grafo/` | `CytoscapeGraph` |
| `ui/` | `Header`, `NavLinks`, `PageShell`, `VirtualList`, `ExportPdfButton`, `ReportHtmlButton`, etc. |
| `newsletter/` | `EmailSignupForm` |
| `spline/` | Cenas 3D lazy (`SplineScene`, error boundary, fallback) |
| `analytics/` | `GoogleAnalytics`, `InsightsDashboard` |
| `audio/` | `BackgroundAudio` |

Stories (`.stories.tsx`) alimentam o Storybook (`npm run storybook`,
:6006). Testes em `__tests__/` (Vitest + Testing Library).

## IA on-device + PWA

O dashboard pode gerar resumos/explicações **no navegador do usuário**, sem
rede e sem custo — exceção documentada à regra "nunca chama LLMs" (não há
chamada de API: o modelo roda localmente no cliente).

```text
layout.tsx → components/local-ai/LocalAIHost
  └─ lib/local-ai/engine.ts        probe → tier → download → ready
        ├─ capabilities.ts         navigator.gpu/ml, deviceMemory, cores,
        │                          connection.saveData/effectiveType, storage.estimate
        ├─ models.ts               tiers a|b|c com cascata de candidatos
        ├─ local-ai.worker.ts      Web Worker: WebLLM (WebGPU) | Transformers.js (WebNN/WASM)
        └─ model-store.ts          IndexedDB esh-local-ai (manifest + outputs por hash)
```

- **Tiers** (`lib/local-ai/models.ts`): `a`/`b` usam `@mlc-ai/web-llm`
  (WebGPU, modelos MLC q4f16: Qwen2.5-3B → Llama-3.2-1B → Qwen2.5-0.5B);
  `c` usa `@huggingface/transformers` (WebNN→WASM, SmolLM2 q8).
- **Resolução de pesos**: cache do engine (IDB/Cache) → `public/models/`
  self-host → CDN Hugging Face. Falha total ou dispositivo sem suporte →
  nada é baixado e **nenhum componente de IA renderiza**.
- **Download**: automático em background; em `saveData`/rede ≤3g exige
  opt-in (`DownloadStatusChip`).
- **Persistência**: `navigator.storage.persist()` no init; outputs gerados
  cacheados no IDB por `sha256(input + versão de prompt)`.
- **Self-host**: `npm run ai:download-models` espelha os modelos em
  `public/models/` (gitignored; dev/Docker — em deploy CI a pasta não vai e
  o runtime cai no CDN).
- **PWA**: `public/sw.js` (shell offline + runtime cache; bypass para CDNs
  de modelos), `site.webmanifest` com ícones PNG (`scripts/gen-pwa-icons.mjs`),
  `ServiceWorkerRegister` (só produção) e `InstallPwaButton` no footer.
- **Copy**: a UI nunca diz que a IA é local/roda no navegador — textos
  neutros ("Resumo do dia", "Explicar") + disclaimer "não é a saída oficial
  do motor".

Flags: `NEXT_PUBLIC_LOCAL_AI=auto|off`, `NEXT_PUBLIC_LOCAL_AI_MODEL_BASE`,
`NEXT_PUBLIC_LOCAL_AI_FORCE_TIER`, `NEXT_PUBLIC_LOCAL_AI_CACHE_VERSION`,
`NEXT_PUBLIC_SW_DISABLED`.

## Segurança

- `src/middleware.ts` — headers (CSP, HSTS, X-Frame-Options); mudanças
  exigem justificativa no PR.
- `isomorphic-dompurify` para sanitização de HTML do relatório.
- Secrets só server-side; `NEXT_PUBLIC_*` é público.
- Sessão admin em cookie HttpOnly — nunca token em localStorage.

## Variáveis de ambiente

Ver `.env.example`. Principais: `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_DATA_SOURCE` (`db`|`fastapi`), `NEXT_PUBLIC_USE_MOCK`,
`DATABASE_URL`/`DIRECT_URL` (Prisma/Supabase), `NEXT_PUBLIC_API_URL` ou
`BACKEND_URL` (alvo do rewrite `/api/backend/*`), `JOSHUA_API_KEY` +
`JOSHUA_SYNC_TOKEN`, `RESEND_API_KEY`/`SMTP_*`, `NEXT_PUBLIC_GA_*`.
