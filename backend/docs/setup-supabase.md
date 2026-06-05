# Setup Supabase

## 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Escolha região próxima ao público-alvo (ex: South America se disponível)
3. Anote `Project URL` e `service_role` key (Settings → API)

## 2. Executar migration

No **SQL Editor**, execute o arquivo:

```
backend/supabase/migrations/20260604000001_init_schema.sql
```

Isso cria:

- Extensão `vector` (pgvector)
- Tabelas das 9 camadas
- Índices BRIN, GIN e HNSW
- RLS read-only para `anon`
- Seeds de candidatos e parâmetros HMM

## 3. Variáveis de ambiente

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...          # para dashboard Next.js
```

## 4. Verificar

```bash
python -m motor.cli run-daily --dry-run
```

Com chaves reais (sem `--dry-run`), confira no Table Editor:

- `resultados_escatologicos` — 1 linha por dia
- `audit_log` — logs por camada LLM
- `ranking_probabilistico` — Top-10 mar e terra

## 5. GitHub Actions

Adicione os secrets no repositório:

| Secret | Valor |
|--------|-------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `GROQ_API_KEY` | chave Groq |
| `OPENROUTER_API_KEY` | fallback (opcional mas recomendado) |

Variável opcional: `LLM_DRY_RUN=true` para CI sem chaves LLM.
