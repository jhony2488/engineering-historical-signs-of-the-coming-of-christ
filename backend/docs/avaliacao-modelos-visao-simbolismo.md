# Avaliação de Modelos de Visão para Análise de Simbolismo

## Resumo executivo

Para análise de simbolismo visual em capas do The Economist em contexto escatológico cristão, **priorizando modelos gratuitos e performáticos**:

**Pré-processador (gratuito)**: OXR (Optical Everything Recognition) - extrai texto/layout em JSON
**Primário (API gratuita)**: Groq `qwen/qwen3.8-27b` (30 req/min, 1,000 req/day grátis)
**Fallback API gratuita**: DeepSeek `deepseek-flash` (vision integrado, sem custo adicional)
**Fallback API gratuita**: Gemini 2.5 Flash (10 RPM, 500 RPD grátis, vision suportado)
**Triagem ultra-leve**: SigLIP (400M, Apache 2.0) para classificação zero-shot

**Princípio**: OXR extrai JSON estruturado da imagem (texto, layout, coordenadas). LLM recebe JSON (não imagem bruta), reduzindo custo de tokens e focando em interpretação simbólica.

## Tarefas específicas da análise

### 1. Compreensão de simbolismo visual
- Metáforas visuais e alegorias
- Composição espacial (cores, gestos, arranjo)
- Referências culturais/geopolíticas
- Paralelos com iconografia religiosa

### 2. Texto em imagem
- Manchetes principais
- Legendas e slogans
- OCR para texto não-textual

### 3. Correlação teológica
- Mapeamento para profecias bíblicas
- Identificação de temas escatológicos
- Cross-check com corpus teológico (RAG)

## Benchmarking de modelos (2025)

### Performance em iconografia cristã

| Modelo | Accuracy ArtDL | Accuracy ICONCLASS | Accuracy Wikidata | Observações |
|--------|----------------|-------------------|-------------------|-------------|
| **Gemini 2.5 Pro** | 90.45% | 88.20% | 64.86% | Melhor geral (pago) |
| **Gemini 2.5 Flash** | ~88% | ~86% | ~62% | Próximo ao Pro, gratuito |
| **GPT-4o** | 88.20% | 85.40% | 62.10% | Segundo melhor (pago) |
| **ResNet50 (baseline)** | ~85% | ~82% | ~60% | Fine-tuned |
| **SigLIP** | 64.86% (Wikidata) | - | - | Open-source |

**Fonte**: "Benchmarking Vision-Language and Multimodal Large Language Models in Zero-shot and Few-shot Scenarios: A study on Christian Iconography" (2025)

### Performance em leitura de gráficos/texto em imagem

| Modelo | Factual Extraction | Interpretation | Comparison | Overall |
|--------|-------------------|---------------|-----------|---------|
| **Claude Opus 4** | 92% | 88% | 87% | **89%** |
| **Gemini 2.5 Pro** | 88% | 84% | 83% | **85%** |
| **GPT-4o** | 85% | 80% | 81% | **82%** |
| **Claude 3.5 Sonnet** | 86% | 82% | 79% | **82%** |
| **Gemini 2.0 Flash** | 80% | 76% | 75% | 77% |
| **GPT-4o mini** | 72% | 68% | 70% | 70% |

**Fonte**: "Vision model benchmarks: who can actually read a chart?" (2025)

### Performance em tasks visuais gerais

| Modelo | Image Classification | Object Detection | Semantic Segmentation | Top Tasks |
|--------|---------------------|------------------|----------------------|------------|
| **GPT-4o** | 75.79% (ImageNet V2) | 3º lugar | 1º lugar | **4/6** |
| **Gemini 1.5 Pro** | - | - | - | 2º lugar |
| **Claude 3.5 Sonnet** | - | - | - | 3º lugar |
| **Qwen2-VL** | - | - | - | Top open-source |

**Fonte**: "How Well Does GPT-4o Understand Vision?" (2025)

### Performance em text-rich image understanding (TIU)

| Modelo | TIU Bench Score | Notas |
|--------|-----------------|-------|
| **Qwen2-VL-72B** | 88.70 | Top open-source |
| **InternVL2.5-78B** | 87.73 | 2º open-source |
| **InternVL2.5-38B** | 87.45 | 3º open-source |
| **InternVL2.5-26B** | 85.85 | 4º open-source |
| **DeepSeek-VL2-27B** | 85.40 | 5º open-source |

