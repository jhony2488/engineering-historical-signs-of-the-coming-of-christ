from __future__ import annotations

import json
import re
from pathlib import Path

from motor.domain.energies import CONTRACAO_INDICATORS, EXPANSAO_INDICATORS

_WEIGHTS_PATH = Path(__file__).resolve().parents[1] / "config" / "spiritual_tone_weights.json"


def _load_weights() -> dict:
    if _WEIGHTS_PATH.exists():
        with _WEIGHTS_PATH.open(encoding="utf-8") as f:
            return json.load(f)
    return {
        "blend_weights": {"keywords": 0.5, "roberta": 0.5},
        "roberta_mapping": {
            "positive": {"expansao": 0.75, "contracao": 0.25},
            "negative": {"expansao": 0.25, "contracao": 0.75},
            "neutral": {"expansao": 0.5, "contracao": 0.5},
        },
    }


def keyword_scores(text: str) -> tuple[float, float]:
    lower = text.lower()
    exp = sum(1 for w in EXPANSAO_INDICATORS if w in lower)
    con = sum(1 for w in CONTRACAO_INDICATORS if w in lower)
    for label, words in _load_weights().get("labels", {}).items():
        for w in words:
            if w in lower:
                if label == "expansao":
                    exp += 1
                else:
                    con += 1
    total = exp + con or 1
    return min(1.0, exp / total), min(1.0, con / total)


def roberta_scores(text: str) -> tuple[float, float, str | None]:
    try:
        from transformers import pipeline
    except ImportError:
        return 0.5, 0.5, None

    try:
        pipe = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            truncation=True,
        )
        result = pipe(text[:512])[0]
        label = re.sub(r"[^a-z]", "", result["label"].lower())
        conf = float(result["score"])
        mapping = _load_weights().get("roberta_mapping", {})
        key = (
            "positive" if "positive" in label else "negative" if "negative" in label else "neutral"
        )
        m = mapping.get(key, {"expansao": 0.5, "contracao": 0.5})
        exp = m["expansao"] * conf + 0.5 * (1 - conf)
        con = m["contracao"] * conf + 0.5 * (1 - conf)
        return min(1.0, exp), min(1.0, con), "cardiffnlp/twitter-roberta-base-sentiment-latest"
    except Exception:
        return 0.5, 0.5, None


def classify_spiritual_tone(text: str) -> dict:
    """Combina keywords escatológicas + RoBERTa (fine-tuning via weights JSON)."""
    cfg = _load_weights()
    kw_exp, kw_con = keyword_scores(text)
    rb_exp, rb_con, model = roberta_scores(text)
    w_kw = float(cfg.get("blend_weights", {}).get("keywords", 0.45))
    w_rb = float(cfg.get("blend_weights", {}).get("roberta", 0.55))
    if model is None:
        w_kw, w_rb = 1.0, 0.0

    expansao = w_kw * kw_exp + w_rb * rb_exp
    contracao = w_kw * kw_con + w_rb * rb_con
    total = expansao + contracao or 1.0
    expansao /= total
    contracao /= total
    energia = "expansao" if expansao >= contracao else "contracao"
    return {
        "expansao_score": round(expansao, 4),
        "contracao_score": round(contracao, 4),
        "energia": energia,
        "modelo": model or "spiritual_keywords_v1",
        "features": {
            "keyword_exp": kw_exp,
            "keyword_con": kw_con,
            "roberta_exp": rb_exp,
            "roberta_con": rb_con,
        },
    }
