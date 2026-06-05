from motor.pipeline.historical_baseline import HistoricalBaselineService


def test_baseline_seed_loads_statistics():
    svc = HistoricalBaselineService()
    seed = svc._load_seed()
    stats = seed["estatisticas"]
    assert stats["total_profecias_biblicas"] == 1819
    assert stats["eventos_principais_mapeados"] == 600
    assert stats["profecias_pendentes"] == 22
    assert stats["profecias_cumpridas"] == 1797


def test_baseline_initialize_idempotent():
    svc = HistoricalBaselineService()
    first = svc.ensure_initialized(force=True)
    second = svc.ensure_initialized()
    assert first["estatisticas"]["total_profecias_biblicas"] == 1819
    assert second["marco_zero_deslocamento"] == first["marco_zero_deslocamento"]
    assert 0 <= first["marco_zero_deslocamento"] <= 1


def test_baseline_payload_structure():
    svc = HistoricalBaselineService()
    payload = svc.ensure_initialized(force=True)
    assert "overview" in payload
    assert "categorias" in payload
    assert len(payload["profecias_pendentes"]) == 22
    assert len(payload["sinais_gerais"]) >= 5