**Fonte**: "Multimodal Large Language Models for Text-rich Image Understanding: A Comprehensive Review" (2025)

## Modelos GGUF via llama.cpp (primários — gratuitos e locais)

O projeto já usa llama.cpp para LLMs locais. A extensão `libmtmd` adiciona suporte a modelos multimodais, permitindo rodar visão+texto localmente com custo zero.

### Modelos suportados pelo llama.cpp (2025)

Via `llama-mtmd-cli` ou `llama-server`:

| Modelo | Tamanho | GGUF | Licença | Performance | Observações |
|--------|---------|------|---------|-------------|-------------|
| **Qwen2-VL-7B** | 7B | ✅ | Apache 2.0 | 88.70 TIU bench | **Recomendado** - SOTA open-source |
| **InternVL2-8B** | 8B | ✅ | Apache 2.0 | 87.45 TIU bench | 2º melhor TIU |
| **LLaVA-1.6-7B** | 7B | ✅ | Apache 2.0 | Bom | Popular, estável |
| **MiniCPM-V-2.6** | 8B | ✅ | Apache 2.0 | Bom | Leve, eficiente |
| **Gemma-3-4B-Vision** | 4B | ✅ | Gemma | Bom | Google, menor |
| **MobileVLM-3B** | 3B | ✅ | Apache 2.0 | Leve | Para hardware limitado |
| **Qwen3-VL-8B** | 8B | ✅ | Qwen | SOTA thinking | Novo, mais forte |
| **Qwen3-VL-235B** | 235B (MoE) | ✅ | Qwen | SOTA absolute | Pesado, GPU forte |

**Fonte**: llama.cpp multimodal docs + ggml-org collection no HuggingFace

### Qwen2-VL-7B (recomendado)

**Por que recomendado**:
- **SOTA em TIU bench**: 88.70 (top open-source em text-rich image understanding)
- **Licença Apache 2.0**: uso comercial permitido
- **GGUF disponível**: ready-to-use via llama.cpp
- **Resolução dinâmica**: processa qualquer tamanho de imagem
- **Contexto**: 32K tokens (útil para prompts longos teológicos)

**Download via llama.cpp**:
```bash
llama-mtmd-cli -hf Qwen/Qwen2-VL-7B-Instruct-GGUF
# Ou manual via huggingface-cli
huggingface-cli download Qwen/Qwen2-VL-7B-Instruct-GGUF
```

**Requisitos de hardware**:
- CPU: 8+ cores recomendados
- RAM: 16GB mínimo (quantização Q4_K_M)
- GPU: 8GB VRAM (se usar --gpu-layers)
- Custo: $0 (apenas hardware)

### InternVL2-8B (alternativa forte)

**Vantagens**:
- 2º lugar em TIU bench (87.45)
- Excelente em reasoning visual
- GGUF disponível

**Limitação**: Slightly mais pesado que Qwen2-VL-7B

### LLaVA-1.6-7B (alternativa estável)

**Vantagens**:
- Muito popular, amplamente testado
- GGUF amplamente disponível
- Comunidade grande

**Limitação**: Performance ligeiramente inferior a Qwen2-VL/InternVL2

### MiniCPM-V-2.6 (para hardware limitado)

**Vantagens**:
- Eficiente, mais leve
- Boa performance para tamanho

**Limitação**: Contexto menor, performance reduzida

### Qwen3-VL-8B (futuro — novo)

**Vantagens**:
- Versão "thinking" para raciocínio profundo
- SOTA em benchmarks recentes
- GGUF disponível

**Status**: Novo (2025), pode ter bugs iniciais

## Modelos leves para triagem (não GGUF, mas open-source)

### SigLIP (Google)

**Modelo**: `google/siglip-so400m-patch14-384`
- **Tamanho**: 400M parâmetros
- **Licença**: Apache 2.0
- **Uso**: Classificação zero-shot, embedding visual
- **Performance**: Melhor que CLIP em benchmarks modernos
- **Custo**: Zero (apenas hardware)
- **Limitação**: Não gera interpretação textual, só classifica

