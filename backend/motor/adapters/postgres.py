from __future__ import annotations

import json
from datetime import date, datetime
from functools import lru_cache
from typing import Any

from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from motor.config import get_settings

_JSONB_SCALAR_COLUMNS = {"valor_atual", "valor_proposto"}


def _adapt_value(column: str, value: Any) -> Any:
    if column == "embedding" and isinstance(value, list):
        return "[" + ",".join(str(float(item)) for item in value) + "]"
    if (column in _JSONB_SCALAR_COLUMNS and value is not None) or isinstance(value, (dict, list)):
        return Jsonb(value)
    return value


def _columns_clause(columns: str) -> sql.Composable:
    if columns.strip() == "*":
        return sql.SQL("*")
    return sql.SQL(", ").join(sql.Identifier(column.strip()) for column in columns.split(","))


class PostgresClient:
    def __init__(self, pool: ConnectionPool | None = None) -> None:
        database_url = get_settings().database_url
        self._pool = pool
        if self._pool is None and database_url:
            self._pool = ConnectionPool(
                conninfo=database_url,
                min_size=1,
                max_size=10,
                kwargs={"row_factory": dict_row},
                open=False,
            )

    def close(self) -> None:
        if self._pool is not None and not self._pool.closed:
            self._pool.close()

    @property
    def is_configured(self) -> bool:
        return self._pool is not None

    def _require_pool(self) -> ConnectionPool:
        if self._pool is None:
            raise RuntimeError("PostgreSQL is not configured. Set DATABASE_URL in backend/.env.")
        if not self._pool.closed:
            return self._pool
        self._pool.open(wait=True)
        return self._pool

    def _execute(
        self, statement: sql.Composable, params: tuple[Any, ...] = ()
    ) -> list[dict[str, Any]]:
        pool = self._require_pool()
        with pool.connection() as connection, connection.cursor() as cursor:
            cursor.execute(statement, params)
            if cursor.description is None:
                return []
            return list(cursor.fetchall())

    @staticmethod
    def _insert_statement(
        table: str, data: dict[str, Any], conflict: str | None = None
    ) -> tuple[sql.Composable, tuple[Any, ...]]:
        columns = list(data)
        values = [_adapt_value(column, data[column]) for column in columns]
        placeholders = [
            sql.SQL("%s::vector") if column == "embedding" else sql.SQL("%s") for column in columns
        ]
        statement = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
            sql.Identifier(table),
            sql.SQL(", ").join(sql.Identifier(column) for column in columns),
            sql.SQL(", ").join(placeholders),
        )
        if conflict:
            conflict_columns = [column.strip() for column in conflict.split(",")]
            update_columns = [column for column in columns if column not in conflict_columns]
            statement += sql.SQL(" ON CONFLICT ({}) ").format(
                sql.SQL(", ").join(sql.Identifier(column) for column in conflict_columns)
            )
            if update_columns:
                statement += sql.SQL("DO UPDATE SET {}").format(
                    sql.SQL(", ").join(
                        sql.SQL("{} = EXCLUDED.{}").format(
                            sql.Identifier(column), sql.Identifier(column)
                        )
                        for column in update_columns
                    )
                )
            else:
                statement += sql.SQL("DO NOTHING")
        statement += sql.SQL(" RETURNING *")
        return statement, tuple(values)

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        statement, params = self._insert_statement(table, data)
        rows = self._execute(statement, params)
        return rows[0] if rows else data

    def upsert(self, table: str, data: dict[str, Any], on_conflict: str = "id") -> dict[str, Any]:
        statement, params = self._insert_statement(table, data, on_conflict)
        rows = self._execute(statement, params)
        return rows[0] if rows else data

    def update(
        self, table: str, filters: dict[str, Any], data: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if not filters or not data:
            raise ValueError("PostgreSQL updates require at least one filter and one field.")
        assignments = sql.SQL(", ").join(
            sql.SQL("{} = {}").format(
                sql.Identifier(column),
                sql.SQL("%s::vector") if column == "embedding" else sql.SQL("%s"),
            )
            for column in data
        )
        where_clause = sql.SQL(" AND ").join(
            sql.SQL("{} = %s").format(sql.Identifier(column)) for column in filters
        )
        statement = sql.SQL("UPDATE {} SET {} WHERE {} RETURNING *").format(
            sql.Identifier(table), assignments, where_clause
        )
        params = tuple(_adapt_value(column, value) for column, value in data.items()) + tuple(
            filters.values()
        )
        return self._execute(statement, params)

    def select(
        self,
        table: str,
        columns: str = "*",
        filters: dict[str, Any] | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        statement = sql.SQL("SELECT {} FROM {}").format(
            _columns_clause(columns), sql.Identifier(table)
        )
        params: list[Any] = []
        if filters:
            statement += sql.SQL(" WHERE {}").format(
                sql.SQL(" AND ").join(
                    sql.SQL("{} = %s").format(sql.Identifier(column)) for column in filters
                )
            )
            params.extend(filters.values())
        if order:
            descending = order.startswith("-")
            column = order.lstrip("-")
            statement += sql.SQL(" ORDER BY {} {}").format(
                sql.Identifier(column), sql.SQL("DESC" if descending else "ASC")
            )
        if limit is not None:
            statement += sql.SQL(" LIMIT %s")
            params.append(limit)
        return self._execute(statement, tuple(params))

    def exists_resultado_for_date(self, ref_date: date) -> bool:
        rows = self.select(
            "resultados_escatologicos",
            columns="id",
            filters={"data_referencia": ref_date},
            limit=1,
        )
        return bool(rows)

    def get_latest_resultado(self) -> dict[str, Any] | None:
        rows = self.select("resultados_escatologicos", order="-data_referencia", limit=1)
        return rows[0] if rows else None

    def get_historico(self, desde: date | None = None, limit: int = 90) -> list[dict[str, Any]]:
        statement = sql.SQL("SELECT * FROM resultados_escatologicos")
        params: list[Any] = []
        if desde:
            statement += sql.SQL(" WHERE data_referencia >= %s")
            params.append(desde)
        statement += sql.SQL(" ORDER BY data_referencia ASC LIMIT %s")
        params.append(limit)
        return self._execute(statement, tuple(params))

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
        if fn != "match_documents":
            raise ValueError(f"Unsupported PostgreSQL function: {fn}")
        vector = params["query_embedding"]
        vector_literal = "[" + ",".join(str(float(value)) for value in vector) + "]"
        return self._execute(
            sql.SQL(
                """
                SELECT referencia, texto, tema,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM corpus_teologico
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """
            ),
            (vector_literal, vector_literal, params.get("match_count", 3)),
        )

    def get_active_parametros_fase(self) -> dict[str, Any] | None:
        rows = self.select("parametros_fase", filters={"ativo": True}, limit=1)
        return rows[0] if rows else None

    def next_parametros_fase_versao(self) -> int:
        rows = self.select("parametros_fase", columns="versao", order="-versao", limit=1)
        return int(rows[0]["versao"]) + 1 if rows else 1

    def insert_parametros_fase(
        self,
        versao: int,
        emissoes: list[list[float]],
        transicoes: dict[str, Any],
    ) -> dict[str, Any]:
        return self.insert(
            "parametros_fase",
            {
                "versao": versao,
                "ativo": False,
                "aprovado": False,
                "emissoes": emissoes,
                "transicoes": transicoes,
            },
        )

    def insert_proposta_ajuste(
        self,
        tipo: str,
        alvo: str,
        valor_proposto: Any,
        valor_atual: Any | None = None,
        justificativa: str | None = None,
        modelo: str | None = None,
        origem: str = "manual",
    ) -> dict[str, Any]:
        return self.insert(
            "propostas_ajuste",
            {
                "tipo": tipo,
                "alvo": alvo,
                "valor_atual": valor_atual,
                "valor_proposto": valor_proposto,
                "justificativa": justificativa,
                "modelo": modelo,
                "origem": origem,
                "status": "pendente",
            },
        )

    def list_propostas_ajuste(
        self, status: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        filters = {"status": status} if status else None
        return self.select("propostas_ajuste", filters=filters, order="-created_at", limit=limit)

    def set_proposta_status(
        self,
        proposta_id: str,
        status: str,
        revisado_por: str | None = None,
        motivo: str | None = None,
    ) -> list[dict[str, Any]]:
        data: dict[str, Any] = {
            "status": status,
            "revisado_em": datetime.now(),
        }
        if revisado_por:
            data["revisado_por"] = revisado_por
        if motivo:
            data["revisao_motivo"] = motivo
        if status == "aplicada":
            data["aplicado_em"] = datetime.now()
        return self.update("propostas_ajuste", {"id": proposta_id}, data)

    def get_snapshots(
        self,
        janela: str,
        limit: int = 12,
        desde: date | None = None,
    ) -> list[dict[str, Any]]:
        statement = sql.SQL("SELECT * FROM snapshots_periodo WHERE janela = %s")
        params: list[Any] = [janela]
        if desde:
            statement += sql.SQL(" AND data_referencia >= %s")
            params.append(desde)
        statement += sql.SQL(" ORDER BY data_referencia DESC LIMIT %s")
        params.append(limit)
        return self._execute(statement, tuple(params))

    def get_ranking(self, personagem: str, ref_date: date | None = None) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {"personagem": personagem}
        if ref_date:
            filters["data_referencia"] = ref_date
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
                "created_at": datetime.utcnow(),
            },
        )


@lru_cache
def get_postgres() -> PostgresClient:
    return PostgresClient()
