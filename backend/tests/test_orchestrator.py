import pytest

from motor.pipeline.orchestrator import DailyOrchestrator


@pytest.mark.asyncio
async def test_daily_pipeline_dry_run(llm_dry_run):
    orchestrator = DailyOrchestrator()
    result = await orchestrator.run_daily(force=True)

    assert result["fase_atual"] in ("FASE_I", "FASE_II", "FASE_III", "FASE_IV")
    assert 0 <= result["indice_global"] <= 1
    assert result["status"] == "complete"
    assert len(result.get("ranking_mar", [])) == 10
    assert len(result.get("ranking_terra", [])) == 10
    assert "relatorio_html" in result
    assert "transicao_fase" in result
    assert "newsletter_enviados" in result


@pytest.mark.asyncio
async def test_daily_pipeline_schema_fields(llm_dry_run):
    result = await DailyOrchestrator().run_daily(force=True)
    assert result["schema_version"] == "1.0.0"
    assert "correlacao" in result
    assert "eventos_analisados" in result
    assert isinstance(result["ranking_mar"][0]["tendencia_24h"], (int, float))