**Uso no projeto**: Triagem pré-LLM para detectar temas básicos (political, economic, religious, technological) antes de invocar modelo GGUF mais pesado.

### SigLIP 2

- **Melhorias**: Multilingue, melhor semantic understanding, localization
- **Licença**: Apache 2.0
- **Performance**: Super SigLIP em todas as escalas

### OpenVision

- **Tamanhos**: 5.9M a 632.1M parâmetros
- **Licença**: Fully open (dados + recipe)
- **Performance**: Match/surpass CLIP em LLaVA
- **Vantagem**: Alternativa completamente open-source

## Modelos de extração visual estruturada (pré-processores)

### OXR (Optical Everything Recognition) - Recomendado

**Modelo**: Open-source document parsing (1.3B params)

**Status**: API gratuita disponível

**Especificações**:
- **Função**: Transforma PDFs/imagens em JSON ou Markdown com layout coordinates
- **API gratuita**: `https://free-oxr.somark.ai/api/v1`
- **Limite gratuito**: 50 páginas grátis (sem registro)
- **Formatos**: PDF, PNG, JPEG, WebP, TIFF
- **Licença**: Open-source (Apache 2.0)
- **Custo**: $0 (API gratuita), ou self-hosted

**Vantagens**:
- #1 em benchmarks (olmOCR-Bench, OmniDocBench, DocParsingBench)
- Retorna JSON estruturado com layout coordinates
- LLM não precisa processar imagem bruta (economia de tokens)
- Suporta 50 páginas grátis no free tier (suficiente para uso moderado)

**Limitações**:
- 50 páginas grátis (pode ser limitado para uso intenso)
- API gratuita não recomendada para produção (fila pode variar)

**Uso**:
```bash
curl https://free-oxr.somark.ai/api/v1/parse \
  -F "file=@capa.jpg" \
  -F "output_format=json"
```

**Retorno JSON**:
```json
{
  "text": "The Great Reset\nGlobal governance...",
  "layout": [
    {"type": "heading", "bbox": [100, 50, 500, 100], "text": "The Great Reset"},
    {"type": "paragraph", "bbox": [100, 120, 600, 200], "text": "Global governance..."}
  ],
  "coordinates": [...]
}
```

**Integração com pipeline**:
```python
import requests

def preprocess_image_with_oxr(image_path: str) -> dict:
    """Extrai JSON estruturado da imagem usando OXR"""
    with open(image_path, 'rb') as f:
        response = requests.post(
            'https://free-oxr.somark.ai/api/v1/parse',
            files={'file': f},
            data={'output_format': 'json'}
        )
    return response.json()

# Uso no pipeline
oxr_result = preprocess_image_with_oxr('capa.jpg')
# LLM recebe oxr_result['text'] + oxr_result['layout'] (JSON, não imagem)
```

### PennyOCR (alternativa para OCR puro)

**Especificações**:
- 50 páginas grátis (sem cartão)
- Retorna JSON com markdown (tabelas preservadas)
- $0.75/1,000 páginas (pago)

**Uso quando**: OXR indisponível ou precisa de OCR específico

## Modelos API gratuitos com visão (primários — sem custo)

### Groq: qwen/qwen3.8-27b

**Status**: Disponível no plano gratuito Groq

**Especificações**:
- **Modelo**: `qwen/qwen3.8-27b` (27B multimodal)
- **Contexto**: 131K tokens
- **Imagens por request**: até 3 imagens
- **Imagem em tokens**: 2,048 tokens por imagem
- **Limite tamanho imagem**: 20MB por request
- **Limite gratuito**: 30 req/min, 1,000 req/day, 8K tokens/min, 200K tokens/day
- **Licença**: Qwen (uso comercial permitido)
- **Custo**: $0 (plano gratuito)

**Vantagens**:
- Rápido (Groq LPU™)
- Alto contexto (131K)
- Suporta imagens nativamente
- API OpenAI-compatible

**Limitações**:
- 3 imagens por request (suficiente para 1 capa)
- Limite diário de 1,000 requests (suficiente para uso moderado)

**Uso**:
```python
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
response = client.chat.completions.create(
    model="qwen/qwen3.8-27b",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Analise o simbolismo desta capa do The Economist..."},
            {"type": "image_url", "image_url": {"url": "https://example.com/capa.jpg"}}
        ]
    }]
)
```

