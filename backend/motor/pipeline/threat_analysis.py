from __future__ import annotations

import contextlib
import json
from pathlib import Path
from typing import Any

from motor.config import CONFIG_DIR
from motor.schemas.validator import get_validator

COUNTRIES_PATH = CONFIG_DIR / "countries_focus.json"

PRESCRIPTION_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "physical": {
        "low": [
            "Manter rede local de apoio e comunicação redundante",
            "Mapear rotas e recursos básicos da região",
        ],
        "medium": [
            "Diversificar pontos de encontro e logística comunitária",
            "Preparar plano de contingência familiar (72h)",
        ],
        "high": [
            "Priorizar redundância de abrigo e abastecimento local",
            "Reduzir exposição em zonas de conflito ou cerco logístico",
        ],
    },
    "financial": {
        "low": [
            "Acompanhar políticas monetárias e liquidez local",
            "Manter reserva operacional em ativos diversificados",
        ],
        "medium": [
            "Reduzir concentração em instrumentos centralizados",
            "Preparar alternativas de troca e liquidez física",
        ],
        "high": [
            "Minimizar dependência de canais financeiros únicos",
            "Acelerar resiliência financeira fora de infraestrutura concentrada",
        ],
    },
    "spiritual": {
        "low": [
            "Manter disciplina comunitária de estudo e apoio mútuo",
            "Fortalecer pequenos grupos locais de discernimento",
        ],
        "medium": [
            "Discernir incongruência entre discurso público e estruturas de controle",
            "Preservar práticas comunitárias sob pressão cultural",
        ],
        "high": [
            "Priorizar perseverança e redes comunitárias sob restrição",
            "Preparar suporte pastoral/comunitário sem alinhamento partidário",
        ],
    },
}


