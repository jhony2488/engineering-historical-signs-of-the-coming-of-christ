# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY motor ./motor
COPY api ./api
COPY config ./config

# --- API / batch (produção local) ---
FROM base AS runtime
RUN pip install --no-cache-dir -e .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# --- testes (pytest) ---
FROM base AS test
COPY tests ./tests
RUN pip install --no-cache-dir -e ".[dev]"
CMD ["pytest", "tests/", "-q", "--tb=short"]