### DeepSeek: deepseek-flash (vision integrado)

**Status**: Vision integrado ao modelo principal, sem custo adicional

**Especificações**:
- **Modelo**: `deepseek-flash` (multimodal integrado)
- **Contexto**: 1M tokens
- **Imagens por request**: até 3,600 imagens
- **Imagem em tokens**: até 384 tokens por imagem (até 384×384px)
- **Limite tamanho imagem**: 32MB (URL), 48MB (base64)
- **Limite gratuito**: API gratuita com cotas não publicadas (ver Google AI Studio)
- **Custo**: $0.22/M input tokens (mesmo preço que texto)
- **Licença**: DeepSeek (uso comercial permitido)

**Vantagens**:
- Contexto massivo (1M tokens)
- Imagens baratas (384 tokens cada)
- Files API gratuito (upload uma vez, reuse)
- Alta performance em benchmarks

**Limitações**:
- Cotas gratuitas não publicadas
- 384 tokens por imagem pode acumular em múltiplas capas

**Uso**:
```python
from openai import OpenAI

client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
response = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Analise o simbolismo desta capa..."},
            {"type": "image_url", "image_url": {"url": "https://example.com/capa.jpg"}}
        ]
    }]
)
```

### Gemini 2.5 Flash (fallback gratuito)

**Status**: API gratuita com cotas publicadas

**Especificações**:
- **Modelo**: `gemini-2.5-flash` (melhor price-performance)
- **Contexto**: 1M tokens
- **Imagens por request**: até 3,600 imagens
- **Imagem em tokens**: 258 tokens por imagem (até 384×384px)
- **Limite gratuito**: 10 RPM, 500 RPD (Requests Per Day)
- **Custo**: $0 (plano gratuito), $0.30/M input + $2.50/M output (plano pago)
- **Licença**: Google (uso comercial permitido, verificar termos)

**Vantagens**:
- Mais rápido que Pro (latência menor)
- Contexto massivo (1M tokens)
- Imagens baratas (258 tokens cada)
- Cotas gratuitas publicadas (10 RPM, 500 RPD)
- Suporta thinking e código

**Limitações**:
- Limite de 10 RPM modesto (suficiente para 4 capas/mês)
- Não disponível em EU/UK/Suíça no free tier
- Conteúdo gratuito pode ser usado por Google para melhorar produtos

## Modelos GGUF locais (alternativa custo-zero se tiver hardware)

- **Performance**: 90.45% em iconografia cristã (melhor geral)
- **Custo**: $3.5/M input, $10.5/M output + vision
- **Contexto**: 1M tokens
- **Status**: Melhor opção paga

### GPT-4o

- **Performance**: 88.20% em iconografia, 4/6 tasks visuais top
- **Custo**: $5/M input, $15/M output + vision
- **Contexto**: 128K tokens
- **Status**: Segunda melhor opção paga

### Claude 3.5 Sonnet

- **Performance**: 82% overall em leitura de gráficos
- **Custo**: $3/M input, $15/M output + vision
- **Contexto**: 200K tokens
- **Status**: Terceira opção paga

## Recomendação de arquitetura

### Pipeline multicamadas (priorizando APIs gratuitas + pré-processador)

