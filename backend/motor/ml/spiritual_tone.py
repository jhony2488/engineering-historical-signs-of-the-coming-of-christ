from __future__ import annotations

from dataclasses import dataclass

from motor.ml.spiritual_tone_classifier import classify_spiritual_tone


@dataclass
class ToneResult:
    expansao_score: float
    contracao_score: float
    energia: str
    modelo: str
    features: dict | None = None


class SpiritualToneAnalyzer:
    """Tom espiritual: keywords escatológicas + RoBERTa (pesos em spiritual_tone_weights.json)."""

    def analyze(self, text: str) -> ToneResult:
        out = classify_spiritual_tone(text)
        return ToneResult(
            expansao_score=out["expansao_score"],
            contracao_score=out["contracao_score"],
            energia=out["energia"],
            modelo=out["modelo"],
            features=out.get("features"),
        )
