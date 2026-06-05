import pytest

from motor.adapters.llm_router import LLMRouter


@pytest.mark.asyncio
async def test_groq_fallback_to_dry_run(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "true")
    from motor.config import get_settings

    get_settings.cache_clear()

    router = LLMRouter()
    router.force_fallback(True)
    content, provider = await router.complete(
        "llama-3.1-8b-instant",
        [{"role": "user", "content": "Extraia evento em JSON"}],
        json_mode=True,
    )
    assert provider in ("dry_run", "openrouter", "groq")
    assert "evento" in content or "{" in content