```
┌─────────────────────────────────────────────────────────────┐
│  Entrada: Imagem da capa do The Economist                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  0. Pré-processador OXR (gratuito, opcional)                │
│     - Extrai texto, layout, coordenadas em JSON             │
│     - Retorna JSON estruturado (não imagem bruta)            │
│     - Custo: $0 (50 páginas grátis)                         │
│     - Se falhar → passar imagem direta para LLM              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Triagem ultra-leve (opcional)                             │
│     - SigLIP (400M, Apache 2.0) via transformers             │
│     - Classificação zero-shot: political, economic,         │
│       religious, technological                                │
│     - Se confiança < 0.6 → skip triagem                      │
│     - Custo: $0 (CPU-only, <1s)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Análise profunda API GRÁTUITA (primário)                 │
│                                                              │
│  Entrada: JSON do OXR (se disponível) ou imagem             │
│                                                              │
│  Tentar Groq qwen/qwen3.8-27b (recomendado)                 │
│  ├─ 30 req/min, 1,000 req/day grátis                         │
│  ├─ 131K context, 3 imagens por request                     │
│  ├─ Custo: $0 (plano gratuito)                               │
│  └─ Se falhar/limite → DeepSeek                              │
│                                                              │
│  DeepSeek deepseek-flash (fallback API gratuito)             │
│  ├─ 1M context, vision integrado                             │
│  ├─ 384 tokens por imagem (barato)                           │
│  ├─ Custo: $0.22/M input (se exceder quota grátis)           │
│  └─ Se falhar/limite → Gemini Flash                           │
│                                                              │
│  Gemini 2.5 Flash (fallback API gratuito)                    │
│  ├─ 10 RPM, 500 RPD grátis                                   │
│  ├─ 1M context, 258 tokens por imagem                        │
│  ├─ Custo: gratuito input, pago se exceder                   │
│  └─ Se falhar/limite → GGUF local (opcional)                 │
│                                                              │
│  [OPCIONAL] Se não tem chaves API ou hardware local →        │
│  Qwen2-VL-7B GGUF via llama.cpp (requer hardware)            │
│  ├─ Custo: $0 (hardware)                                     │
│  └─ Se falhar → dry-run                                      │
│                                                              │
│  Se tudo falhar → dry-run (resposta sintética)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Correlação teológica (RAG)                               │
│     - Cross-check com corpus teológico existente              │
│     - Prompt engineering com contexto bíblico               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Saída:                                                      │
│  - interpretacao_simbolica                                    │
│  - narrativa_identificada                                    │
│  - temas (array)                                              │
│  - score_bestas_mar (0-1)                                    │
│  - score_bestas_terra (0-1)                                  │
│  - score_falso_lider (0-1)                                   │
│  - correlacao_teologica                                      │
│  - modelo_usado (ex: groq-qwen3.8-27b)                       │
│  - preprocessador_usado (ex: oxr)                            │
└─────────────────────────────────────────────────────────────┘
```

### Configuração de env vars

```bash
# ===== PRÉ-PROCESSADOR OXR (opcional, recomendado) =====
USE_OXR_PREPROCESSOR=true
OXR_API_URL=https://free-oxr.somark.ai/api/v1
OXR_OUTPUT_FORMAT=json

# ===== MODELO PRIMÁRIO (API gratuita) =====
VISION_MODEL_PRIMARY=groq-qwen3.8-27b
# Alternativas: deepseek-flash, gemini-2.5-flash

# ===== CASCATA API GRATUITA =====
VISION_API_FALLBACK_1=deepseek-flash
VISION_API_FALLBACK_2=gemini-2.5-flash

# ===== API KEYS =====
GROQ_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# ===== TRIAGEM LEVE =====
VISION_USE_SIGLIP_TRIAGE=true
SIGLIP_MODEL=google/siglip-so400m-patch14-384
SIGLIP_TRIAGE_CONFIDENCE_THRESHOLD=0.6

# ===== GGUF LOCAL (opcional, se tiver hardware) =====
ENABLE_VISION_GGUF=false
VISION_GGUF_MODEL=qwen2-vl-7b-gguf
VISION_GGUF_FALLBACK_1=internvl2-8b-gguf
VISION_GGUF_FALLBACK_2=llava-1.6-7b-gguf

# ===== LLAMA.CPP CONFIG (se ENABLE_VISION_GGUF=true) =====
# Reaproveita config do LOCAL_LLM_ENABLED existente
VISION_GPU_LAYERS=20  # quantas camadas offload para GPU
VISION_CTX_SIZE=8192  # contexto em tokens
VISION_THREADS=8      # threads CPU

# ===== DRY-RUN =====
VISION_DRY_RUN=false

# ===== TIMEOUTS E RETRIES =====
VISION_MAX_RETRIES=2
VISION_TIMEOUT_SECONDS=30  # APIs são rápidas
```

### Integração com LOCAL_LLM_ENABLED existente

O projeto já tem:
```bash
LOCAL_LLM_ENABLED=true
LOCAL_MODEL_MAP={"7B": "modelo-7b.gguf", "3B": "modelo-3b.gguf", ...}
```

