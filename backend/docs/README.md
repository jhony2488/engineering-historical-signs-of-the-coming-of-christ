# Documentação — Backend / Motor de IA

Índice da documentação técnica do motor Python.

| Documento | Descrição |
|-----------|-----------|
| [REQUISITOS_CONTRIBUICAO.md](REQUISITOS_CONTRIBUICAO.md) | Requisitos para contribuir com código, PRs e revisões |
| [arquitetura.md](arquitetura.md) | Visão das 9 camadas, motores Nível 1–3 e fluxo batch |
| [camadas.md](camadas.md) | Referência detalhada camada → módulo → config → saída |
| [cli.md](cli.md) | Referência dos comandos `python -m motor.cli` |
| [api-contrato.md](api-contrato.md) | Contrato REST completo (público + admin) |
| [fontes-dados.md](fontes-dados.md) | Fontes da ingestão: RSS, GDELT, ACLED, API.Bible, Joshua |
| [variaveis-ambiente.md](variaveis-ambiente.md) | Referência de todas as env vars do motor |
| [setup-supabase.md](setup-supabase.md) | Criação do projeto Supabase e migrations |
| [github-actions.md](github-actions.md) | Workflows, secrets e execução agendada |
| [schemas-json.md](schemas-json.md) | Contratos JSON Schema e versionamento |
| [model-providers.md](model-providers.md) | Provedores LLM (Groq, OpenRouter, Ollama) |

## Leitura recomendada

1. [REQUISITOS_CONTRIBUICAO.md](REQUISITOS_CONTRIBUICAO.md) — antes de abrir um PR
2. [setup-supabase.md](setup-supabase.md) — para rodar o motor localmente
3. [arquitetura.md](arquitetura.md) + [camadas.md](camadas.md) — para entender o pipeline
4. [api-contrato.md](api-contrato.md) — para consumir dados no dashboard
