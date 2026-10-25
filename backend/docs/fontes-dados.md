# Fontes de dados — Camada 1 (Ingestão)

Implementação: [`motor/pipeline/ingestion/collector.py`](../motor/pipeline/ingestion/collector.py)
(`IngestionCollector.collect_all`) e
[`extended_sources.py`](../motor/pipeline/ingestion/extended_sources.py).

Ordem de coleta por run: **RSS → GDELT → ACLED → PDFs → OCR → API.Bible →
Reddit → Google Trends → WEF/BIS**. Dedup por `content_hash` na persistência
+ dedup semântico por embedding (`SEMANTIC_DEDUP_*`).

## RSS — `config/feeds.yaml`

| Feed | Categoria |
|------|-----------|
| Reuters World | `geopolitica` |
| BBC World | `geopolitica` |
| Al Jazeera | `oriente_medio` |
| Google News (UFO/UAP disclosure) | `narrativa_extraterrestre` |
| Google News (apocalyptic deception) | `engano_apocaliptico` |

Para adicionar fontes: incluir entradas `{name, url, categoria}` em
`feeds.yaml` (caminho configurável via `FEEDS_CONFIG_PATH`).

## GDELT Project

Monitoramento global de notícias (100+ idiomas) via API v2 `doc/doc`.
Themes consultados (também em `feeds.yaml`):

```
MIDDLE_EAST, RELIGION, ECON_CURRENCY, CYBER_ATTACK, UFO, DISINFO
```

- Usa corpo/snippet quando a URL está disponível.
- **Fallback sintético** só se `ALLOW_GDELT_SYNTHETIC_FALLBACK=true`
  (default `true`) — marcado como `fonte: gdelt:fallback`.

## ACLED

API de conflitos armados (`acleddata.com`). Requer
`ACLED_EMAIL` + `ACLED_PASSWORD` (registro em acleddata.com).
Autenticação via sessão (login com email e senha).
Sem credenciais ou em caso de falha → seed local
`config/acled_seed.json` (`fonte: acled:seed`).

## PDFs e OCR

- PDFs de diretório local — `collect_pdfs_from_dir()`
  (`extract_text_from_pdf`).
- Imagens em `OCR_IMAGES_DIR` — `extract_text_from_image` (`fonte:
  ocr:image`).

## API.Bible

Corpus teológico expandido (Escrituras como âncora de validação).
Requer `API_BIBLE_KEY` + `API_BIBLE_ID`. O seed base do corpus teológico é
`config/corpus_teologico_seed.json` (persistido em `corpus_teologico` na
Camada 3).

## Dados micro (opcionais, desabilitados por padrão)

| Fonte | Flag | Uso |
|-------|------|-----|
| Reddit | `REDDIT_ENABLED` + `REDDIT_USER_AGENT` | Pulso cultural/comportamental |
| Google Trends | `GOOGLE_TRENDS_ENABLED` | Termos de busca espiritual/ceticismo |

## WEF / BIS (CBDC)

Feeds RSS fixos em `extended_sources.py`: Fórum Econômico Mundial e BIS —
monitoramento de moedas digitais de bancos centrais e governança global
(`fonte: rss:wef_cbdc`).

## Joshua Project

Dados de povos não alcançados — **não coletados pelo collector**; o sync
acontece no BFF do front-end (`GET /api/joshua/sync`, protegido por
`JOSHUA_SYNC_TOKEN`) gravando em `joshua_project_data`. O motor consome
essas linhas na análise missiológica (`joshua_analysis.py`), que enriquece a
Camada 10 por país.

## The Economist — Análise de simbolismo (proposta)

Fonte adicional para análise de simbolismo visual e narrativas ocultas em capas e artigos do The Economist.

**Status**: Proposta — não implementado

**Arquitetura proposta**:
- Configuração em `feeds.yaml`:
  ```yaml
  the_economist:
    name: "The Economist"
    type: "custom_scraper"
    url: "https://www.economist.com"
    scrape_cover: true  # baixar imagem da capa
    scrape_articles: true
    enabled: true
  ```
- Adapter: `backend/motor/adapters/the_economist.py`
  - Scraper para capas (imagem + manchete principal)
  - Scraper para artigos selecionados
  - Extração de metadados (título, data, subtítulo)
- OCR para imagens de capa (se necessário)
- Integração com Camada 16 (Symbolic Analysis)

**Objetivo**: Interpretar simbolismo visual em contexto escatológico cristão, identificar narrativas ocultas/implícitas e correlacionar com corpus teológico (RAG).

## Arquivos de seed (`backend/config/`)

| Arquivo | Alimenta |
|---------|----------|
| `feeds.yaml` | RSS + themes GDELT |
| `acled_seed.json` | Fallback ACLED |
| `candidatos_seed.json` | Rankings MCDA Top-10 |
| `corpus_teologico_seed.json` | RAG teológico (Camada 3) |
| `countries_focus.json` | Países da Camada 10/ABM |
| `historical_echoes_seed.json` | Ecos históricos (Camada 11) |
| `profecias_baseline_seed.json` | Baseline de profecias (Camada 0) |
| `classifier_prototypes.json` | Protótipos zero-shot dos classificadores locais — editar descrições recalibra sem treino |
