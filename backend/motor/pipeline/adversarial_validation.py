from __future__ import annotations

import json
import random
from typing import Any

from motor.config import get_settings
from motor.pipeline.neutrality_filter import scrub_payload_narratives
from motor.pipeline.threat_analysis import ThreatAnalysisService
from motor.prompts.loader import compose_prompt, with_system_debias


class AdversarialValidationService:
    """Camada 13 — red-team nos top-N países de risco."""

    def __init__(self, top_n: int = 5) -> None:
        self.top_n = top_n
        self.settings = get_settings()

    def _bootstrap_resilience(
        self,
        events: list[dict[str, Any]],
        correlacao: dict[str, Any],
        country_code: str,
        threats: list[dict[str, Any]],
    ) -> float:
        """Remove ~20% dos eventos e re-score rápido; estabilidade = resiliência."""
        if len(events) < 3:
            base = next((t for t in threats if t.get("country_code") == country_code), None)
            return round(1.0 - float((base or {}).get("risk_score", 0.5)) * 0.6, 4)

        rng = random.Random(hash(country_code) % (2**32))
        n_drop = max(1, int(len(events) * 0.2))
        scores: list[float] = []
        analyzer = ThreatAnalysisService(
            countries=[
                {
                    "code": country_code,
                    "name": country_code,
                    "regioes": ["global"],
                    "lat": 0,
                    "lng": 0,
                }
            ]
        )
        base_risk = next(
            (float(t["risk_score"]) for t in threats if t.get("country_code") == country_code),
            0.5,
        )
        for _ in range(8):
            subset = list(events)
            for _d in range(n_drop):
                if subset:
                    subset.pop(rng.randrange(len(subset)))
            rescore = analyzer.analyze(subset, correlacao)
            new_risk = float(rescore[0]["risk_score"]) if rescore else base_risk
            scores.append(abs(new_risk - base_risk))

        volatility = sum(scores) / len(scores) if scores else 0.2
        # Baixa volatilidade sob remoção → alta resiliência da tese
        return round(max(0.0, min(1.0, 1.0 - volatility * 2.5)), 4)

    def _dry_run_payload(
        self,
        threat: dict[str, Any],
        abm: dict[str, Any] | None,
        resilience: float,
    ) -> dict[str, Any]:
        fragile = []
        metrics = threat.get("metrics") or {}
        for key, val in metrics.items():
            if float(val) >= 0.55:
                fragile.append(f"Premissa frágil em {key}={val}")
        if abm and float(abm.get("fragility_index", 0)) >= 0.6:
            fragile.append("ABM indica fragilidade elevada no horizonte simulado")
        if resilience < 0.5:
            fragile.append("Bootstrap estatístico: tese sensível à remoção de 20% dos eventos")

        return {
            "country_code": threat.get("country_code"),
            "resilience_score": resilience,
            "fragile_premises": fragile or ["Premissas estáveis sob amostragem reduzida"],
            "counter_thesis": (
                "A concentração de sinais pode refletir viés de mídia e seleção, "
                "não necessariamente aceleração estrutural irreversível."
            ),
            "recommendation": (
                "Manter recomendações condicionais"
                if resilience < 0.5
                else "Tese suficientemente resiliente para acompanhamento ativo"
            ),
        }

    async def review_top(
        self,
        threats: list[dict[str, Any]],
        events: list[dict[str, Any]],
        correlacao: dict[str, Any] | None = None,
        abm_by_country: dict[str, dict[str, Any]] | None = None,
        router: Any | None = None,
    ) -> list[dict[str, Any]]:
        correlacao = correlacao or {}
        abm_by_country = abm_by_country or {}
        top = sorted(threats, key=lambda t: t.get("risk_score", 0), reverse=True)[: self.top_n]
        results: list[dict[str, Any]] = []

        for threat in top:
            code = threat["country_code"]
            resilience = self._bootstrap_resilience(events, correlacao, code, threats)
            payload = self._dry_run_payload(threat, abm_by_country.get(code), resilience)

            if router is not None and not self.settings.llm_dry_run:
                try:
                    template = compose_prompt("adversarial_redteam.txt")
                    prompt = (
                        template.replace("{{threat}}", json.dumps(threat, ensure_ascii=False)[:3000])
                        .replace(
                            "{{abm}}",
                            json.dumps(abm_by_country.get(code, {}), ensure_ascii=False)[:2000],
                        )
                        .replace("{{resilience}}", str(resilience))
                    )
                    model_name = (
                        self.settings.gemini_model_timeline
                        if self.settings.gemini_api_key
                        else (
                            self.settings.deepseek_model_reasoning
                            if self.settings.deepseek_api_key
                            else self.settings.groq_model_reasoning
                        )
                    )
                    content, _provider = await router.complete(
                        model_name,
                        [
                            {
                                "role": "system",
                                "content": with_system_debias(
                                    "Camada 13 — red-team adversarial (auditor cético). "
                                    "Ceticismo simétrico; mecanismos, não ideologias. "
                                    "Responda somente JSON válido."
                                ),
                            },
                            {"role": "user", "content": prompt},
                        ],
                        json_mode=True,
                    )
                    parsed = json.loads(content.strip().removeprefix("```json").removeprefix("```").removesuffix("```"))
                    payload = {
                        **payload,
                        **parsed,
                        "resilience_score": float(
                            parsed.get("resilience_score", resilience)
                        ),
                        "country_code": code,
                    }
                except Exception:
                    pass

            payload = scrub_payload_narratives(
                payload,
                keys=(
                    "counter_thesis",
                    "counter_hypothesis",
                    "interpretation",
                    "recommendation",
                    "methodological_critique",
                    "disclaimer",
                ),
                list_keys=("fragile_premises",),
                layer="camada_13",
            )
            results.append(payload)
        return results
