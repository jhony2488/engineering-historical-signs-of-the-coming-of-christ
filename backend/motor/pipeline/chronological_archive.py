from __future__ import annotations

import hashlib
from datetime import date
from typing import Any

import structlog

from motor.adapters.supabase import SupabaseClient, get_supabase

logger = structlog.get_logger()


class ChronologicalArchiveService:
    """Inventário vivo no Postgres (arquivo_profetico) — sem arquivos locais/S3."""

    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()

    def catalog_daily_events(
        self,
        ref_date: date,
        events: list[dict[str, Any]],
        fase: str,
    ) -> int:
        """Persiste eventos do dia como entradas de arquivo cronológico no DB."""
        count = 0
        for i, ev in enumerate(events[:30]):
            slug = str(ev.get("evento", "sinal"))
            regiao = str(ev.get("regiao", "global"))
            raw = f"{ref_date.isoformat()}|{slug}|{regiao}|{i}|{ev.get('descricao', '')[:80]}"
            eid = "live_" + hashlib.sha256(raw.encode()).hexdigest()[:16]
            titulo = (ev.get("descricao") or slug.replace("_", " ")).strip()[:180]
            row = {
                "id": eid,
                "titulo": titulo or slug,
                "status": "parcial",
                "categoria": "evento_diario",
                "referencias": [],
                "periodo_cumprimento": ref_date.isoformat(),
                "fase_escatologica": fase,
                "energia": ev.get("energia", "contracao"),
                "dimensao": ev.get("dimensao", "macro"),
                "descricao": ev.get("descricao") or f"Evento diário catalogado: {slug}",
                "dados": {
                    "tipo": "evento_diario",
                    "origem": "run_diario",
                    "evento": slug,
                    "regiao": regiao,
                    "grau_tensao": ev.get("grau_tensao"),
                    "impacto_global": ev.get("impacto_global"),
                    "detectado_em": ref_date.isoformat(),
                },
            }
            self.db.upsert("arquivo_profetico", row, on_conflict="id")
            count += 1
        logger.info("chronological_archive_cataloged", count=count, date=ref_date.isoformat())
        return count

    def list_archive(
        self,
        status: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        filters = {"status": status} if status else None
        return self.db.select("arquivo_profetico", filters=filters, limit=limit)
