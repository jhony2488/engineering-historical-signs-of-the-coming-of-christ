# Como contribuir com o Engenharia de Sinais Históricos da vinda de Cristo

[Read this guide in English](CONTRIBUTING.en.md).

Obrigado por querer ajudar a construir o projeto. Antes de abrir uma issue ou pull request, leia as regras abaixo.

## Antes de começar

1. Verifique se já existe uma issue aberta para o que você quer fazer.
2. Para mudanças grandes, abra uma issue primeiro para discutir a proposta.
3. Sempre escreva em português ou inglês, de forma clara e objetiva.

## Regras de branches

- `master` é a branch principal e deve estar sempre passando nos testes.
- Crie branches a partir da `master`.
- Use nomes descritivos no padrão `tipo/descricao-resumida`:
  - `feat/ranking-tendencia-24h`
  - `fix/cache-historico`
  - `docs/contrato-api`
  - `refactor/correlation-engine`

## Commits

- Mensagens de commit devem ser claras e explicar o "porquê" da mudança.
- **Todos os commits devem ser escritos apenas em inglês**, no imperativo, com um dos prefixos abaixo:
  - `feat:` — nova funcionalidade — `feat: add OpenRouter fallback`
  - `bug:` — correção de bug — `bug: fix false leader threshold when macro is zero`
  - `doc:` — documentação — `doc: update API contract guide`
  - `chore:` — manutenção e configuração — `chore: update dependencies`
- **Todos os commits devem ser assinados com SSH**. O CI verifica as
  assinaturas de cada commit enviado em pull requests. Veja o
  [guia oficial do GitHub](https://docs.github.com/pt/authentication/managing-commit-signature-verification/signing-commits).
  Para impedir merges quando a verificação falhar, configure como obrigatória
  a checagem `Verify SSH commit signatures` nas regras de proteção da branch.

## Padrão de código

O projeto é um monorepo com duas stacks:

| Pasta | Stack | Linter/Formatador |
|-------|-------|-------------------|
| `front-end/` | TypeScript + Next.js | ESLint + Prettier |
| `backend/` | Python 3.11+ | Ruff (lint + format) |

### Acesso a dados do front-end

O navegador deve buscar dados exclusivamente pelas rotas `/api/db/*` do
Next.js. Esses route handlers consultam o Supabase via Prisma no servidor
Next.js. Não adicione acesso direto ao banco no navegador nem um fluxo
alternativo do dashboard via FastAPI. `DATABASE_URL` e `DIRECT_URL` são
configurações server-side e nunca devem ser expostas como `NEXT_PUBLIC_*`.

- Formate o código antes de abrir o PR:
  ```bash
  npm run format --prefix front-end   # Prettier
  npm run format --prefix backend     # Ruff format
  ```
- Rode a checagem de formatação, lint e testes:
  ```bash
  npm run format:check --prefix front-end
  npm run format:check --prefix backend
  npm run lint    # raiz: roda ESLint (front) + Ruff (back)
  npm run test    # raiz: roda Vitest (front) + pytest (back)
  ```
- **Git hooks (Husky)**: `pre-commit` roda `npm run lint` e `pre-push` roda
  `npm run test` — commits/pushes que falham na checagem são bloqueados.
  Os hooks são instalados pelo `npm install` na raiz (script `prepare`);
  se não forem ativados, rode uma vez:
  ```bash
  npx husky
  ```
- **`ignore-scripts` no front-end**: o `front-end/.npmrc` usa
  `ignore-scripts=true`, então o `postinstall` do Prisma não roda
  automaticamente. Após `npm install` ou `npm ci` em `front-end/`, execute:
  ```bash
  npm run db:generate --prefix front-end
  ```
- Comentários de ignore (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  `@ts-nocheck`, e os equivalentes Python `# noqa`, `# type: ignore`) só são
  aceitáveis em arquivos de teste (`__tests__/`, `tests/`, helpers de teste).
  Em código de produção, corrija a causa do problema em vez de silenciar o
  lint/typecheck.
- Mantenha componentes pequenos e com responsabilidade única.
- Prefira funções e hooks a classes quando possível.
- Nomeie arquivos e pastas em inglês para manter consistência com o ecossistema
  (ex.: `correlationEngine.ts`, `false_leader.py`).

## Testes

- **Toda alteração deve tocar testes**: mudanças em comportamento existente
  devem atualizar os testes correspondentes; novas funcionalidades devem
  adicionar testes novos.
- Backend: testes usam **pytest** (+ `pytest-asyncio`) em `backend/tests/`;
  testes de integração do pipeline rodam com `LLM_DRY_RUN=true`.
- Front-end: testes usam **Vitest** + **React Testing Library** em
  `src/**/__tests__/`.
- Não envie testes dependentes de rede, GPU ou chaves reais de LLM — use
  `LLM_DRY_RUN=true` no motor e `NEXT_PUBLIC_USE_MOCK=true` no dashboard.

## Pull Requests

1. Sua branch deve estar atualizada com a `master`.
2. O PR deve descrever o que foi alterado e por quê.
3. Marque pelo menos um revisor.
4. Lint, testes e build devem passar localmente. O CI de PR
   (`.github/workflows/ci-tests.yml`) verifica as assinaturas SSH e executa os
   testes de front-end e back-end; os hooks Husky também verificam os testes
   localmente.
5. **Cada PR deve alterar no máximo 20 arquivos.** PRs acima desse limite só
   são aceitos com uma justificativa muito válida descrita no corpo do PR;
   quando possível, divida em entregas menores.

## Regras específicas de cada stack

Este arquivo cobre as regras globais. Cada parte do monorepo tem requisitos
próprios — leia-os antes de contribuir:

- **Backend / motor de IA**: [backend/docs/REQUISITOS_CONTRIBUICAO.md](backend/docs/REQUISITOS_CONTRIBUICAO.md)
- **Front-end / dashboard**: [front-end/docs/REQUISITOS_CONTRIBUICAO.md](front-end/docs/REQUISITOS_CONTRIBUICAO.md)

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [AGENTS.md](AGENTS.md) | Regras e contexto para agentes de IA |
| [CLOUD.md](CLOUD.md) | Setup para agentes em nuvem e infraestrutura |
| [backend/docs/](backend/docs/) | Arquitetura, contrato de API, schemas, PostgreSQL, Actions |
| [front-end/README.md](front-end/README.md) | Visão geral do dashboard |
| [backend/README.md](backend/README.md) | Visão geral do motor |

## Segurança

- Nunca commite chaves de API, tokens, arquivos `.env`/`.env.local` ou dados
  pessoais.
- Nunca commite pesos/artefatos de modelos (`backend/models_cache/`,
  `*.gguf`, `*.pt`, `*.joblib`) — eles são baixados/treinados localmente
  (`scripts/download_models.py`, comandos `train-*`) ou no workflow.
- Prompts novos seguem a convenção `prompts/v1/` (PT) + `prompts/v2_en/` (EN),
  selecionados por `PROMPTS_LANG`; markers `{{...}}`, slugs e enums do JSON
  de saída são parte do contrato — não traduza valores de schema.
- `DATABASE_URL`, `GROQ_API_KEY` e `ADMIN_API_KEY` são secrets server-side;
  nunca os exponha no browser ou em variáveis `NEXT_PUBLIC_*`.
- Se encontrar uma vulnerabilidade, avise em particular antes de abrir uma
  issue pública.
- Use variáveis de ambiente para credenciais em ambiente de desenvolvimento.

## Licença

Ao contribuir, você concorda que seu código será licenciado sob a
[GPL-3.0](LICENSE), a mesma licença do projeto.
