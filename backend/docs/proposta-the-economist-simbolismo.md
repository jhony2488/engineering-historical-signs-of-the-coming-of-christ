# Proposta: Fonte The Economist com Análise de Simbolismo

## Resumo

Adicionar The Economist como fonte de dados especializada para análise de simbolismo visual e narrativas ocultas em capas e artigos, interpretando-os em contexto escatológico cristão através de uma nova Camada 16 (Symbolic Analysis).

> **Avaliação de modelos**: Ver [avaliacao-modelos-visao-simbolismo.md](avaliacao-modelos-visao-simbolismo.md) para benchmarking detalhado de GPT-4o, Gemini 2.5 Pro, Claude 3.5 Sonnet, SigLIP e modelos open-source.

## Motivação

The Economist é conhecido por capas altamente simbólicas que frequentemente carregam mensagens ocultas sobre geopolítica, economia e tendências globais. Analisar esse simbolismo em contexto escatológico pode revelar sinais sutis que fontes textuais tradicionais não capturam.

**Alinhamento com filosofia do projeto**: O projeto já prioriza modelos locais GGUF via llama.cpp (`LOCAL_LLM_ENABLED`). A extensão natural é usar os modelos multimodais GGUF disponíveis no llama.cpp (Qwen2-VL, InternVL, LLaVA), mantendo:
- Custo zero (apenas hardware)
- Consistência arquitetural
- Privacidade (dados não saem da máquina)
- Independência de APIs externas

## Arquitetura proposta

### 1. Nova fonte em `feeds.yaml`

```yaml
the_economist:
  name: "The Economist"
  type: "custom_scraper"
  url: "https://www.economist.com"
  scrape_cover: true  # baixar imagem da capa
  scrape_articles: true
  enabled: true
```

### 2. Novo adapter: `backend/motor/adapters/the_economist.py`

Responsabilidades:
- Scraper para capas (imagem + manchete principal)
- Scraper para artigos selecionados
- Extração de metadados (título, data, subtítulo)
- OCR para imagens de capa (se necessário)

Tecnologias:
- BeautifulSoup para parsing HTML
- Playwright para JavaScript-heavy (se necessário)
- Tesseract ou OCR alternativo para imagens

### 3. Nova camada: Camada 16 — Symbolic Analysis

Módulo: `motor/pipeline/symbolic_analysis.py`

Componentes:
- LLM especializado em interpretar simbolismo visual (capa)
- LLM para identificar narrativas ocultas/implícitas
- Correlação com corpus teológico (RAG)
- Mapeamento para "bestas" e "falso líder" (se aplicável)

### 4. Schema PostgreSQL

Nova tabela: `capas_the_economist`

```sql
CREATE TABLE capas_the_economist (
    id SERIAL PRIMARY KEY,
    data_publicacao DATE NOT NULL,
    imagem_url TEXT,
    imagem_path TEXT,
    manchete_principal TEXT,
    titulo TEXT,
    subtitulo TEXT,
    content_hash TEXT UNIQUE,
    criado_em TIMESTAMP DEFAULT NOW()
);
```

Nova tabela: `analise_simbolismo`

```sql
CREATE TABLE analise_simbolismo (
    id SERIAL PRIMARY KEY,
    capa_id INTEGER REFERENCES capas_the_economist(id),
    interpretacao_simbolica TEXT,
    narrativa_identificada TEXT,
    temas TEXT[],  -- array de temas: centralização de poder, controle financeiro, etc.
    score_bestas_mar DECIMAL(3,2) DEFAULT 0,
    score_bestas_terra DECIMAL(3,2) DEFAULT 0,
    score_falso_lider DECIMAL(3,2) DEFAULT 0,
    correlacao_teologica TEXT,
    modelo_usado TEXT,
    prompt_version TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);
```

### 5. Prompts

Arquivo: `motor/prompts/v1/symbolic_analysis_pt.md`

**Prompt de análise visual**:
```
Analise esta capa do The Economist em contexto escatológico cristão.
Identifique:
1. Simbolismo visual presente (cores, figuras, gestos, composição)
2. Referências geopolíticas ou econômicas implícitas
3. Paralelos com profecias bíblicas (Apocalipse, Daniel, etc.)
4. Possíveis correlações com as Bestas (Mar/Terra) ou Falso Líder

Retorne JSON com:
{
  "interpretacao_simbolica": "...",
  "narrativa_identificada": "...",
  "temas": ["tema1", "tema2", ...],
  "correlacao_teologica": "...",
  "score_bestas_mar": 0.0-1.0,
  "score_bestas_terra": 0.0-1.0,
  "score_falso_lider": 0.0-1.0
}
```

### 6. Modelos multimodais — Avaliação detalhada

**Prioridade**: Modelos gratuitos e performáticos (alinhado com filosofia do projeto que já usa GGUF locais).

