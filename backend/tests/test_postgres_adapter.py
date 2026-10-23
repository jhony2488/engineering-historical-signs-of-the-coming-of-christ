from types import SimpleNamespace

import pytest
from psycopg.types.json import Jsonb

from motor.adapters import postgres
from motor.adapters.postgres import PostgresClient


def test_database_operations_fail_explicitly_when_database_url_is_missing(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))

    client = PostgresClient()

    assert not client.is_configured
    with pytest.raises(RuntimeError, match="Set DATABASE_URL"):
        client.select("resultados_escatologicos")


def test_insert_statement_adapts_json_and_pgvector_values(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))
    statement, params = PostgresClient._insert_statement(
        "embeddings_eventos",
        {
            "trecho_id": "chunk-1",
            "embedding": [0.25, -0.5],
            "metadata": {"source": "unit-test"},
        },
    )

    query = statement.as_string()
    assert 'INSERT INTO "embeddings_eventos"' in query
    assert "%s::vector" in query
    assert params[0] == "chunk-1"
    assert params[1] == "[0.25,-0.5]"
    assert isinstance(params[2], Jsonb)
    assert params[2].obj == {"source": "unit-test"}


def test_insert_statement_encodes_scalar_jsonb_proposal_values(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))
    _, params = PostgresClient._insert_statement(
        "propostas_ajuste",
        {"valor_atual": 0.2, "valor_proposto": 0.5},
    )

    assert all(isinstance(value, Jsonb) for value in params)
    assert [value.obj for value in params] == [0.2, 0.5]


def test_upsert_supports_compound_conflict_keys(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))
    statement, _ = PostgresClient._insert_statement(
        "ameacas_pais",
        {
            "data_referencia": "2026-10-23",
            "country_code": "BR",
            "risk_score": 0.5,
        },
        conflict="data_referencia,country_code",
    )

    query = statement.as_string()
    assert 'ON CONFLICT ("data_referencia", "country_code")' in query
    assert '"risk_score" = EXCLUDED."risk_score"' in query


def test_pgvector_rag_query_uses_native_postgres_operator(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))
    client = PostgresClient(pool=object())
    captured = {}

    def fake_execute(statement, params=()):
        captured["query"] = statement.as_string()
        captured["params"] = params
        return [{"referencia": "João 3:16", "texto": "texto", "similarity": 0.9}]

    monkeypatch.setattr(client, "_execute", fake_execute)
    rows = client.rpc(
        "match_documents",
        {"query_embedding": [0.1, 0.2], "match_count": 5},
    )

    assert len(rows) == 1
    assert "<=>" in captured["query"]
    assert "FROM corpus_teologico" in captured["query"]
    assert captured["params"] == ("[0.1,0.2]", "[0.1,0.2]", 5)


def test_update_requires_filters_to_prevent_accidental_full_table_updates(monkeypatch):
    monkeypatch.setattr(postgres, "get_settings", lambda: SimpleNamespace(database_url=""))
    client = PostgresClient(pool=object())

    with pytest.raises(ValueError, match="at least one filter"):
        client.update("resultados_escatologicos", {}, {"status": "rejected"})
