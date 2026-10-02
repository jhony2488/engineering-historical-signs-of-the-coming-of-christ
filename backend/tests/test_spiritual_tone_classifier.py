from motor.config import get_settings
from motor.ml.spiritual_tone_classifier import (
    _get_sentiment_pipeline,
    classify_spiritual_tone,
    keyword_scores,
    roberta_scores,
)


def test_keyword_scores_expansao():
    exp, con = keyword_scores("despertamento espiritual e esperanca no evangelho")
    assert exp > con


def test_keyword_scores_contracao():
    exp, con = keyword_scores("perseguicao totalitaria e vigilancia cbdc")
    assert con > exp


def test_classify_spiritual_tone_structure():
    out = classify_spiritual_tone("conflito e apostasia global")
    assert "expansao_score" in out
    assert "contracao_score" in out
    assert out["energia"] in ("expansao", "contracao")
    assert 0 <= out["expansao_score"] <= 1


def test_sentiment_model_name_from_settings():
    assert get_settings().sentiment_model_name == ("cardiffnlp/twitter-xlm-roberta-base-sentiment")


def test_roberta_scores_falls_back_when_pipeline_unavailable(monkeypatch):
    monkeypatch.setattr(
        "motor.ml.spiritual_tone_classifier._get_sentiment_pipeline",
        lambda _name: None,
    )
    exp, con, model = roberta_scores("texto qualquer")
    assert (exp, con, model) == (0.5, 0.5, None)


def test_roberta_scores_returns_configured_model_name(monkeypatch):
    class _FakePipe:
        def __call__(self, _text):
            return [{"label": "NEGATIVE", "score": 0.9}]

    monkeypatch.setattr(
        "motor.ml.spiritual_tone_classifier._get_sentiment_pipeline",
        lambda _name: _FakePipe(),
    )
    _, con, model = roberta_scores("conflito")
    assert model == get_settings().sentiment_model_name
    assert con > 0.5


def test_sentiment_pipeline_is_cached_per_model(monkeypatch):
    import sys
    import types

    calls: list[str] = []

    def _fake_pipeline(*_args, **kwargs):
        calls.append(kwargs.get("model", ""))
        return object()

    monkeypatch.setitem(sys.modules, "transformers", types.SimpleNamespace(pipeline=_fake_pipeline))
    _get_sentiment_pipeline.cache_clear()
    p1 = _get_sentiment_pipeline("modelo/a")
    p2 = _get_sentiment_pipeline("modelo/a")
    assert p1 is p2
    assert calls == ["modelo/a"]
