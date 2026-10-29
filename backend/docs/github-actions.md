# GitHub Actions

Workflows na raiz do repositório (`.github/workflows/`), executando comandos em `backend/`.

## daily-batch.yml

| Item | Valor |
|------|-------|
| Cron | `0 7 * * *` UTC (~04:00 BRT) |
| Comando | `python -m motor.cli run-daily` |
| Timeout | 120 min |

### Secrets necessários

- `DATABASE_URL` (PostgreSQL com pgvector)
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY` (fallback)
- `GEMINI_API_KEY` (Google AI Studio — camadas 4, 5, 7)
- `DEEPSEEK_API_KEY` (camada 6 — raciocínio)
- `EMAIL_FROM` (remetente do digest diário)
- `RESEND_API_KEY` (serviço de e-mail)

### Variables (configurações opcionais)

- `LLM_DRY_RUN` — `false` (padrão) ou `true` para testes sem consumo de API
- `EMAIL_DRY_RUN` — `true` (padrão) para simular envio de e-mail sem disparar real
- `LOCAL_LLM_ENABLED` — `true` (padrão) ou `false` para desabilitar SLM local
- `PROMPTS_LANG` — `en` (padrão) ou `pt` para idioma dos prompts
- `TRANSLATE_NARRATIVES` — `true` (padrão) para traduzir narrativas EN→PT
- `CLASSIFIER_HINTS_ENABLED` — `true` (padrão) para habilitar hints de classificador

### Disparo manual

Actions → **Daily Batch** → **Run workflow**

## weekly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Segunda `30 8 * * 1` UTC |
| Comando | `python -m motor.cli run-synthesis --window weekly` |

Agrega deltas e chama LLM sobre JSON resumido (Motor Nível 2).

## monthly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Dia 1, `0 9 1 * *` UTC |
| Comando | `python -m motor.cli run-synthesis --window monthly` |

## quarterly-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | Jan/Abr/Jul/Out dia 1, `0 10 1 1,4,7,10 *` UTC |
| Comando | `python -m motor.cli run-synthesis --window quarterly` |

## semiannual-synthesis.yml

| Item | Valor |
|------|-------|
| Cron | 1º de janeiro e 1º de julho, `15 9 1 1,7 *` UTC |
| Comando | `python -m motor.cli run-synthesis --window semiannual` |

Motor Nível 2 — síntese semestral (180 dias).

## quarterly-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | Jan/Abr/Jul/Out dia 1, `45 10 1 1,4,7,10 *` UTC |
| Comando | `python -m motor.cli run-hybrid-analysis --window quarterly` |

Motor Nível 3 — análise híbrida trimestral (`quarterly_hybrid`). Executa após `quarterly-synthesis.yml` (10:00 UTC).

## semiannual-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | 1º de julho `0 11 1 7 *` UTC; 1º de janeiro `30 12 1 1 *` UTC (após annual-hybrid) |
| Comando | `python -m motor.cli run-hybrid-analysis --window semiannual` |

Motor Nível 3 — análise híbrida semestral (`semiannual_hybrid`). Executa após `semiannual-synthesis.yml` (09:15 UTC).

## annual-hybrid.yml

| Item | Valor |
|------|-------|
| Cron | 1º de janeiro, `0 11 1 1 *` UTC |
| Comandos | `run-synthesis --window annual` → `run-hybrid-analysis --window annual` |

Motor Nível 3 — análise híbrida anual: cruza snapshots semanal/mensal/trimestral/anual com RAG teológico (`annual_hybrid`).

## motor-nivel-3-dispatch.yml

Disparo manual com escolha de janela (`quarterly` | `semiannual` | `annual`) e opção de rodar síntese Nível 2 antes do híbrido.

## Calendário resumido (UTC)

| Janela | Nível 2 (síntese) | Nível 3 (híbrido) |
|--------|-------------------|-------------------|
| Semanal | Seg `30 8 * * 1` | — |
| Mensal | Dia 1 `0 9 1 * *` | — |
| Trimestral | Dia 1 trim. `0 10 1 1,4,7,10 *` | Dia 1 trim. `45 10 1 1,4,7,10 *` |
| Semestral | `15 9 1 1,7 *` | Jul `0 11 1 7 *`; Jan `30 12 1 1 *` |
| Anual | Jan 1 `0 11 1 1 *` (em annual-hybrid) | Jan 1 `0 11 1 1 *` |

> O motor possui três níveis operacionais (diário, síntese, híbrido). Não há Motor Nível 4 no código — janelas mensais usam apenas Nível 2.

## CI sem chaves LLM

Defina variável de repositório `LLM_DRY_RUN=true` para pipelines de teste sem consumo de API.

## Cache

O workflow diário cacheia `~/.cache/huggingface` para o modelo BGE-M3.

## Workflows de Build Multiplataforma

### build-android.yml

Constrói o APK Android via Capacitor para distribuição.

|| Item | Valor |
|------|-------|
| Trigger | Push de tag `v*` (ex: `v1.0.0`) ou `workflow_dispatch` manual |
| Plataforma | Ubuntu Latest |
| Saída | APK publicada em GitHub Release |
| Requisitos | Node.js 22, Java JDK 17, Android SDK |

**Processo:**
1. Check out repository
2. Setup Node.js, Java JDK, Android SDK
3. Install dependencies em `front-end/`
4. Build Next.js (`npm run build`)
5. Install Capacitor CLI
6. Check se `android/` existe; se não, adiciona plataforma
7. Sync Capacitor (`npx cap sync android`)
8. Build Android APK (`npx cap build android`)
9. Upload artifact (30 dias retenção)
10. Cria GitHub Release com APK

**Build local:**
```bash
cd front-end
npm run android:build
```

### build-desktop.yml

Constrói binários desktop (Windows, Linux, macOS) via Tauri.

|| Item | Valor |
|------|-------|
| Trigger | Push de tag `v*` (ex: `v1.0.0`) ou `workflow_dispatch` manual |
| Plataforma | Matrix: Ubuntu Latest, macOS Latest, Windows Latest |
| Saída | Binários publicados em GitHub Release |
| Requisitos | Node.js 22, Rust toolchain |

**Processo:**
1. Check out repository
2. Setup Node.js, Rust toolchain
3. Install system dependencies (Linux: libwebkit2gtk-4.1-dev)
4. Install dependencies em `front-end/`
5. Initialize Tauri (`npm run tauri:init` - verifica se `src-tauri/` existe)
6. Build desktop app (`npm run tauri:build`)
7. Upload artifacts por plataforma (30 dias retenção)
8. Cria GitHub Release (apenas na plataforma Ubuntu)

**Build local:**
```bash
cd front-end
npm run tauri:build
```

### Notas sobre Plataformas

- As pastas `android/` e `src-tauri/` são inicializadas apenas no CI/CD
- Não são versionadas no repositório (seguindo preferência do projeto)
- Isso evita conflitos de versão entre builds locais e CI
- O script `scripts/init-tauri.js` gerencia a inicialização do Tauri
- O workflow `build-android.yml` verifica se `android/` existe antes de adicionar