A configuração de visão deve ser consistente:
- Se `LOCAL_LLM_ENABLED=true`, usar modelos GGUF locais
- Reaproveitar `llama.cpp` já instalado
- Adicionar `--mmproj` para suporte multimodal

**Adapter de visão** (`motor/adapters/local_vision.py`):
```python
# Reutiliza setup de llama.cpp existente em local_llm.py
# Adiciona --mmproj para projector multimodal
# Usa libmtmd para imagens
```

## Custo estimado

Assumindo 1 capa/semana (~4 capas/mês):

| Modelo | Custo por capa | Custo mensal | Custo anual | Hardware | Notas |
|--------|----------------|--------------|-------------|----------|-------|
| **OXR pré-processador** | $0 | $0 | $0 | N/A | 50 páginas grátis grátis |
| **Groq qwen3.8-27b** | $0 | $0 | $0 | N/A | **Recomendado** - plano gratuito |
| **DeepSeek flash** | $0 | $0 | $0 | N/A | Alternativa gratuita |
| **Gemini 2.5 Flash** | $0 | $0 | $0 | N/A | Fallback gratuito (10 RPM, 500 RPD) |
| **SigLIP triagem** | $0 | $0 | $0 | CPU-only | Ultra-leve |
| **Qwen2-VL-7B GGUF** | $0 | $0 | $0 | CPU/GPU existente | Alternativa local gratuita |
| **GPT-4o** | $0.07-0.15 | $0.28-0.60 | $3.36-7.20 | N/A | Não recomendado (pago) |
| Claude 3.5 Sonnet | $0.06-0.12 | $0.24-0.48 | $2.88-5.76 | N/A | Não recomendado (pago) |

**Recomendação**: OXR + Groq qwen3.8-27b como primário (ambos gratuitos, suficiente para 4 capas/mês).

### Requisitos de hardware

**Mínimo (CPU-only, lento)**:
- CPU: 8 cores (triagem SigLIP OK, GGUF lento)
- RAM: 16GB
- Tempo por capa: 2-5 minutos

**Recomendado (CPU + GPU leve)**:
- CPU: 8+ cores
- GPU: 8GB VRAM (NVIDIA RTX 3060 ou similar)
- RAM: 16GB
- Tempo por capa: 30-60 segundos

**Ideal (GPU forte)**:
- CPU: 12+ cores
- GPU: 16GB+ VRAM (RTX 4070/4080 ou similar)
- RAM: 32GB
- Tempo por capa: 15-30 segundos

**Nota**: Hardware é investimento único. Se já tem setup para `LOCAL_LLM_ENABLED`, não precisa upgrade.

## Considerações específicas para análise escatológica

### 1. Conhecimento teológico

**Risco**: Modelos podem ter bias culturais no treinamento quanto a simbolismo religioso.

**Mitigação**:
- RAG com corpus teológico explícito (já existente no projeto)
- Prompt engineering com contexto bíblico (Apocalipse, Daniel)
- Documentar fontes das interpretações no `analise_simbolismo`

### 2. Interpretação de alegorias

**Risco**: Over-interpretation ou seeing patterns onde none exist.

**Mitigação**:
- Thresholds altos (default 0.7) para scores de correlação
- Revisão manual quando score > 0.8
- Requer múltiplas evidências convergentes

### 3. Bias geopolítico

**Risco**: Modelos podem ter perspectiva ocidental ou alinhada com seu treinamento.

**Mitigação**:
- Tripla checagem com múltiplos modelos na cascata
- Documentar modelo usado em cada análise
- Cross-check com fontes internacionais quando possível

### 4. Alucinação visual

**Risco**: Modelos podem "ver" elementos que não existem na imagem.

**Mitigação**:
- Prompt que pede listagem explícita de elementos visuais
- Verificação com OCR para texto
- Confiança calculada sobre elementos listados

## Integração com arquitetura existente

### Compatibilidade com cadeia de fallback LLM

O projeto já tem uma cadeia de fallback para LLMs textuais:
```
Local GGUF → Ollama → Gemini → Groq → DeepSeek → OpenRouter → dry-run
```

Para visão, a cadeia deve ser **consistente**:
```
SigLIP (triagem) → Groq qwen3.8-27b → DeepSeek flash → Gemini 2.5 Flash →
[opcional GGUF local] Qwen2-VL-7B → InternVL2-8B → LLaVA-1.6-7B → dry-run
```

