"""Shadow mode da camada 4: EventShadowClassifier + audit camada_4_shadow."""

from __future__ import annotations

import json

from motor.ml.event_classifier import EventShadowClassifier
from motor.pipeline.llm.layers import LLMPipeline

from .conftest import FakeSupabase

CHUNK = {
    "id": "t-1",
    "texto": "Conflito militar escala no Oriente Médio com coalizão internacional e sanções.",
    "topicos": ["conflito", "oriente_medio"],
}

LLM_JSON = json.dumps(
    {
        "evento": "conflito_militar",
        "regiao": "oriente_medio",
        "grau_tensao": 0.8,
        "impacto_global": 0.7,
        "energia": "contracao",
        "dimensao": "macro",
        "descricao": "Escalada militar regional.",
        "confianca_extracao": 0.9,
        "tags": ["conflito"],
    }
)


class FakeRouter:
    async def complete(self, model, messages, json_mode=False, temperature=0.2, **_kwargs):
        return LLM_JSON, "fake"


def test_shadow_classifier_fields() -> None:
    clf = EventShadowClassifier(embeddings=None)
    out = clf.classify(CHUNK["texto"])
    assert out["energia"]["valor"] in ("expansao", "contracao")
    assert out["dimensao"]["valor"] in ("macro", "micro")
    # Sem embeddings, evento/topico zero-shot ficam indisponíveis
    assert out["evento"]["valor"] is None
    assert out["topico"]["valor"] is None


async def test_extract_events_logs_shadow_audit() -> None:
    db = FakeSupabase()
    pipeline = LLMPipeline(router=FakeRouter(), embeddings=None)
    events = await pipeline.extract_events([CHUNK], [], db)

    assert len(events) == 1
    assert events[0]["evento"] == "conflito_militar"

    camadas = [a["camada"] for a in db.audits]
    assert "camada_4" in camadas
    assert "camada_4_shadow" in camadas

    shadow = next(a for a in db.audits if a["camada"] == "camada_4_shadow")
    assert shadow["detalhes"]["modelo_extracao"] == "llama-3.1-8b-instant"
    assert "agree" in shadow["detalhes"]


async def test_extract_events_shadow_disabled(monkeypatch) -> None:
    from motor.config import get_settings

    monkeypatch.setenv("EVENT_SHADOW_ENABLED", "false")
    get_settings.cache_clear()
    try:
        db = FakeSupabase()
        pipeline = LLMPipeline(router=FakeRouter(), embeddings=None)
        await pipeline.extract_events([CHUNK], [], db)
        assert "camada_4_shadow" not in [a["camada"] for a in db.audits]
    finally:
        monkeypatch.delenv("EVENT_SHADOW_ENABLED", raising=False)
        get_settings.cache_clear()
