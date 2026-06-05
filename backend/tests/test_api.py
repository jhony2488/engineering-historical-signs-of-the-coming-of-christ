from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "motor-escatologico"


def test_resultado_atual_404_when_empty():
    response = client.get("/api/v1/resultado/atual")
    assert response.status_code in (200, 404)


def test_ranking_invalid_personagem():
    response = client.get("/api/v1/ranking/invalido")
    assert response.status_code == 400


def test_ranking_mar_alias():
    response = client.get("/api/v1/ranking/mar")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_historico_limit_validation():
    response = client.get("/api/v1/resultado/historico", params={"limit": 0})
    assert response.status_code == 422


def test_snapshot_404_unknown_janela():
    response = client.get("/api/v1/snapshot/janela_inexistente_xyz")
    assert response.status_code in (404, 200)


def test_admin_run_synthesis_requires_auth():
    response = client.post("/api/v1/admin/run-synthesis")
    assert response.status_code == 401


def test_admin_run_synthesis_invalid_window(admin_headers):
    response = client.post(
        "/api/v1/admin/run-synthesis",
        params={"window": "invalid"},
        headers=admin_headers,
    )
    assert response.status_code == 400


def test_admin_run_synthesis_accepted(admin_headers):
    response = client.post(
        "/api/v1/admin/run-synthesis",
        params={"window": "weekly"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["motor"] == "nivel_2"


def test_admin_run_hybrid_invalid_window(admin_headers):
    response = client.post(
        "/api/v1/admin/run-hybrid-analysis",
        params={"window": "weekly"},
        headers=admin_headers,
    )
    assert response.status_code == 400


def test_admin_run_daily_accepted(admin_headers):
    response = client.post(
        "/api/v1/admin/run-daily",
        params={"ref_date": "2026-06-04", "force": True},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["data_referencia"] == "2026-06-04"

