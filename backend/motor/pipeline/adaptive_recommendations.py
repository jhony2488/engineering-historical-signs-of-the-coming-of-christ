from __future__ import annotations

from datetime import date, timedelta
from typing import Any

THRESHOLDS = {
    "juridical_instability": 0.65,
    "financial_control_level": 0.65,
    "religious_freedom_threat": 0.6,
    "conflict_intensity": 0.7,
    "fragility_index": 0.65,
}

VALIDITY_DAYS = {
    "agora": 7,
    "semana": 14,
    "mes": 30,
    "condicional": 14,
}


class AdaptiveRecommendationService:
    """Camada 15 — triggers adaptativos a partir de L10/L12/L13/L14."""

    def build(
        self,
        threats: list[dict[str, Any]],
        abm_results: list[dict[str, Any]] | None = None,
        adversarial: list[dict[str, Any]] | None = None,
        provenance: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        abm_map = {a.get("country_code"): a for a in (abm_results or [])}
        adv_map = {a.get("country_code"): a for a in (adversarial or [])}
        integrity_fail = bool(provenance) and not provenance.get("integrity_ok", True)
        out: list[dict[str, Any]] = []

        for threat in threats:
            code = threat.get("country_code")
            metrics = threat.get("metrics") or {}
            prescriptions = threat.get("prescriptions") or {}
            abm = abm_map.get(code) or {}
            adv = adv_map.get(code) or {}

            triggers: list[dict[str, Any]] = []
            actions: list[str] = []

            for metric, limiar in THRESHOLDS.items():
                if metric == "fragility_index":
                    val = float(abm.get("fragility_index", 0))
                else:
                    val = float(metrics.get(metric, 0))
                if val > limiar:
                    hours = 6 if val > limiar + 0.15 else 24 if val > limiar + 0.05 else 72
                    triggers.append(
                        {
                            "rule": f"SE {metric} > {limiar} ENTÃO ação em {hours} horas",
                            "metric": metric,
                            "value": val,
                            "threshold": limiar,
                            "action_within_hours": hours,
                        }
                    )

            resilience = float(adv.get("resilience_score", 1.0))
            conditional = integrity_fail or resilience < 0.5

            if float(threat.get("risk_score", 0)) >= 0.75:
                urgency = "agora"
            elif float(threat.get("risk_score", 0)) >= 0.55:
                urgency = "semana"
            else:
                urgency = "mes"

            if conditional:
                urgency = "condicional"
                # Contigência (adaptive_contingency.txt): sem ações imediatas
                actions = [
                    "Aguardar confirmação dos gatilhos antes de executar protocolos de emergência.",
                    "Monitorar premissas frágeis (L13) e integridade dos dados (L14).",
                ]
            else:
                for axis in ("physical", "financial", "spiritual"):
                    actions.extend(prescriptions.get(axis, [])[:1])

                if abm.get("critical_trigger_points"):
                    actions.append(
                        f"Monitorar gatilhos ABM nos meses: {abm['critical_trigger_points']}"
                    )

            if not triggers and not actions:
                continue

            # Prioriza ações de menor dramatismo / maior custo-benefício primeiro
            actions = list(dict.fromkeys(actions))
            days = VALIDITY_DAYS.get(urgency, 30)
            valid_until = (date.today() + timedelta(days=days)).isoformat()

            out.append(
                {
                    "country_code": code,
                    "urgency": urgency,
                    "triggers": triggers,
                    "actions": actions,
                    "valid_until": valid_until,
                    "validity_days": days,
                    "payload": {
                        "risk_score": threat.get("risk_score"),
                        "resilience_score": adv.get("resilience_score"),
                        "fragility_index": abm.get("fragility_index"),
                        "conditional_reason": (
                            "integridade_l14"
                            if integrity_fail
                            else "baixa_resiliencia_l13"
                            if resilience < 0.5
                            else None
                        ),
                        "prompt_ref": "adaptive_contingency.txt" if conditional else None,
                        "note": (
                            "Recomendações condicionais — não executar ações imediatas "
                            "até confirmação dos gatilhos."
                            if conditional
                            else (
                                "Recomendações de resiliência pessoal/comunitária; "
                                "sem orientação partidária. Reavaliar até valid_until."
                            )
                        ),
                    },
                }
            )

        # Ordena por urgência
        order = {"agora": 0, "semana": 1, "mes": 2, "condicional": 3}
        out.sort(key=lambda r: (order.get(r["urgency"], 9), -float(r["payload"].get("risk_score") or 0)))
        return out
