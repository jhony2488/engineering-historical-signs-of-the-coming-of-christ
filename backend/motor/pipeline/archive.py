from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import structlog

from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.config import get_settings

logger = structlog.get_logger()


class ColdStorageArchiver:
    """Exporta histórico antigo para Parquet/JSON local (cold storage)."""

    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()
        self.settings = get_settings()

    def archive_before(self, cutoff: date | None = None) -> dict[str, Any]:
        years = self.settings.cold_storage_years
        cutoff = cutoff or (date.today() - timedelta(days=365 * years))
        rows = self.db.get_historico(desde=date(2000, 1, 1), limit=5000)
        to_archive = [r for r in rows if r.get("data_referencia", "") < cutoff.isoformat()]

        out_dir = Path(self.settings.archive_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        stamp = cutoff.isoformat()
        json_path = out_dir / f"resultados_escatologicos_{stamp}.json"
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(to_archive, f, ensure_ascii=False, default=str, indent=2)

        parquet_path = None
        try:
            import pyarrow as pa
            import pyarrow.parquet as pq

            parquet_path = out_dir / f"resultados_escatologicos_{stamp}.parquet"
            flat = [
                {
                    "data_referencia": r.get("data_referencia"),
                    "fase_atual": r.get("fase_atual"),
                    "indice_global": r.get("indice_global"),
                    "probabilidade_fase": r.get("probabilidade_fase"),
                    "confianca": r.get("confianca"),
                }
                for r in to_archive
            ]
            if flat:
                table = pa.Table.from_pylist(flat)
                pq.write_table(table, parquet_path)
        except ImportError:
            logger.info("parquet_skipped", reason="pyarrow not installed")

        result = {
            "cutoff": stamp,
            "archived_count": len(to_archive),
            "json_path": str(json_path),
            "parquet_path": str(parquet_path) if parquet_path else None,
        }
        logger.info("cold_storage_archive", **result)
        return result
