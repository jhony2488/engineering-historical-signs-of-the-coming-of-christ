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


@pytest.mark.skip(reason="Gemini model deprecated (gemini-2.5-flash-lite → gemini-3.5-flash-lite)")
@pytest.mark.asyncio
async def test_gemini_adapter_basic(monkeypatch):
    """Testa adapter Gemini com mock do SDK."""
    import sys

    # Mock do SDK Gemini antes de importar
    class _MockModel:
        async def generate_content_async(self, contents, generation_config):
            return type("R", (), {"text": '{"test": "value"}'})()

    class _MockGenAI:
        def configure(self, api_key):
            pass

        def GenerativeModel(self, **kwargs):
            return _MockModel()

    sys.modules["google"] = type(sys)("google")
    sys.modules["google.generativeai"] = _MockGenAI()

    from motor.adapters.gemini import GeminiClient
    from motor.config import get_settings

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    get_settings.cache_clear()

    client = GeminiClient()

    content = await client.complete(
        "gemini-2.5-flash-lite",
        [{"role": "user", "content": "Test"}],
        json_mode=True,
    )
    assert content == '{"test": "value"}'

    # Limpar mock
    del sys.modules["google"]
    del sys.modules["google.generativeai"]


@pytest.mark.skip(reason="Gemini model deprecated (gemini-2.5-flash-lite → gemini-3.5-flash-lite)")
@pytest.mark.asyncio
async def test_gemini_adapter_json_schema_not_supported(monkeypatch):
    """Gemini não suporta json_schema strict, usa json_object."""
    import sys

    # Mock do SDK Gemini antes de importar
    captured: dict = {}

    class _MockModel:
        async def generate_content_async(self, contents, generation_config):
            captured["generation_config"] = generation_config
            return type("R", (), {"text": "{}"})()

    class _MockGenAI:
        def configure(self, api_key):
            pass

        def GenerativeModel(self, **kwargs):
            return _MockModel()

    sys.modules["google"] = type(sys)("google")
    sys.modules["google.generativeai"] = _MockGenAI()

    from motor.adapters.gemini import GeminiClient
    from motor.config import get_settings

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    get_settings.cache_clear()

    client = GeminiClient()

    schema = {"type": "object"}
    await client.complete(
        "gemini-2.5-flash-lite",
        [{"role": "user", "content": "Test"}],
        json_mode=True,
        json_schema=schema,
    )
    # Gemini deve usar json_object mesmo com json_schema
    assert captured["generation_config"]["response_mime_type"] == "application/json"

    # Limpar mock
    del sys.modules["google"]
    del sys.modules["google.generativeai"]


@pytest.mark.asyncio
async def test_deepseek_adapter_basic(monkeypatch):
    """Testa adapter DeepSeek com mock httpx."""
    from motor.adapters.deepseek import DeepSeekClient
    from motor.config import get_settings

    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    get_settings.cache_clear()

    client = DeepSeekClient()
    captured: dict = {}

    class _MockResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": '{"test": "value"}'}}]}

    class _MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return _MockResponse()

    # Mock do httpx.AsyncClient
    monkeypatch.setattr("motor.adapters.deepseek.httpx.AsyncClient", lambda timeout: _MockClient())

    content = await client.complete(
        "deepseek-chat",
        [{"role": "user", "content": "Test"}],
        json_mode=True,
    )
    assert content == '{"test": "value"}'
    assert captured["headers"]["Authorization"] == "Bearer test-key"


@pytest.mark.asyncio
async def test_deepseek_adapter_json_schema(monkeypatch):
    """DeepSeek suporta json_schema strict (OpenAI-compatible)."""
    from motor.adapters.deepseek import DeepSeekClient
    from motor.config import get_settings

    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    get_settings.cache_clear()

    client = DeepSeekClient()
    captured: dict = {}

    class _MockResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "{}"}}]}

    class _MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, headers, json):
            captured["json"] = json
            return _MockResponse()

    # Mock do httpx.AsyncClient
    monkeypatch.setattr("motor.adapters.deepseek.httpx.AsyncClient", lambda timeout: _MockClient())

    schema = {"type": "object", "properties": {"test": {"type": "string"}}}
    await client.complete(
        "deepseek-chat",
        [{"role": "user", "content": "Test"}],
        json_mode=True,
        json_schema=schema,
        schema_name="test_schema",
    )
    assert captured["json"]["response_format"]["type"] == "json_schema"
    assert captured["json"]["response_format"]["json_schema"]["name"] == "test_schema"
    assert captured["json"]["response_format"]["json_schema"]["schema"] == schema


@pytest.mark.asyncio
async def test_router_includes_gemini_deepseek(monkeypatch):
    """Verifica ordem do router: Gemini → Groq → DeepSeek → OpenRouter."""
    from motor.config import get_settings

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    get_settings.cache_clear()

    seen_providers = []

    class _Probe:
        is_configured = True

        def __init__(self, name):
            self.name = name

        async def complete(self, _m, _msgs, json_mode=False, temperature=0.2, **kw):
            seen_providers.append(self.name)
            if self.name == "gemini":
                raise RuntimeError("Gemini falha")
            if self.name == "groq":
                raise RuntimeError("Groq falha")
            return "{}"

    router = LLMRouter()
    router._gemini = _Probe("gemini")
    router._groq = _Probe("groq")
    router._deepseek = _Probe("deepseek")
    router._openrouter = _Probe("openrouter")

    await router.complete(
        "llama-3.1-8b-instant",
        [{"role": "user", "content": "Test"}],
        json_mode=True,
    )

    assert seen_providers == ["gemini", "groq", "deepseek"]


def test_validator_get_schema_returns_raw_dict():
    from motor.schemas.validator import get_validator

    schema = get_validator().get_schema("evento_estruturado")
    assert schema["type"] == "object"
    assert "evento" in schema["required"]
