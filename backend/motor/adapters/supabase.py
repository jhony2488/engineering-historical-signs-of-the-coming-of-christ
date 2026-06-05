from __future__ import annotations

import json
from datetime import date, datetime
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from motor.config import get_settings


class SupabaseClient:
    def __init__(self, client: Client | None = None) -> None:
        settings = get_settings()
        if client:
            self._client = client
        elif settings.supabase_url and settings.supabase_service_role_key:
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
        else:
            self._client = None

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        if not self._client:
            return {**data, "id": "local-mock"}
        result = self._client.table(table).insert(data).execute()
        return result.data[0] if result.data else data

    def upsert(self, table: str, data: dict[str, Any], on_conflict: str = "id") -> dict[str, Any]:
        if not self._client:
            return {**data, "id": data.get("id", "local-mock")}
        result = self._client.table(table).upsert(data, on_conflict=on_conflict).execute()
        return result.data[0] if result.data else data

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict[str, Any] | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        if not self._client:
            return []
        query = self._client.table(table).select(columns)
        for key, value in (filters or {}).items():
            query = query.eq(key, value)
        if order:
            desc = order.startswith("-")
            col = order.lstrip("-")
            query = query.order(col, desc=desc)
        if limit:
            query = query.limit(limit)
        return query.execute().data or []

    def exists_resultado_for_date(self, ref_date: date) -> bool:
        rows = self.select(
            "resultados_escatologicos",
            filters={"data_referencia": ref_date.isoformat()},
            limit=1,
        )
        return len(rows) > 0

    def get_latest_resultado(self) -> dict[str, Any] | None:
        rows = self.select("resultados_escatologicos", order="-data_referencia", limit=1)
        return rows[0] if rows else None

    def get_historico(self, desde: date | None = None, limit: int = 90) -> list[dict[str, Any]]:
        if not self._client:
            return []
        query = self._client.table("resultados_escatologicos").select("*")
        if desde:
            query = query.gte("data_referencia", desde.isoformat())
        query = query.order("data_referencia", desc=False).limit(limit)
        return query.execute().data or []

    def get_latest_snapshot(self, janela: str) -> dict[str, Any] | None:
        from motor.adapters.redis_client import get_redis

        cache = get_redis()
        cache_key = f"snapshot:{janela}:latest"
        if cache.available:
            raw = cache.get(cache_key)
            if raw:
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    pass

        rows = self.select(
            "snapshots_periodo",
            filters={"janela": janela},
            order="-data_referencia",
            limit=1,
        )
        row = rows[0] if rows else None
        if row and cache.available:
            cache.set(cache_key, json.dumps(row, default=str), ttl=86400)
        return row

    def cache_snapshot(self, janela: str, row: dict[str, Any]) -> None:
        from motor.adapters.redis_client import get_redis

        cache = get_redis()
        if cache.available:
            cache.set(f"snapshot:{janela}:latest", json.dumps(row, default=str), ttl=86400)

    def rpc(self, fn: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        if not self._client:
            return []
        result = self._client.rpc(fn, params).execute()
        return result.data or []

    def get_active_parametros_fase(self) -> dict[str, Any] | None:
        rows = self.select("parametros_fase", filters={"ativo": True}, limit=1)
        return rows[0] if rows else None

    def get_snapshots(
        self,
        janela: str,
        limit: int = 12,
        desde: date | None = None,
    ) -> list[dict[str, Any]]:
        if not self._client:
            return []
        query = self._client.table("snapshots_periodo").select("*").eq("janela", janela)
        if desde:
            query = query.gte("data_referencia", desde.isoformat())
        query = query.order("data_referencia", desc=True).limit(limit)
        return query.execute().data or []

    def get_ranking(self, personagem: str, ref_date: date | None = None) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {"personagem": personagem}
        if ref_date:
            filters["data_referencia"] = ref_date.isoformat()
        rows = self.select(
            "ranking_probabilistico", filters=filters, order="-probabilidade_atual", limit=10
        )
        if rows:
            return rows
        if ref_date is None:
            return self.select(
                "ranking_probabilistico",
                filters={"personagem": personagem},
                order="-data_referencia",
                limit=10,
            )
        return []

    def log_audit(
        self,
        camada: str,
        modelo: str,
        prompt_version: str,
        input_hash: str,
        decisao: str,
        detalhes: dict[str, Any] | None = None,
    ) -> None:
        self.insert(
            "audit_log",
            {
                "camada": camada,
                "modelo": modelo,
                "prompt_version": prompt_version,
                "input_hash": input_hash,
                "decisao": decisao,
                "detalhes": detalhes or {},
                "created_at": datetime.utcnow().isoformat(),
            },
        )


@lru_cache
def get_supabase() -> SupabaseClient:
    return SupabaseClient()
