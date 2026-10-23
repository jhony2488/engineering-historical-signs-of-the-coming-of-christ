# Contributing to Engineering Historical Signs of the Coming of Christ

[Leia este guia em português](CONTRIBUTING.md).

Thank you for helping build this project. Before opening an issue or pull
request, please read the guidelines below.

## Before you start

1. Check whether an issue already exists for the change you have in mind.
2. For large changes, open an issue first to discuss the proposal.
3. Write clearly and concisely in Portuguese or English.

## Branches

- `master` is the main branch and should always pass the tests.
- Create branches from `master`.
- Use descriptive names in the `type/short-description` format:
  - `feat/ranking-trend-24h`
  - `fix/history-cache`
  - `docs/api-contract`
  - `refactor/correlation-engine`

## Commits

- Commit messages must be clear and explain why the change is needed.
- **Write all commit messages in English**, using the imperative mood and one
  of these prefixes:
  - `feat:` — new feature — `feat: add OpenRouter fallback`
  - `bug:` — bug fix — `bug: fix false leader threshold when macro is zero`
  - `doc:` — documentation — `doc: update API contract guide`
  - `chore:` — maintenance and configuration — `chore: update dependencies`
- **All commits must be SSH-signed.** CI verifies each commit submitted in a
  pull request. See GitHub's
  [official guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).
  To block merges when verification fails, mark `Verify SSH commit signatures`
  as a required status check in the branch protection rules.

## Code standards

This monorepo has two technology stacks:

| Directory | Stack | Linter/formatter |
|-----------|-------|------------------|
| `front-end/` | TypeScript + Next.js | ESLint + Prettier |
| `backend/` | Python 3.11+ | Ruff (lint + format) |

### Front-end data access

The browser must fetch data exclusively through the Next.js `/api/db/*` routes.
These route handlers query Supabase through Prisma on the Next.js server. Do not
add direct database access from the browser or an alternative FastAPI data
source for the dashboard. `DATABASE_URL` and `DIRECT_URL` are server-side
configuration and must never be exposed as `NEXT_PUBLIC_*`.

- Format code before opening a pull request:
  ```bash
  npm run format --prefix front-end   # Prettier
  npm run format --prefix backend     # Ruff format
  ```
- Run formatting checks, lint, and tests:
  ```bash
  npm run format:check --prefix front-end
  npm run format:check --prefix backend
  npm run lint    # root: runs ESLint (front-end) + Ruff (back-end)
  npm run test    # root: runs Vitest (front-end) + pytest (back-end)
  ```
- **Git hooks (Husky):** `pre-commit` runs `npm run lint` and `pre-push` runs
  `npm run test`; commits or pushes that fail these checks are blocked. The
  hooks are installed by running `npm install` at the repository root (the
  `prepare` script). If they are not enabled, run this once:
  ```bash
  npx husky
  ```
- **`ignore-scripts` in the front-end:** `front-end/.npmrc` sets
  `ignore-scripts=true`, so Prisma's `postinstall` does not run automatically.
  After running `npm install` or `npm ci` in `front-end/`, run:
  ```bash
  npm run db:generate --prefix front-end
  ```
- Suppression comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  `@ts-nocheck`, and Python equivalents such as `# noqa` and `# type: ignore`)
  are only allowed in test files (`__tests__/`, `tests/`, and test helpers).
  Fix the underlying issue in production code instead of suppressing lint or
  type-checking diagnostics.
- Keep components small and focused on a single responsibility.
- Prefer functions and hooks over classes when possible.
- Use English for file and directory names to stay consistent with the
  ecosystem (for example, `correlationEngine.ts`, `false_leader.py`).

## Tests

- **Every change must include relevant test updates:** changes to existing
  behavior should update the corresponding tests, and new features should add
  new tests.
- Back-end tests use **pytest** (+ `pytest-asyncio`) in `backend/tests/`;
  pipeline integration tests run with `LLM_DRY_RUN=true`.
- Front-end tests use **Vitest** + **React Testing Library** in
  `src/**/__tests__/`.
- Do not add tests that depend on the network, a GPU, or real LLM API keys. Use
  `LLM_DRY_RUN=true` for the engine and `NEXT_PUBLIC_USE_MOCK=true` for the
  dashboard.

## Pull requests

1. Make sure your branch is up to date with `master`.
2. Describe what changed and why in the pull request.
3. Request at least one reviewer.
4. Lint, tests, and build must pass locally. Pull request CI
   (`.github/workflows/ci-tests.yml`) verifies SSH signatures and runs the
   front-end and back-end tests; Husky hooks also run the tests locally.
5. **Each pull request should change no more than 20 files.** Larger pull
   requests require a strong justification in their description; split the
   work into smaller pull requests when possible.

## Stack-specific requirements

This guide covers repository-wide rules. Each part of the monorepo has its own
requirements; read the relevant guide before contributing:

- **Back-end / AI engine:**
  [backend/docs/REQUISITOS_CONTRIBUICAO.md](backend/docs/REQUISITOS_CONTRIBUICAO.md)
- **Front-end / dashboard:**
  [front-end/docs/REQUISITOS_CONTRIBUICAO.md](front-end/docs/REQUISITOS_CONTRIBUICAO.md)

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](AGENTS.md) | Context and rules for AI agents |
| [CLOUD.md](CLOUD.md) | Cloud agent setup and infrastructure (Supabase, Actions, deployment) |
| [backend/docs/](backend/docs/) | Architecture, API contract, schemas, PostgreSQL, and Actions |
| [front-end/README.md](front-end/README.md) | Dashboard overview |
| [backend/README.md](backend/README.md) | Engine overview |

## Security

- Never commit API keys, tokens, `.env`/`.env.local` files, or personal data.
- Never commit model weights or artifacts (`backend/models_cache/`, `*.gguf`,
  `*.pt`, `*.joblib`). They are downloaded or trained locally
  (`scripts/download_models.py`, `train-*` commands) or in the workflow.
- New prompts follow the `prompts/v1/` (Portuguese) + `prompts/v2_en/`
  (English) convention and are selected by `PROMPTS_LANG`. Markers `{{...}}`,
  slugs, and JSON output schema enums are part of the contract; do not
  translate schema values.
- `DATABASE_URL`, `GROQ_API_KEY`, and `ADMIN_API_KEY` are server-side secrets;
  never expose them in the browser or through `NEXT_PUBLIC_*` variables.
- If you find a vulnerability, report it privately before opening a public
  issue.
- Use environment variables for credentials in development.

## License

By contributing, you agree that your code will be licensed under the same
[GPL-3.0](LICENSE) license as the project.
