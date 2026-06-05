import os

import pytest

os.environ["LLM_DRY_RUN"] = "true"

from motor.config import get_settings
from motor.pipeline.hybrid_analysis import WINDOW_CONFIG, HybridAnalysisEngine

get_settings.cache_clear()


@pytest.mark.asyncio
async def test_build_payload_annual():
    engine = HybridAnalysisEngine()
    payload = engine.build_payload("annual")
    assert payload["motor"] == "nivel_3"
    assert payload["janela_out"] == "annual_hybrid"
    assert "weekly" in payload["sub_windows_esperadas"]


@pytest.mark.asyncio
async def test_run_hybrid_dry_run():
    engine = HybridAnalysisEngine()
    result = await engine.run("annual")
    assert result["analise_hibrida"]["panorama"]
    assert "raciocinio" in result["analise_hibrida"]


def test_window_config_covers_doc_windows():
    assert "annual" in WINDOW_CONFIG
    assert "semiannual" in WINDOW_CONFIG
    assert "quarterly" in WINDOW_CONFIG


@pytest.mark.asyncio
async def test_build_payload_quarterly():
    engine = HybridAnalysisEngine()
    payload = engine.build_payload("quarterly")
    assert payload["janela_out"] == "quarterly_hybrid"
    assert "weekly" in payload["sub_windows_esperadas"]


@pytest.mark.asyncio
async def test_build_payload_semiannual():
    engine = HybridAnalysisEngine()
    payload = engine.build_payload("semiannual")
    assert payload["janela_out"] == "semiannual_hybrid"
    assert payload["motor"] == "nivel_3"


def test_window_days_annual():
    assert WINDOW_CONFIG["annual"]["days"] == 365