> **Avaliação completa**: Ver [avaliacao-modelos-visao-simbolismo.md](avaliacao-modelos-visao-simbolismo.md) para benchmarking detalhado.

#### Recomendação: Qwen2-VL-7B GGUF via llama.cpp

**Por que Qwen2-VL-7B?**
- **SOTA em TIU bench**: 88.70 (top open-source em text-rich image understanding)
- **Licença Apache 2.0**: uso comercial permitido
- **GGUF disponível**: ready-to-use via llama.cpp (já usado no projeto)
- **Resolução dinâmica**: processa qualquer tamanho de imagem
- **Contexto**: 32K tokens (útil para prompts longos teológicos)
- **Custo**: $0 (apenas hardware)

**Download**:
```bash
llama-mtmd-cli -hf Qwen/Qwen2-VL-7B-Instruct-GGUF
```

#### Cascata de fallback (priorizando modelos locais gratuitos)

```
SigLIP (triagem, 400M) → Qwen2-VL-7B GGUF → InternVL2-8B GGUF →
LLaVA-1.6-7B GGUF → [opcional API] Gemini 2.5 Pro → GPT-4o → dry-run
```

**Modelos GGUF suportados pelo llama.cpp**:
- Qwen2-VL-7B (recomendado)
- InternVL2-8B (alternativa forte)
- LLaVA-1.6-7B (popular, estável)
- MiniCPM-V-2.6 (leve, eficiente)
- Gemma-3-4B-Vision (Google, menor)

**Env vars de configuração**:
```bash
# Primário (local, gratuito)
VISION_MODEL_PRIMARY=qwen2-vl-7b-gguf

# Fallback local
VISION_LOCAL_FALLBACK_1=internvl2-8b-gguf
VISION_LOCAL_FALLBACK_2=llava-1.6-7b-gguf

# Triagem leve
VISION_USE_SIGLIP_TRIAGE=true
SIGLIP_MODEL=google/siglip-so400m-patch14-384

# API fallback (opcional, não recomendado)
ENABLE_VISION_API_FALLBACK=false
```

#### Custo estimado

| Modelo | Custo mensal | Hardware | Notas |
|--------|--------------|----------|-------|
| Qwen2-VL-7B GGUF | $0 | CPU/GPU existente | **Recomendado** |
| InternVL2-8B GGUF | $0 | CPU/GPU existente | Alternativa |
| LLaVA-1.6-7B GGUF | $0 | CPU/GPU existente | Alternativa |
| SigLIP triagem | $0 | CPU-only | Ultra-leve |
| Gemini 2.5 Pro | $0.20-0.40 | N/A | Fallback API opcional |

**Requisitos de hardware**:
- Mínimo: CPU 8 cores, 16GB RAM (lento)
- Recomendado: CPU 8+ cores, GPU 8GB VRAM (30-60s/capa)
- Ideal: CPU 12+ cores, GPU 16GB+ VRAM (15-30s/capa)

#### Considerações específicas para simbolismo escatológico

1. **Conhecimento teológico**: Modelos podem ter bias culturais no treinamento
   - **Mitigação**: RAG com corpus teológico explícito (já existente no projeto)
   - Prompt engineering com contexto bíblico (Apocalipse, Daniel)

2. **Interpretação de alegorias**: Risk de "over-interpretation"
   - **Mitigação**: Thresholds altos (default 0.7) para scores de correlação
   - Revisão manual quando score > 0.8

3. **Performance de modelos locais**: Podem ser mais lentos que APIs
   - **Mitigação**: Processamento assíncrono após run diário principal
   - Cache de resultados para não reprocessar mesma capa

#### Configuração recomendada

```yaml
# backend/config/model_config.yaml (novo arquivo)
vision:
  # Primário: local GGUF (gratuito)
  primary: "qwen2-vl-7b-gguf"

  # Cascata local fallback
  local_fallback_chain:
    - "internvl2-8b-gguf"
    - "llava-1.6-7b-gguf"

  # Triagem leve
  use_siglip_triage: true
  siglip_model: "google/siglip-so400m-patch14-384"
  siglip_triage_confidence_threshold: 0.6

  # API fallback (opcional, não recomendado)
  enable_api_fallback: false
  api_primary: "gemini-2.5-pro"
  api_fallback_chain:
    - "gpt-4o"
    - "claude-3.5-sonnet"

  # llama.cpp config
  gpu_layers: 20
  ctx_size: 8192
  threads: 8

  dry_run: false
  max_retries: 2
  timeout_seconds: 60
```

Prompts detalhados em `motor/prompts/v1/symbolic_analysis_pt.md`.

### 7. CLI

Novo comando:
```bash
python -m motor.cli analyze-the-economist [--date YYYY-MM-DD] [--dry-run]
```

