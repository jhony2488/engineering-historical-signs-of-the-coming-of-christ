import sys
import types

import pytest

from motor.adapters.local_llm import LOCAL_MODEL_MAP, LocalLlamaClient

ALIAS = "llama-3.1-8b-instant"
CANDS = LOCAL_MODEL_MAP[ALIAS]


def _client(tmp_path, enabled=True):
    client = LocalLlamaClient()
    client._enabled = enabled
    client._models_dir = tmp_path
    return client


def _fake_llama_module(responses: dict[str, object]):
    """Módulo llama_cpp falso: Llama carrega e devolve/levanta por arquivo."""
    calls: dict[str, dict] = {}

    class FakeLlama:
        def __init__(self, model_path, n_ctx, n_threads, n_gpu_layers, verbose):
            self.model_path = model_path
            calls[model_path] = {"n_ctx": n_ctx, "n_threads": n_threads}

        def create_chat_completion(self, **kwargs):
            calls[self.model_path]["kwargs"] = kwargs
            outcome = responses.get(self.model_path, "{}")
            if isinstance(outcome, Exception):
                raise outcome
            return {"choices": [{"message": {"content": outcome}}]}

    mod = types.ModuleType("llama_cpp")
    mod.Llama = FakeLlama
    return mod, calls


def test_is_configured_disabled(tmp_path):
    client = _client(tmp_path, enabled=False)
    assert client.is_configured is False


def test_is_configured_no_files(tmp_path):
    client = _client(tmp_path)
    assert client.is_configured is False


def test_is_configured_with_file(tmp_path):
    (tmp_path / CANDS[0]["file"]).write_bytes(b"gguf")
    client = _client(tmp_path)
    assert client.is_configured is True


@pytest.mark.asyncio
async def test_complete_uses_first_candidate_profile(tmp_path, monkeypatch):
    path = tmp_path / CANDS[0]["file"]
    path.write_bytes(b"gguf")
    mod, calls = _fake_llama_module({str(path): '{"evento":"x"}'})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    client = _client(tmp_path)
    out = await client.complete(ALIAS, [{"role": "user", "content": "x"}])
    assert out == '{"evento":"x"}'
    assert calls[str(path)]["n_ctx"] == CANDS[0]["n_ctx"]
    assert calls[str(path)]["kwargs"]["temperature"] == CANDS[0]["temperature"]
    assert calls[str(path)]["kwargs"]["max_tokens"] == CANDS[0]["max_tokens"]


@pytest.mark.asyncio
async def test_cascade_falls_to_smaller_model(tmp_path, monkeypatch):
    """7B falha na inferência → cai no 3B."""
    p7, p3 = tmp_path / CANDS[0]["file"], tmp_path / CANDS[1]["file"]
    p7.write_bytes(b"gguf")
    p3.write_bytes(b"gguf")
    mod, calls = _fake_llama_module({str(p7): RuntimeError("boom"), str(p3): '{"ok":true}'})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    client = _client(tmp_path)
    out = await client.complete(ALIAS, [{"role": "user", "content": "x"}])
    assert out == '{"ok":true}'
    assert str(p3) in calls


@pytest.mark.asyncio
async def test_cascade_skips_missing_file(tmp_path, monkeypatch):
    """Só o 1.5B existe → pula 7B e 3B."""
    p15 = tmp_path / CANDS[2]["file"]
    p15.write_bytes(b"gguf")
    mod, calls = _fake_llama_module({str(p15): "{}"})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    client = _client(tmp_path)
    out = await client.complete(ALIAS, [{"role": "user", "content": "x"}])
    assert out == "{}"
    assert list(calls) == [str(p15)]


@pytest.mark.asyncio
async def test_all_candidates_fail_raises(tmp_path, monkeypatch):
    for c in CANDS:
        (tmp_path / c["file"]).write_bytes(b"gguf")
    mod, _ = _fake_llama_module({str(tmp_path / c["file"]): RuntimeError("x") for c in CANDS})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    client = _client(tmp_path)
    with pytest.raises(RuntimeError, match="cascata local esgotada"):
        await client.complete(ALIAS, [{"role": "user", "content": "x"}])


@pytest.mark.asyncio
async def test_unknown_alias_raises(tmp_path):
    client = _client(tmp_path)
    with pytest.raises(RuntimeError, match="sem candidato local"):
        await client.complete("modelo-desconhecido", [])


@pytest.mark.asyncio
async def test_json_schema_builds_response_format(tmp_path, monkeypatch):
    path = tmp_path / CANDS[0]["file"]
    path.write_bytes(b"gguf")
    mod, calls = _fake_llama_module({str(path): "{}"})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    client = _client(tmp_path)
    schema = {"type": "object"}
    await client.complete(ALIAS, [{"role": "user", "content": "x"}], json_schema=schema)
    rf = calls[str(path)]["kwargs"]["response_format"]
    assert rf["type"] == "json_object"
    assert rf["schema"] == schema


@pytest.mark.asyncio
async def test_router_prefers_local_then_falls_to_groq(tmp_path, monkeypatch):
    """Router: local configurado → provider local_gguf; local quebrado → groq."""
    from motor.adapters.llm_router import LLMRouter
    from motor.config import get_settings

    monkeypatch.setenv("LOCAL_LLM_ENABLED", "true")
    get_settings.cache_clear()

    path = tmp_path / CANDS[0]["file"]
    path.write_bytes(b"gguf")

    router = LLMRouter()
    router._local = _client(tmp_path)

    mod, _ = _fake_llama_module({str(path): '{"evento":"local"}'})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    content, provider = await router.complete(
        ALIAS, [{"role": "user", "content": "x"}], json_mode=True
    )
    assert provider == "local_gguf"
    assert "local" in content


@pytest.mark.asyncio
async def test_router_falls_to_groq_when_local_exhausted(tmp_path, monkeypatch):
    """Todos os candidatos falham → router segue a cadeia (gemini → groq)."""
    from motor.adapters.llm_router import LLMRouter
    from motor.config import get_settings

    monkeypatch.setenv("LOCAL_LLM_ENABLED", "true")
    monkeypatch.setenv("OLLAMA_ENABLED", "false")
    get_settings.cache_clear()

    for c in CANDS:
        (tmp_path / c["file"]).write_bytes(b"gguf")

    router = LLMRouter()
    router._local = _client(tmp_path)

    mod, _ = _fake_llama_module({str(tmp_path / c["file"]): RuntimeError("x") for c in CANDS})
    monkeypatch.setitem(sys.modules, "llama_cpp", mod)

    # Mock Gemini como não configurado para forçar fallback para Groq
    class _GeminiProbe:
        is_configured = False

    router._gemini = _GeminiProbe()

    class _GroqProbe:
        is_configured = True

        async def complete(self, *a, **kw):
            return "{}"

    router._groq = _GroqProbe()

    _, provider = await router.complete(ALIAS, [{"role": "user", "content": "x"}], json_mode=True)
    assert provider == "groq"
