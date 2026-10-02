from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from motor.config import CONFIG_DIR

ECHOES_PATH = CONFIG_DIR / "historical_echoes_seed.json"


def _load_echoes(path: Path | None = None) -> list[dict[str, Any]]:
    with (path or ECHOES_PATH).open(encoding="utf-8") as f:
        return json.load(f)


def _dtw_distance(a: np.ndarray, b: np.ndarray) -> float:
    """DTW leve (O(n*m)) para séries curtas de tensão."""
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return 1.0
    cost = np.full((n + 1, m + 1), np.inf)
    cost[0, 0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = abs(float(a[i - 1]) - float(b[j - 1]))
            cost[i, j] = d + min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
    return float(cost[n, m]) / max(n, m)


def _keyword_similarity(text: str, keywords: list[str]) -> float:
    if not keywords:
        return 0.0
    lower = text.lower()
    hits = sum(1 for kw in keywords if kw.lower() in lower)
    return hits / len(keywords)


def _embedding_cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=float), np.array(b, dtype=float)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


class HistoricalEchoService:
    """Camada 11 — ecos históricos (análogos + similaridade)."""

    def __init__(
        self,
        echoes: list[dict[str, Any]] | None = None,
        embeddings: Any | None = None,
    ) -> None:
        self.echoes = echoes if echoes is not None else _load_echoes()
        self.embeddings = embeddings

    def _series_from_events(self, events: list[dict[str, Any]]) -> np.ndarray:
        if not events:
            return np.array([0.4, 0.45, 0.5], dtype=float)
        vals = [
            float(e.get("grau_tensao", e.get("impacto_global", 0.5)))
            for e in events
        ]
        # Suaviza em janelas se houver poucos pontos
        if len(vals) < 3:
            vals = vals + [vals[-1]] * (3 - len(vals))
        return np.array(vals[:12], dtype=float)

    def _text_blob(self, events: list[dict[str, Any]], correlacao: dict[str, Any]) -> str:
        parts = [str(correlacao.get("justificativa", "")), str(correlacao.get("fase", ""))]
        for e in events[:20]:
            parts.append(str(e.get("evento", "")))
            parts.append(str(e.get("descricao", "")))
            parts.append(str(e.get("regiao", "")))
        return " ".join(parts)

    def match_for_events(
        self,
        events: list[dict[str, Any]],
        correlacao: dict[str, Any] | None = None,
        indice_series: list[float] | None = None,
        top_k: int = 2,
    ) -> list[dict[str, Any]]:
        correlacao = correlacao or {}
        top_k = max(3, top_k)  # múltiplos análogos (evita análogo único)
        blob = self._text_blob(events, correlacao)
        series = (
            np.array(indice_series, dtype=float)
            if indice_series
            else self._series_from_events(events)
        )

        query_vec: list[float] | None = None
        if self.embeddings is not None:
            try:
                query_vec = self.embeddings.embed_texts([blob[:1500]])[0]
            except Exception:
                query_vec = None

        ranked: list[dict[str, Any]] = []
        for echo in self.echoes:
            kw_score = _keyword_similarity(blob, echo.get("keywords", []))
            sig = np.array(echo.get("series_signature", [0.5]), dtype=float)
            dtw = _dtw_distance(series, sig)
            dtw_sim = max(0.0, 1.0 - dtw)

            emb_sim = 0.0
            if query_vec is not None:
                echo_text = f"{echo.get('titulo', '')} {' '.join(echo.get('keywords', []))}"
                try:
                    echo_vec = self.embeddings.embed_texts([echo_text])[0]
                    emb_sim = max(0.0, _embedding_cosine(query_vec, echo_vec))
                except Exception:
                    emb_sim = 0.0

            # Pesos: keywords 40%, DTW 40%, embedding 20%
            similarity = 0.4 * kw_score + 0.4 * dtw_sim + 0.2 * emb_sim

            # Falsa analogia tecnológica: análogos pré-digitais perdem peso se o blob
            # atual enfatiza vigilância/IA/CBDC (viés de análogo único / recência invertida).
            tech_markers = ("cbdc", "digital", "vigilanc", "biometr", "inteligencia artificial", " ia ")
            echo_era = str(echo.get("era", echo.get("period", ""))).lower()
            pre_digital = any(
                t in echo_era for t in ("romano", "han", "asteca", "medieval", "antiguidade", "bizantino")
            )
            if pre_digital and any(m in blob.lower() for m in tech_markers):
                similarity *= 0.72

            cycle = echo.get("projected_cycle_months", [18, 24])
            ranked.append(
                {
                    "historical_echo_match": echo.get("id"),
                    "titulo": echo.get("titulo"),
                    "similarity_percentage": round(similarity * 100, 1),
                    "pattern_phase": echo.get("pattern_phase"),
                    "projected_cycle_duration": {
                        "min_months": cycle[0] if cycle else 18,
                        "max_months": cycle[-1] if cycle else 24,
                    },
                    "prescription_bias": echo.get("prescription_bias", {}),
                    "scores": {
                        "keyword": round(kw_score, 4),
                        "dtw": round(dtw_sim, 4),
                        "embedding": round(emb_sim, 4),
                    },
                    "tech_context_penalty": pre_digital
                    and any(m in blob.lower() for m in tech_markers),
                }
            )

        ranked.sort(key=lambda x: x["similarity_percentage"], reverse=True)
        # Tirania do análogo único: devolve top_k >= 3 quando disponível
        top = ranked[: max(1, top_k)]
        if top:
            titles = ", ".join(t.get("titulo", t.get("historical_echo_match", ""))[:60] for t in top[:3])
            top[0] = {
                **top[0],
                "cyclic_synthesis": (
                    f"Padrões cíclicos candidatos (cyclic_patterns.txt): {titles}. "
                    "Similaridade é correlacional — não prova recursão histórica idêntica."
                ),
            }
        return top

    def match_by_country(
        self,
        countries: list[dict[str, Any]],
        events: list[dict[str, Any]],
        correlacao: dict[str, Any] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """Melhor eco por país (eventos filtrados por região do país)."""
        correlacao = correlacao or {}
        out: dict[str, dict[str, Any]] = {}
        for country in countries:
            code = country["code"]
            regioes = set(country.get("regioes", []))
            local_events = [
                e
                for e in events
                if e.get("regiao") in regioes or e.get("regiao") == "global" or not regioes
            ]
            if not local_events:
                local_events = events[:5]
            matches = self.match_for_events(local_events, correlacao, top_k=1)
            out[code] = matches[0] if matches else {}
        return out
