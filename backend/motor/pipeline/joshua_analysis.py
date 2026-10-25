from __future__ import annotations

from typing import Any


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


class JoshuaAnalysisService:
    """Análise missiológica heurística a partir de joshua_project_data (sem LLM obrigatório)."""

    def analyze_row(self, row: dict[str, Any]) -> dict[str, Any]:
        scale = int(row.get("joshua_scale") or row.get("joshuaScale") or 3)
        pct_ev = float(row.get("percent_evangelical") or row.get("percentEvangelical") or 0)
        pct_chr = float(row.get("percent_christian") or row.get("percentChristian") or 0)
        bible = str(
            row.get("bible_translation_status") or row.get("bibleTranslationStatus") or "NONE"
        ).upper()
        audio = bool(
            row.get("audio_recordings_available") or row.get("audioRecordingsAvailable")
        )
        film = bool(row.get("jesus_film_available") or row.get("jesusFilmAvailable"))

        expansion_bits: list[str] = []
        contraction_bits: list[str] = []

        if bible == "COMPLETE":
            expansion_bits.append("Bíblia completa disponível")
        elif bible == "PORTIONS":
            expansion_bits.append("Porções bíblicas disponíveis")
        else:
            contraction_bits.append("Escassez de recursos bíblicos em língua nativa")

        if audio or film:
            expansion_bits.append("Recursos de mídia missiológica disponíveis")
        if pct_ev >= 2 or pct_chr >= 10:
            expansion_bits.append("Presença cristã mensurável")
        if scale <= 2:
            contraction_bits.append("Povo pouco alcançado (Joshua Scale baixa)")
        if scale >= 4:
            expansion_bits.append("Povo com presença cristã consolidada")

        # Escala 1 = não alcançado → contração alta; 5 = alcançado → expansão
        expansion = _clamp(0.15 * scale + 0.01 * min(pct_chr, 40) + (0.1 if audio or film else 0))
        contraction = _clamp(0.95 - 0.15 * scale + (0.15 if bible == "NONE" else 0))
        risk = _clamp(0.55 * contraction + 0.25 * (1 - expansion) + 0.2 * (1 if scale <= 2 else 0.3))

        phase = {
            "FASE_I": _clamp(0.2 + contraction * 0.3),
            "FASE_II": _clamp(0.25 + (0.2 if scale <= 2 else 0.1)),
            "FASE_III": _clamp(contraction * 0.45),
            "FASE_IV": 0.05,
        }
        inferred = max(phase, key=phase.get)  # type: ignore[arg-type]

        trend = "STABLE"
        if expansion > contraction + 0.15:
            trend = "ACCELERATING"
        elif contraction > expansion + 0.2:
            trend = "DECLINING"

        alerts: list[str] = []
        if scale <= 1:
            alerts.append("Povo não alcançado — prioridade de oração/ação")
        if contraction >= 0.7:
            alerts.append("Alta resistência / acesso restrito")
        if expansion >= 0.55:
            alerts.append("Sinais de avanço do Evangelho")

        people_id = str(row.get("people_id") or row.get("peopleId") or "")
        country = str(row.get("country_code") or row.get("countryCode") or "")

        return {
            "people_id": people_id,
            "country_code": country,
            "joshua_data_id": str(row.get("id")),
            "energy_classification": {
                "expansion": expansion_bits,
                "contraction": contraction_bits,
            },
            "expansion_score": round(expansion, 4),
            "contraction_score": round(contraction, 4),
            "missiological_risk": round(risk, 4),
            "progress_trend": trend,
            "phase_correlation": {k: round(v, 4) for k, v in phase.items()},
            "inferred_phase": inferred,
            "llm_analysis": {"mode": "heuristic"},
            "hermeneutic_interpretation": (
                f"Escala Joshua {scale}: energia expansão={expansion:.2f}, "
                f"contração={contraction:.2f}."
            ),
            "alerts": alerts,
            "model_version": "heuristic-v1",
        }

    def analyze_many(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.analyze_row(r) for r in rows]

    def country_aggregates(
        self, rows: list[dict[str, Any]]
    ) -> dict[str, dict[str, float]]:
        """Médias por país para enriquecer L10."""
        by: dict[str, list[dict[str, Any]]] = {}
        for r in rows:
            code = str(r.get("country_code") or r.get("countryCode") or "")
            if not code:
                continue
            by.setdefault(code, []).append(r)

        out: dict[str, dict[str, float]] = {}
        for code, group in by.items():
            analyses = self.analyze_many(group)
            n = len(analyses) or 1
            out[code] = {
                "expansion_score": sum(a["expansion_score"] for a in analyses) / n,
                "contraction_score": sum(a["contraction_score"] for a in analyses) / n,
                "missiological_risk": sum(a["missiological_risk"] for a in analyses) / n,
                "avg_joshua_scale": sum(
                    float(g.get("joshua_scale") or g.get("joshuaScale") or 3) for g in group
                )
                / n,
                "peoples_count": float(len(group)),
            }
        return out

    def persist(self, db: Any, analyses: list[dict[str, Any]]) -> int:
        n = 0
        for a in analyses:
            payload = {
                "joshua_data_id": a.get("joshua_data_id"),
                "people_id": a["people_id"],
                "country_code": a["country_code"],
                "energy_classification": a["energy_classification"],
                "expansion_score": a["expansion_score"],
                "contraction_score": a["contraction_score"],
                "missiological_risk": a["missiological_risk"],
                "progress_trend": a.get("progress_trend"),
                "phase_correlation": a.get("phase_correlation") or {},
                "inferred_phase": a.get("inferred_phase"),
                "llm_analysis": a.get("llm_analysis") or {},
                "hermeneutic_interpretation": a.get("hermeneutic_interpretation"),
                "alerts": a.get("alerts") or [],
                "model_version": a.get("model_version", "heuristic-v1"),
            }
            # Remove null FK if local mock id
            if not payload["joshua_data_id"] or str(payload["joshua_data_id"]).startswith("local"):
                payload.pop("joshua_data_id", None)
            db.insert("missiological_analysis", payload)
            n += 1
        return n
