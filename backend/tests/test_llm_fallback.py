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


@pytest.mark.asyncio
async def test_router_passes_json_schema_to_providers(monkeypatch):
    """json_schema deve ser repassado aos adapters (enforcement na API)."""
    seen: dict = {}

    class _Probe:
        is_configured = True

        async def complete(self, _m, _msgs, json_mode=False, temperature=0.2, **kw):
            seen.update(kw)
            return "{}"

    router = LLMRouter()
    router._groq = _Probe()
    schema = {"type": "object", "properties": {"evento": {"type": "string"}}}
    _, provider = await router.complete(
        "llama-3.1-8b-instant",
        [{"role": "user", "content": "Extraia evento"}],
        json_mode=True,
        json_schema=schema,
        schema_name="evento_estruturado",
    )
    assert provider == "groq"  # o router rotula pelo adapter usado
    assert seen["json_schema"] == schema
    assert seen["schema_name"] == "evento_estruturado"


@pytest.mark.asyncio
async def test_groq_adapter_builds_json_schema_response_format(monkeypatch):
    """Sem cliente configurado, o dry-run ainda retorna conteúdo — então
    testamos a montagem do payload isolando a decisão de response_format."""
    from motor.adapters.groq import GroqClient
    from motor.config import get_settings

    monkeypatch.delenv("LLM_DRY_RUN", raising=False)
    get_settings.cache_clear()

    client = GroqClient()
    captured: dict = {}

    class _Completions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return type(
                "R",
                (),
                {"choices": [type("C", (), {"message": type("M", (), {"content": "{}"})()})()]},
            )()

    client._client = type("C", (), {"chat": type("Ch", (), {"completions": _Completions()})()})()
    schema = {"type": "object"}
    await client.complete(
        "modelo",
        [{"role": "user", "content": "x"}],
        json_mode=True,
        json_schema=schema,
        schema_name="meu_schema",
    )
    rf = captured["response_format"]
    assert rf["type"] == "json_schema"
    assert rf["json_schema"]["name"] == "meu_schema"
    assert rf["json_schema"]["schema"] == schema
    assert rf["json_schema"]["strict"] is True


def test_validator_get_schema_returns_raw_dict():
    from motor.schemas.validator import get_validator

    schema = get_validator().get_schema("evento_estruturado")
    assert schema["type"] == "object"
    assert "evento" in schema["required"]
