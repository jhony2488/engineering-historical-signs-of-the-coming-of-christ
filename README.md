# Engenharia de Sinais Históricos da vinda de Cristo

Sistema de análise escatológica que traduz a escatologia em **engenharia de
sinais**: processamento batch diário de fontes históricas e noticiosas (RSS,
GDELT, ACLED, corpus teológico), correlação matemática e hermenêutica com
profecias, e publicação de fases, rankings e relatórios em um dashboard.

> **Análise, não adivinhação de datas** — o sistema mede a convergência de
> sinais e a convicção estatística de transição entre eras; nunca prevê
> calendários.

## Como funciona

O motor executa um pipeline batch diário (~04:00 BRT, via GitHub Actions) que
transforma documentos brutos em um índice escatológico consolidado:

```text
ingestão → pré-processamento → embeddings/RAG → LLMs (extração, timeline,
raciocínio, hermenêutica) → correlação (Bayes + HMM/Viterbi + MCDA) →
extensões (ameaças, ecos, ABM, red team, proveniência) → relatório → PostgreSQL
→ dashboard
```

Volume esperado: ~1 processamento/dia, ~8/semana, ~33/mês.

### Linha do tempo escatológica (fases)

O sistema mapeia em qual macrofase a humanidade se encontra, com base nas
Escrituras e na tradição teológica:

| Fase | Nome | Descrição |
|------|------|-----------|
| `FASE_I` | Início das Dores | Eventos cíclicos crescentes (guerras, fomes, terremotos, pestes) — primeiros marcadores de transição |
| `FASE_II` | Grande Apostasia e Cenário Global | Consolidação de governança global, esfriamento da fé, tecnologia de controle centralizado |
| `FASE_III` | Manifestação e Tribulação | Figuras/governos antitéticos ao messianismo, perseguição sistemática, polarização extrema |
| `FASE_IV` | Convergência Final | Sinais cósmicos definitivos, cumprimento das últimas profecias, transição para a Parusia |

A fase é estimada por **HMM + Viterbi** (distribuição de probabilidade sobre
estados ocultos) ponderada com **inferência Bayesiana** (convicção atualizada
a cada evidência) e validação hermenêutica via LLM.

### Análise multidimensional e energias

- **Macro** — geopolítica (Oriente Médio, alianças, centralização de poder),
  cultura/sociedade (apostasia, secularismo), tecnologia (CBDCs, vigilância,
  identidade digital).
- **Micro** — espiritualidade local, resistência/fidelidade, ações de alerta.
- **Energia de Expansão** — sinais de luz: avanço do Evangelho, despertamento,
  caridade, unificação da fé dos remanescentes.
- **Energia de Contração** — sinais de sombra: perseguição, engano sistêmico,
  totalitarismo, catástrofes — mede a saturação do "mistério da iniquidade".

### Detecções principais

| Sinal | O que mede |
|-------|------------|
| **Falso líder** | Incongruência entre discurso pró-cristão (macro) e agenda de controle (micro) — alerta de engano sistêmico |
| **Besta do Mar** | Score de consolidação político-financeira unificada (Anticristo) |
| **Besta da Terra** | Score do aparato ideológico/tecnológico que coage aceitação (Falso Profeta) |
| **Ranking Top-10** | MCDA + Bayes: Probabilidade de Alinhamento de Perfil (PAP) por candidato, com tendência 24h |
| **Proximidade espiritual** | Convergência macro×micro que indica avanço de fase |

### Extensões do pipeline

Além das 9 camadas centrais, o batch diário executa:

- **Camada 0** — baseline histórico de profecias cumpridas (arquivo cronológico)
- **Camada 10** — análise de ameaças por país com matriz prescritiva
- **Camada 11** — ecos históricos (análogos proféticos por similaridade)
- **Camada 12** — simulação ABM leve (agentes, 100 runs × 24 meses/país)
- **Camada 13** — validação adversarial (red team, bootstrap + síntese LLM)
- **Camada 14** — proveniência: cadeia SHA-256 por estágio + Merkle root diário
- **Camada 15** — recomendações adaptativas com triggers `SE/ENTÃO`

Detalhes em [backend/docs/arquitetura.md](backend/docs/arquitetura.md) e
[backend/docs/camadas.md](backend/docs/camadas.md).

### Motores hierárquicos