Fluxo:
1. Coleta capas do The Economist
2. Executa OCR se necessário
3. Roda Camada 16 (Symbolic Analysis)
4. Persiste em `analise_simbolismo`
5. Emite relatório de correlações detectadas

### 8. Dashboard

Nova página: `front-end/src/app/simbolismo/page.tsx`

Conteúdo:
- Galeria de capas analisadas
- Cards com interpretação simbólica
- Gráficos de scores ao longo do tempo
- Filtros por tema, período, score mínimo

Componentes:
- `SymbolicGallery` — grid de capas
- `SymbolicCard` — card individual com análise
- `SymbolicTrends` — gráfico de tendências
- `SymbolicFilters` — filtros

## Fluxo completo

```
Ingestão The Economist
  ↓
Scraper (capas + artigos)
  ↓
OCR (se imagem)
  ↓
Camada 16 (Symbolic Analysis)
  ├─ Interpretação simbólica (LLM multimodal)
  ├─ Identificação de agenda narrativa
  ├─ Correlação com corpus teológico (RAG)
  └─ Mapeamento para Bestas/Falso Líder
  ↓
PostgreSQL (capas_the_economist + analise_simbolismo)
  ↓
Dashboard (front-end/src/app/simbolismo/)
```

## Detalhes técnicos

### Análise visual

- Usa modelo multimodal (GPT-4V, Gemini Vision, ou local com CLIP)
- Prompt: "Interprete o simbolismo desta capa em contexto escatológico cristão"
- Thresholds de score configuráveis via env vars:
  - `SYMBOLIC_BESTAS_MAR_THRESHOLD`
  - `SYMBOLIC_BESTAS_TERRA_THRESHOLD`
  - `SYMBOLIC_FALSO_LIDER_THRESHOLD`

### Análise narrativa

- Extrair temas: centralização de poder, controle financeiro, tecnologia de vigilância, etc.
- Cross-check com corpus teológico (RAG)
- Classificação de tom: expansão vs contração espiritual

### Correlação

- Se simbolismo = "besta do mar" (financeiro) → score_bestas.mar
- Se simbolismo = "besta da terra" (ideológico/tecnológico) → score_bestas.terra
- Se narrativa = "falso líder" → score_falso_líder

## Integração com camadas existentes

- **Camada 3 (RAG)**: usado para correlação teológica
- **Camada 8 (Correlação)**: scores da Camada 16 alimentam os scores de Bestas/Falso Líder
- **Camada 9 (Relatórios)**: inclui seção de simbolismo no relatório diário
- **Dashboard**: página dedicada em `/simbolismo`

## Custo e impacto

### Custo
- API de visão: ~$0.01-0.10 por capa (dependendo do modelo)
- Armazenamento: ~5-10MB por capa (imagem + metadata)
- 1 capa/semana → $0.50-5.00/mês, 20-40MB/mês

### Impacto no pipeline
- Tempo adicional: ~30-60s por capa (análise multimodal)
- Pode rodar assincronamente após o run diário principal
- Não bloqueia as camadas 1-15

## Riscos e mitigações

### Risco: Subjetividade da análise simbólica
- **Mitigação**: Usar múltiplos modelos em ensemble, manter histórico para calibração

### Risco: Falsos positivos em correlações
- **Mitigação**: Thresholds altos (default 0.7), revisão manual quando score > 0.8

### Risco: Dependência de API externa
- **Mitigação**: Fallback para CLIP local, cache de resultados

## Próximos passos

1. Criar adapter `the_economist.py` (scraper básico)
2. Adicionar schema PostgreSQL (migration)
3. Implementar Camada 16 (symbolic_analysis.py)
4. Criar adapter `local_vision.py` (extensão de `local_llm.py` para llama.cpp libmtmd)
5. Download de modelos GGUF:
   - Qwen2-VL-7B-Instruct-GGUF (primário)
   - InternVL2-8B-GGUF (fallback)
   - LLaVA-1.6-7B-GGUF (fallback adicional)
   - SigLIP (triagem leve)
6. Criar prompts em `prompts/v1/symbolic_analysis_pt.md`
7. Adicionar comando CLI em `motor/cli.py`
8. Criar página do dashboard
9. Testar com capas históricas (dry-run)
10. Integrar com Camada 8 (correlação)

### Script de download de modelos

Extensão de `scripts/download_models.py` para incluir modelos de visão:

```bash
python scripts/download_models.py --all --include-vision
# Baixa: modelos texto GGUF + modelos visão GGUF + SigLIP
```

## Status

- [ ] Proposta aprovada
- [ ] Adapter the_economist.py criado
- [ ] Schema PostgreSQL criado
- [ ] Camada 16 implementada
- [ ] Prompts criados
- [ ] CLI implementada
- [ ] Dashboard criado
- [ ] Testes executados
- [ ] Integração com Camada 8
- [ ] Documentação atualizada
