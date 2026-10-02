from __future__ import annotations

import structlog

logger = structlog.get_logger()


class ColdStorageArchiver:
    """
    Retenção de longo prazo: apenas Postgres (Supabase).

    Não exporta arquivos locais nem S3 — dados históricos permanecem nas tabelas
    `resultados_escatologicos`, `arquivo_profetico`, `snapshots_periodo`, etc.
    """

    def archive_before(self, cutoff=None) -> dict:
        logger.info(
            "cold_storage_skipped",
            reason="persistencia_somente_postgres",
            cutoff=str(cutoff) if cutoff else None,
        )
        return {
            "cutoff": str(cutoff) if cutoff else None,
            "archived_count": 0,
            "json_path": None,
            "parquet_path": None,
            "policy": "postgres_only",
            "message": (
                "Cold storage em arquivo/S3 desativado. "
                "Histórico permanece no Supabase PostgreSQL."
            ),
        }