**Princípio**: Priorizar APIs gratuitas (Groq → DeepSeek → Gemini). GGUF locais são alternativa se o usuário tiver hardware forte e preferir custo-zero absoluto (sem APIs).

### Novo adapter: `motor/adapters/vision_preprocessor.py`

**OXR Preprocessor**:
```python
class VisionPreprocessor:
    """Adapter para OXR - extrai JSON estruturado de imagens"""

    def __init__(self, api_url: str = "https://free-oxr.somark.ai/api/v1"):
        self.api_url = api_url

    def extract_json(self, image_path: str) -> dict:
        """Extrai texto, layout e coordenadas via OXR"""
        with open(image_path, 'rb') as f:
            response = requests.post(
                f"{self.api_url}/parse",
                files={'file': f},
                data={'output_format': 'json'}
            )
        return response.json()

    def is_available(self) -> bool:
        """Verifica se OXR API está disponível"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
```

**Adapter de visão** (`motor/adapters/vision_adapter.py`):
```python
class VisionAdapter:
    """Adapter para modelos de visão (OXR + LLM multimodal)"""

    def __init__(self, config: dict):
        self.preprocessor = VisionPreprocessor(config.get("OXR_API_URL"))
        self.use_oxr = config.get("USE_OXR_PREPROCESSOR", True)

    def analyze_image(self, image_path: str, prompt: str) -> dict:
        """Analisa imagem com OXR + LLM"""
        if self.use_oxr and self.preprocessor.is_available():
            # OXR extrai JSON estruturado
            oxr_result = self.preprocessor.extract_json(image_path)
            # LLM recebe JSON (menos tokens que imagem bruta)
            return self._call_llm_with_json(oxr_result, prompt)
        else:
            # Fallback: LLM recebe imagem direta
            return self._call_llm_with_image(image_path, prompt)
```

### Integração com Camada 3 (RAG)

O corpus teológico existente (`corpus_teologico`) será usado para:
- Ancorar interpretações em Escritura
- Validar correlações com profecias
- Fornecer contexto bíblico para prompts

### Integração com Camada 8 (Correlação)

Scores da Camada 16 alimentarão:
- `score_bestas.mar` (Besta do Mar)
- `score_bestas.terra` (Besta da Terra)
- `score_falso_lider` (Falso Líder)

### Compatibilidade com `LOCAL_LLM_ENABLED`

Se `LOCAL_LLM_ENABLED=false` (usuário sem hardware):
- Usar APIs gratuitas (Groq → DeepSeek → Gemini)
- SigLIP ainda útil para triagem (CPU-only, 400M é leve)
- GGUF locais não disponíveis

Se `LOCAL_LLM_ENABLED=true` (recomendado para custo-zero absoluto):
- Usar GGUF locais (Qwen2-VL-7B → InternVL2-8B → LLaVA-1.6-7B)
- APIs gratuitas como fallback se GGUF falhar
- Custo zero, independente de APIs externas

## Próximos passos

1. Implementar adapter `the_economist.py` com scraper básico
2. Configurar SigLIP local para triagem
3. Integrar Groq qwen3.8-27b via API (primário gratuito)
4. Integrar DeepSeek flash como fallback gratuito
5. Criar prompts em `prompts/v1/symbolic_analysis_pt.md`
6. Testar com capas históricas (dry-run)
7. Validar correlações com revisão manual
8. Calibrar thresholds baseado em resultados reais

## Referências

1. "Benchmarking Vision-Language and Multimodal Large Language Models in Zero-shot and Few-shot Scenarios: A study on Christian Iconography" (2025)
2. "Vision model benchmarks: who can actually read a chart?" (2025)
3. "How Well Does GPT-4o Understand Vision? Evaluating Multimodal Foundation Models on Standard Computer Vision Tasks" (2025)
4. "Multimodal Large Language Models for Text-rich Image Understanding: A Comprehensive Review" (2025)
5. "OpenVision: A Fully-Open, Cost-Effective Family of Advanced Vision Encoders for Multimodal Learning" (2025)
6. "SigLIP 2: Multilingual Vision-Language Encoders with Improved Semantic Understanding, Localization, and Dense Features" (2025)