def _load_countries(path: Path | None = None) -> list[dict[str, Any]]:
    with (path or COUNTRIES_PATH).open(encoding="utf-8") as f:
        return json.load(f)


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _level(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


class ThreatAnalysisService:
    """Camada 10 — ameaças por país + matriz prescritiva."""

    def __init__(self, countries: list[dict[str, Any]] | None = None) -> None:
        self.countries = countries if countries is not None else _load_countries()
        self.validator = get_validator()

    def _events_for_country(
        self, country: dict[str, Any], events: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        regioes = set(country.get("regioes", []))
        local = [e for e in events if e.get("regiao") in regioes]
        global_ev = [e for e in events if e.get("regiao") == "global"]
        return local or global_ev or events[:3]

    def _score_metrics(
        self,
        local_events: list[dict[str, Any]],
        correlacao: dict[str, Any],
    ) -> dict[str, float]:
        if not local_events:
            avg_t, avg_i = 0.35, 0.3
        else:
            avg_t = sum(float(e.get("grau_tensao", 0.4)) for e in local_events) / len(local_events)
            avg_i = sum(float(e.get("impacto_global", 0.4)) for e in local_events) / len(
                local_events
            )

        blob = " ".join(
            f"{e.get('evento', '')} {e.get('descricao', '')}".lower() for e in local_events
        )

        juridical = avg_t * 0.6
        if any(k in blob for k in ("lei", "jurid", "excecao", "censura", "decreto")):
            juridical += 0.2

        financial = avg_i * 0.5
        if any(k in blob for k in ("banco", "cbdc", "moeda", "sancao", "inflacao", "credito")):
            financial += 0.25

        religious = float(correlacao.get("score_incongruencia", 0)) * 0.4
        if any(k in blob for k in ("igreja", "persegu", "religioso", "fe ", "fé", "apostasia")):
            religious += 0.35
        religious += float(correlacao.get("alerta_falso_lider") or 0) * 0.15

        conflict = avg_t * 0.55 + avg_i * 0.25
        if any(k in blob for k in ("guerra", "conflito", "ataque", "missil", "cerco")):
            conflict += 0.25

        return {
            "juridical_instability": round(_clamp(juridical), 4),
            "financial_control_level": round(_clamp(financial), 4),
            "religious_freedom_threat": round(_clamp(religious), 4),
            "conflict_intensity": round(_clamp(conflict), 4),
        }

    def _prescriptions(
        self,
        metrics: dict[str, float],
        echo: dict[str, Any] | None,
    ) -> dict[str, list[str]]:
        bias = (echo or {}).get("prescription_bias") or {}
        # Urgência: eco eleva o nível se similaridade alta
        urgency_boost = 0.0
        if echo and float(echo.get("similarity_percentage", 0)) >= 55:
            urgency_boost = 0.15

        def axis_level(metric_key: str, bias_key: str) -> str:
            base = metrics.get(metric_key, 0.3) + urgency_boost
            preferred = bias.get(bias_key)
            lvl = _level(base)
            if preferred == "high" and lvl != "high":
                return "medium" if lvl == "low" else "high"
            return lvl

        return {
            "physical": list(
                PRESCRIPTION_TEMPLATES["physical"][
                    axis_level("conflict_intensity", "physical")
                ]
            ),
            "financial": list(
                PRESCRIPTION_TEMPLATES["financial"][
                    axis_level("financial_control_level", "financial")
                ]
            ),
            "spiritual": list(
                PRESCRIPTION_TEMPLATES["spiritual"][
                    axis_level("religious_freedom_threat", "spiritual")
                ]
            ),
        }

    def analyze(
        self,
        events: list[dict[str, Any]],
        correlacao: dict[str, Any] | None = None,
        echoes_by_country: dict[str, dict[str, Any]] | None = None,
        joshua_by_country: dict[str, dict[str, float]] | None = None,
    ) -> list[dict[str, Any]]:
        correlacao = correlacao or {}
        echoes_by_country = echoes_by_country or {}
        joshua_by_country = joshua_by_country or {}
        results: list[dict[str, Any]] = []

        for country in self.countries:
            local = self._events_for_country(country, events)
            metrics = self._score_metrics(local, correlacao)
            josh = joshua_by_country.get(country["code"])
            if josh:
                # Contração missiológica eleva ameaça à liberdade religiosa
                metrics["religious_freedom_threat"] = round(
                    _clamp(
                        metrics["religious_freedom_threat"]
                        + 0.25 * float(josh.get("contraction_score", 0))
                        + 0.15 * float(josh.get("missiological_risk", 0))
                    ),
                    4,
                )
            risk = _clamp(
                0.28 * metrics["juridical_instability"]
                + 0.27 * metrics["financial_control_level"]
                + 0.25 * metrics["religious_freedom_threat"]
                + 0.20 * metrics["conflict_intensity"]
            )
            echo = echoes_by_country.get(country["code"], {})
            if echo.get("similarity_percentage"):
                risk = _clamp(risk + float(echo["similarity_percentage"]) / 1000.0)

            prescriptions = self._prescriptions(metrics, echo)
            if josh and float(josh.get("contraction_score", 0)) >= 0.55:
                prescriptions["spiritual"] = list(
                    dict.fromkeys(
                        [
                            *prescriptions.get("spiritual", []),
                            "Priorizar oração e redes domésticas em povos pouco alcançados (Joshua).",
                            "Preservar recursos bíblicos offline onde a escala Joshua for baixa.",
                        ]
                    )
                )

            row = {
                "country_code": country["code"],
                "country_name": country["name"],
                "lat": country.get("lat"),
                "lng": country.get("lng"),
                "risk_score": round(risk, 4),
                "metrics": metrics,
                "prescriptions": prescriptions,
                "historical_echo": echo,
                "event_count": len(local),
                "joshua": josh,
            }
            with contextlib.suppress(Exception):
                self.validator.validate("ameaca_pais", row)
            results.append(row)

        results.sort(key=lambda r: r["risk_score"], reverse=True)
        return results