| Nível | Frequência | Saída |
|-------|------------|-------|
| **Nível 1** | Diário | `resultados_escatologicos` |
| **Nível 2** | Semanal → anual | `snapshots_periodo` (síntese de deltas) |
| **Nível 3** | Trimestral/semestral/anual | `snapshots_periodo` `*_hybrid` (síntese + RAG teológico) |

## Estrutura do repositório

| Pasta | Descrição |
|-------|-----------|
| [`backend/`](backend/) | Motor de IA Python, FastAPI, PostgreSQL/pgvector, testes |
| [`front-end/`](front-end/) | Dashboard Next.js — painel escatológico, rankings, histórico, globo 3D, grafo |
| [`.github/workflows/`](.github/workflows/) | CI de PR para testes e assinaturas SSH + 10 workflows agendados (batch diário, sínteses, drift, híbridos) |

## Stack

| Componente | Tecnologia |
|------------|------------|
| Motor | Python 3.11+, FastAPI, `structlog`, `typer` |
| LLMs | Groq → DeepSeek → Gemini → OpenRouter (fallback) → Ollama (opcional) |
| Embeddings/RAG | BGE-M3, pgvector, reranker BGE, classificadores locais (gate zero-shot, shadow mode, dedup semântico, destilação sklearn) |
| Matemática | Bayes, HMM/Viterbi, MCDA, GNN v1 (NetworkX) |
| Banco | PostgreSQL com conexão direta via `DATABASE_URL` (única persistência) |
| Dashboard | Next.js 15, React 19, TypeScript, Tailwind, Recharts, Cytoscape, Three.js |
| Batch | GitHub Actions (cron) — sem infra 24/7 |
| Qualidade | Husky: lint no commit, testes no push |

## Início rápido

### Backend (motor)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -e ".[ml,dev]"
cp .env.example .env     # LLM_DRY_RUN=true roda sem chaves
python -m motor.cli validate-schemas
python -m motor.cli run-daily --dry-run
uvicorn api.main:app --reload
```

### Front-end (dashboard)

```bash
cd front-end
npm install
npm run db:generate      # obrigatório — .npmrc usa ignore-scripts=true
cp .env.example .env.local   # NEXT_PUBLIC_USE_MOCK=true roda sem Supabase
npm run dev
```

## Documentação

- Contribuição: [CONTRIBUTING.md](CONTRIBUTING.md)
- Agentes de IA: [AGENTS.md](AGENTS.md) · Nuvem/infra: [CLOUD.md](CLOUD.md)
- Backend: [backend/README.md](backend/README.md) · [docs](backend/docs/) —
  [arquitetura](backend/docs/arquitetura.md) ·
  [camadas](backend/docs/camadas.md) · [CLI](backend/docs/cli.md) ·
  [API](backend/docs/api-contrato.md) · [schemas](backend/docs/schemas-json.md) ·
  [variáveis de ambiente](backend/docs/variaveis-ambiente.md) ·
  [fontes de dados](backend/docs/fontes-dados.md) ·
  [PostgreSQL + pgvector](backend/docs/setup-postgres.md) ·
  [Actions](backend/docs/github-actions.md) ·
  [providers LLM](backend/docs/model-providers.md)
- Front-end: [front-end/README.md](front-end/README.md) ·
  [docs](front-end/docs/) · [Prisma](front-end/prisma/README.md)
- Contribuição backend: [backend/docs/REQUISITOS_CONTRIBUICAO.md](backend/docs/REQUISITOS_CONTRIBUICAO.md)
- Contribuição front-end: [front-end/docs/REQUISITOS_CONTRIBUICAO.md](front-end/docs/REQUISITOS_CONTRIBUICAO.md)

## Propostas em avaliação

- [The Economist com análise de simbolismo (Camada 16)](backend/docs/proposta-the-economist-simbolismo.md) — fonte adicional para análise de simbolismo visual e narrativas ocultas em capas e artigos, usando modelos GGUF locais gratuitos (Qwen2-VL, InternVL, LLaVA) via llama.cpp
- [Avaliação de modelos de visão para análise de simbolismo](backend/docs/avaliacao-modelos-visao-simbolismo.md) — benchmarking detalhado priorizando modelos gratuitos e performáticos (Qwen2-VL-7B GGUF, InternVL2-8B GGUF, LLaVA-1.6-7B GGUF, SigLIP) com fallback opcional para APIs

## Licença

[GPL-3.0](LICENSE)
