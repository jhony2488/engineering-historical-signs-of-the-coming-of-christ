"""Propostas de ajuste auditáveis — LLM sugere, admin revisa (append-only)."""

import json

from fastapi.testclient import TestClient

from api.main import app
from motor.pipeline.data_drift import DataDriftEngine

from .conftest import FakeSupabase

client = TestClient(app)


def test_insert_proposta_sempre_pendente():
    db = FakeSupabase()
    db.insert_proposta_ajuste(
        tipo="threshold",
        alvo="settings.phase_confidence_min",
        valor_atual=0.55,
        valor_proposto=0.6,
        justificativa="drift detectado",
        modelo="mistral-nemo@groq",
        origem="data_drift_monthly",
    )
    table, row = db.inserts[0]
    assert table == "propostas_ajuste"
    assert row["status"] == "pendente"
    assert row["tipo"] == "threshold"
    assert row["origem"] == "data_drift_monthly"


def test_list_e_set_status():
    db = FakeSupabase(
        tables={
            "propostas_ajuste": [
                {"id": "p1", "status": "pendente", "created_at": "2026-01-01"},
                {"id": "p2", "status": "rejeitada", "created_at": "2026-01-02"},
            ]
        }
    )
    pendentes = db.list_propostas_ajuste(status="pendente")
    assert [p["id"] for p in pendentes] == ["p1"]

    db.set_proposta_status("p1", "aprovada", revisado_por="admin")
    row = db.tables["propostas_ajuste"][0]
    assert row["status"] == "aprovada"
    assert row["revisado_em"]
    assert row["revisado_por"] == "admin"

    db.set_proposta_status("p1", "aplicada")
    assert row["aplicado_em"]


def test_set_status_inexistente_retorna_vazio():
    db = FakeSupabase()
    assert db.set_proposta_status("nope", "aprovada") == []


async def test_data_drift_gera_propostas_das_recomendacoes():
    analise = {
        "drift_detectado": True,
        "recomendacoes": [
            {
                "tipo": "criterio_fase",
                "alvo": "fase_criteria.FASE_II",
                "valor_proposto": {"criterio": "novo"},
                "justificativa": "mudança semântica",
            },
            "Revisar threshold de transição",
        ],
    }

    class _Router:
        async def complete(self, *a, **kw):
            return json.dumps(analise), "fake"

    db = FakeSupabase(
        historico=[
            {
                "data_referencia": "2026-01-01",
                "fase_atual": "FASE_II",
                "indice_global": 0.5,
            }
        ]
    )
    result = await DataDriftEngine(db=db, router=_Router()).run()

    assert result["propostas_geradas"] == 2
    propostas = [r for t, r in db.inserts if t == "propostas_ajuste"]
    assert len(propostas) == 2
    assert propostas[0]["alvo"] == "fase_criteria.FASE_II"
    assert propostas[1]["valor_proposto"] == {"texto": "Revisar threshold de transição"}
    assert all(p["status"] == "pendente" for p in propostas)


def test_admin_list_propostas_requires_auth():
    response = client.get("/api/v1/admin/propostas-ajuste")
    assert response.status_code == 401


def test_admin_list_propostas(admin_headers):
    response = client.get(
        "/api/v1/admin/propostas-ajuste",
        params={"status": "pendente"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert "propostas" in body and "count" in body


def test_admin_aprovar_proposta(admin_headers):
    # Sem Supabase configurado, update retorna o merge — endpoint responde 200
    response = client.post(
        "/api/v1/admin/propostas-ajuste/qualquer-id/aprovar",
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "aprovada"


def test_admin_rejeitar_proposta(admin_headers):
    response = client.post(
        "/api/v1/admin/propostas-ajuste/qualquer-id/rejeitar",
        params={"motivo": "fora do escopo"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejeitada"
