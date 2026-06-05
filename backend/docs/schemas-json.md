# JSON Schemas

Schemas em `motor/schemas/`. Validação obrigatória antes de persistir.

## Arquivos

| Schema | Uso |
|--------|-----|
| `evento_estruturado.schema.json` | Saída Camada 4 (Llama) |
| `resultado_correlacao.schema.json` | Saída Camada 8 |
| `resultado_escatologico.schema.json` | Payload final diário |
| `ranking_candidato.schema.json` | Itens Top-10 |

## Validação

```bash
python -m motor.cli validate-schemas
```

Programático:

```python
from motor.schemas.validator import get_validator

v = get_validator()
v.validate("resultado_escatologico", payload)
```

## Versionamento

Campo `schema_version` no payload final. Semver:

- **PATCH** — campos opcionais novos
- **MINOR** — campos obrigatórios novos com default retrocompatível
- **MAJOR** — remoção ou mudança de tipo de campo obrigatório

Rejeição de schema → registro em `audit_log` com `decisao: error`; fase **não** publicada.

## Exemplo mínimo válido (`resultado_escatologico`)

```json
{
  "schema_version": "1.0.0",
  "data_referencia": "2026-06-04",
  "fase_atual": "FASE_II",
  "probabilidade_fase": 0.62,
  "indice_global": 0.58,
  "confianca": 0.71,
  "correlacao": {},
  "eventos_analisados": [],
  "metricas": {},
  "status": "complete"
}
```
