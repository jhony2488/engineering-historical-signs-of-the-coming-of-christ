# Requisitos de Contribuição — Backend

Obrigado por contribuir com o motor de IA. Este documento define o que esperamos de todo colaborador antes de abrir ou revisar um Pull Request.

## Princípios do projeto

- **Análise, não adivinhação de datas** — o sistema mede convergência de sinais, não prevê calendários.
- **Append-only** — resultados escatológicos nunca são sobrescritos; correções usam `revert-day` ou novo registro.
- **Schema primeiro** — todo JSON persistido deve passar validação em `motor/schemas/`.
- **Escritura como âncora** — camadas hermenêuticas devem consultar o corpus teológico (RAG) antes de concluir.
- **Custo zero no início** — priorize Groq free tier, GitHub Actions e Supabase free; evite infra 24/7 sem necessidade.

## Ambiente de desenvolvimento

### Requisitos mínimos

| Ferramenta | Versão |
|------------|--------|
| Python | 3.11+ |
| pip / venv | atual |
| Git | 2.x |
| Docker (opcional) | para Redis local |

### Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -e ".[ml,dev]"
cp .env.example .env            # ou copy no Windows
```

Configure pelo menos:

```env
LLM_DRY_RUN=true                # para desenvolvimento sem chaves
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Comandos obrigatórios antes do PR

```bash
python -m motor.cli validate-schemas
python -m motor.cli run-daily --dry-run
pytest -v
ruff check motor api tests      # se ruff instalado
```

Todos devem passar sem erros.

## Escopo de mudanças

### O que pode ser alterado livremente

- `motor/pipeline/` — camadas de processamento
- `motor/domain/` — regras de fase, energias, bestas
- `motor/math/` — Bayes, HMM, MCDA
- `motor/schemas/` — com versionamento (ver abaixo)
- `tests/` — cobertura de comportamento
- `docs/` — documentação

### O que exige discussão prévia (issue)

- Mudança de contrato JSON publicado no dashboard (`resultado_escatologico.schema.json`)
- Alteração de pesos MCDA ou thresholds de fase
- Novas tabelas ou breaking changes em migrations Supabase
- Substituição de provedor LLM primário
- Remoção de camada do pipeline

## Padrões de código

### Python

- Linha máxima: **100 caracteres** (ver `pyproject.toml`)
- Tipagem em funções públicas (`def foo(x: str) -> dict[str, Any]`)
- Logs via `structlog` — nunca `print()` em código de produção
- Secrets **nunca** no código; use `.env` e GitHub Secrets
- Imports: stdlib → terceiros → `motor` / `api`

### Nomenclatura

| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Módulos | `snake_case` | `false_leader.py` |
| Classes | `PascalCase` | `DailyOrchestrator` |
| Constantes | `UPPER_SNAKE` | `WEIGHTS_MAR` |
| Tabelas DB | `snake_case` | `resultados_escatologicos` |
| Fases | `FASE_I` … `FASE_IV` | enum fixo |

### Commits

Use mensagens em português ou inglês, no imperativo, focando o **porquê**:

```
feat(pipeline): adiciona ingestão ACLED com API key opcional
fix(correlation): corrige threshold de falso líder quando macro=0
docs: atualiza contrato da API v1
test(bayes): cobre evidência fraca sem mudança de prior
```

Prefixos sugeridos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

## Pull Requests

### Checklist do autor

- [ ] Branch criada a partir da `main` (ou `master`) atualizada
- [ ] Escopo focado — um PR por feature ou correção
- [ ] Testes adicionados ou atualizados para o comportamento novo
- [ ] `validate-schemas` e `pytest` passando
- [ ] `.env.example` atualizado se novas variáveis foram introduzidas
- [ ] `docs/` atualizado se comportamento público mudou
- [ ] Nenhum secret, token ou credencial no diff
- [ ] Migrations SQL em `supabase/migrations/` com timestamp no nome

### Título e descrição

**Título:** resumo em uma linha (`feat: ranking com tendência 24h calculada`)

**Descrição mínima:**

```markdown
## O que mudou
- ...

## Por quê
- ...

## Como testar
1. ...
2. pytest tests/test_xxx.py -v

## Screenshots / logs (se aplicável)
```

### Revisão

- Pelo menos **1 aprovação** antes do merge
- CI verde (GitHub Actions)
- Revisor verifica: schema, segurança, idempotência do batch diário

## JSON Schema e versionamento

Todo payload em `json_analise_ia` deve incluir `schema_version`.

Ao alterar campos obrigatórios:

1. Incremente `schema_version` (ex: `1.0.0` → `1.1.0`)
2. Atualize o `.schema.json` correspondente
3. Documente em [schemas-json.md](schemas-json.md)
4. Garanta retrocompatibilidade de leitura no dashboard ou abra issue de migração

## Segurança

- **Não** commitar `.env`
- **Não** logar `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ADMIN_API_KEY`
- Endpoints admin exigem header `X-Admin-Key`
- Rate limit ativo na API pública (`slowapi`)
- Service role do Supabase apenas no motor batch — nunca no frontend

## Testes

| Tipo | Quando escrever |
|------|-----------------|
| Unitário | funções em `motor/math/`, `motor/domain/` |
| Integração | pipeline com `LLM_DRY_RUN=true` |
| API | endpoints em `api/main.py` via `TestClient` |

Exemplo mínimo:

```python
@pytest.mark.asyncio
async def test_minha_feature():
    result = await minha_funcao()
    assert result["status"] == "complete"
```

## Reportar bugs

Inclua:

1. Comando executado
2. Versão do Python (`python --version`)
3. Trecho do log (sem secrets)
4. Data de referência do batch, se aplicável
5. Se usou `--dry-run` ou chaves reais

## Código de conduta

- Respeito mútuo em issues e reviews
- Críticas focadas no código, não na pessoa
- O projeto trata temas teológicos com rigor analítico — evite debates doutrinários em PRs técnicos; use issues dedicadas quando necessário

## Dúvidas

Abra uma issue com a tag `question` ou consulte:

- [arquitetura.md](arquitetura.md)
- [setup-supabase.md](setup-supabase.md)
- [api-contrato.md](api-contrato.md)
