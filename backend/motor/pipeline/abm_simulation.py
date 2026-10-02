from __future__ import annotations

import json
import random
from typing import Any

from motor.config import get_settings
from motor.pipeline.neutrality_filter import scrub_payload_narratives
from motor.prompts.loader import compose_prompt, with_system_debias

AGENT_TYPES = ("governo", "financas", "cidadao", "corporacao", "midia")


class AbmSimulationService:
    """Camada 12 — ABM leve (Python puro + Monte Carlo), sem Mesa."""

    def __init__(self, runs: int = 100, horizon_months: int = 24) -> None:
        self.runs = max(10, min(runs, 200))
        self.horizon = max(6, min(horizon_months, 36))
        self.settings = get_settings()

    def _init_state(self, risk: float, metrics: dict[str, float]) -> dict[str, float]:
        return {
            "governo": _clamp(0.4 + metrics.get("juridical_instability", 0.3) * 0.4),
            "financas": _clamp(0.35 + metrics.get("financial_control_level", 0.3) * 0.5),
            "cidadao": _clamp(0.5 - risk * 0.2),
            "corporacao": _clamp(0.4 + metrics.get("financial_control_level", 0.3) * 0.3),
            "midia": _clamp(0.35 + metrics.get("religious_freedom_threat", 0.2) * 0.4),
            "fragility": risk,
        }

    def _step(self, state: dict[str, float], rng: random.Random) -> dict[str, float]:
        g, f, c, corp, m = (
            state["governo"],
            state["financas"],
            state["cidadao"],
            state["corporacao"],
            state["midia"],
        )
        pressao = 0.15 * g + 0.2 * f + 0.1 * m - 0.12 * c
        noise = rng.uniform(-0.03, 0.03)
        new_frag = _clamp(state["fragility"] + pressao * 0.08 + noise)
        return {
            "governo": _clamp(g + 0.04 * (f - c) + rng.uniform(-0.02, 0.02)),
            "financas": _clamp(f + 0.03 * (g + corp - c) + rng.uniform(-0.02, 0.02)),
            "cidadao": _clamp(c - 0.05 * pressao + rng.uniform(-0.02, 0.03)),
            "corporacao": _clamp(corp + 0.02 * (f - m) + rng.uniform(-0.02, 0.02)),
            "midia": _clamp(m + 0.03 * (g - c) + rng.uniform(-0.02, 0.02)),
            "fragility": new_frag,
        }

    def simulate_country(self, threat: dict[str, Any]) -> dict[str, Any]:
        risk = float(threat.get("risk_score", 0.4))
        metrics = threat.get("metrics") or {}
        rng = random.Random(hash(threat.get("country_code", "XX")) % (2**32))

        final_fragilities: list[float] = []
        trigger_months: list[int] = []
        outcome_bins = {"estavel": 0, "fragil": 0, "colapso_parcial": 0}

        for _run in range(self.runs):
            state = self._init_state(risk, metrics)
            first_trigger: int | None = None
            for month in range(1, self.horizon + 1):
                state = self._step(state, rng)
                if first_trigger is None and state["fragility"] >= 0.75:
                    first_trigger = month
            frag = state["fragility"]
            final_fragilities.append(frag)
            if first_trigger is not None:
                trigger_months.append(first_trigger)
            if frag < 0.45:
                outcome_bins["estavel"] += 1
            elif frag < 0.7:
                outcome_bins["fragil"] += 1
            else:
                outcome_bins["colapso_parcial"] += 1

        final_fragilities.sort()
        n = len(final_fragilities)
        fragility_index = sum(final_fragilities) / n
        p50 = final_fragilities[n // 2]
        p90 = final_fragilities[min(n - 1, int(n * 0.9))]

        critical = sorted(set(trigger_months))[:5]
        if not critical and fragility_index >= 0.6:
            critical = [max(6, int(self.horizon * 0.6))]

        result = {
            "country_code": threat.get("country_code"),
            "runs": self.runs,
            "horizon_months": self.horizon,
            "fragility_index": round(fragility_index, 4),
            "probabilistic_outcomes": {
                k: round(v / self.runs, 4) for k, v in outcome_bins.items()
            },
            "critical_trigger_points": critical,
            "monte_carlo": {
                "p50_fragility": round(p50, 4),
                "p90_fragility": round(p90, 4),
                "mean_fragility": round(fragility_index, 4),
            },
            "agents": list(AGENT_TYPES),
            "synthesis": self._synthesize_local(
                fragility_index,
                outcome_bins,
                critical,
            ),
        }
        return scrub_payload_narratives(result, layer="camada_12")

    def _synthesize_local(
        self,
        fragility: float,
        outcomes: dict[str, int],
        triggers: list[int],
    ) -> dict[str, Any]:
        """Síntese anti-viés local (espelha abm_synthesis.txt sem LLM)."""
        total = max(1, sum(outcomes.values()))
        probs = {k: v / total for k, v in outcomes.items()}
        top = max(probs, key=probs.get)  # type: ignore[arg-type]
        fragility_note = (
            "fragil" if fragility >= 0.7 else "estavel" if fragility < 0.45 else "indeterminado"
        )
        synthesis = (
            f"Em um espaço de possibilidades simulado, o cenário mais frequente é '{top}' "
            f"({probs[top]*100:.0f}%). Fragilidade média {fragility:.2f} "
            f"({fragility_note}). "
            + (
                f"Gatilhos críticos nos meses {triggers}."
                if triggers
                else "Sem gatilho crítico dominante no horizonte."
            )
        )
        return {
            "synthesis": synthesis,
            "bias_warnings": [
                "Distribuição Monte Carlo — a moda não é previsão determinística.",
                "Agentes são heurísticos; comportamento real pode divergir.",
            ],
            "confidence": round(max(0.35, 1.0 - abs(fragility - 0.5)), 3),
            "fragility_note": fragility_note,
            "prompt_ref": "abm_synthesis.txt",
            "source": "heuristic",
        }

    async def enrich_synthesis_llm(
        self,
        result: dict[str, Any],
        router: Any | None = None,
    ) -> dict[str, Any]:
        """Substitui síntese heurística por LLM quando disponível; fallback seguro."""
        if router is None or self.settings.llm_dry_run:
            return result
        try:
            payload = {k: v for k, v in result.items() if k != "synthesis"}
            template = compose_prompt("abm_synthesis.txt")
            prompt = template.replace("{{abm}}", json.dumps(payload, ensure_ascii=False)[:6000])
            content, _provider = await router.complete(
                self.settings.groq_model_timeline,
                [
                    {
                        "role": "system",
                        "content": with_system_debias(
                            "Camada 12 — síntese ABM. Distribuição, não moda; "
                            "sem sensacionalismo. Responda somente JSON válido."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                json_mode=True,
            )
            parsed = json.loads(
                content.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
            )
            if isinstance(parsed, dict) and parsed.get("synthesis"):
                prior = result.get("synthesis") if isinstance(result.get("synthesis"), dict) else {}
                result = {
                    **result,
                    "synthesis": {
                        **prior,
                        **parsed,
                        "source": "llm",
                        "prompt_ref": "abm_synthesis.txt",
                    },
                }
                result = scrub_payload_narratives(result, layer="camada_12_llm")
        except Exception:
            pass
        return result

    def simulate_all(self, threats: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.simulate_country(t) for t in threats]

    async def simulate_all_async(
        self,
        threats: list[dict[str, Any]],
        router: Any | None = None,
    ) -> list[dict[str, Any]]:
        results = self.simulate_all(threats)
        if router is None or self.settings.llm_dry_run:
            return results
        return [await self.enrich_synthesis_llm(row, router) for row in results]


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))
