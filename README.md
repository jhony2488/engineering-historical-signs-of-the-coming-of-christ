# Engenharia de Sinais Históricos da vinda de Cristo

Sistema de análise escatológica baseado em processamento batch de sinais históricos.

## Estrutura do repositório

| Pasta | Descrição |
|-------|-----------|
| [`backend/`](backend/) | Motor de IA Python, FastAPI, migrations Supabase, testes e workflows |
| [`front-end/`](front-end/) | Dashboard Next.js — painel escatológico, rankings e histórico |

## Início rápido

### Backend (motor)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -e ".[ml,dev]"
cp .env.example .env     # configure suas chaves
python -m motor.cli validate-schemas
python -m motor.cli run-daily --dry-run
uvicorn api.main:app --reload
```

### Front-end (dashboard)

```bash
cd front-end
npm install
cp .env.example .env.local
npm run dev
```

- Documentação backend: [backend/docs/](backend/docs/)
- Dashboard: [front-end/README.md](front-end/README.md)
- Contribuição backend: [backend/docs/REQUISITOS_CONTRIBUICAO.md](backend/docs/REQUISITOS_CONTRIBUICAO.md)
- Contribuição front-end: [front-end/docs/REQUISITOS_CONTRIBUICAO.md](front-end/docs/REQUISITOS_CONTRIBUICAO.md)
- Setup rápido: [backend/README.md](backend/README.md)
