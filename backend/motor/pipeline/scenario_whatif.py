from __future__ import annotations

import random
from typing import Any, Protocol


class _GraphLike(Protocol):
    def build_cenarios(self) -> list[dict[str, Any]]: ...


class ScenarioWhatIfSimulator:
    """What-if / Monte Carlo leve sobre árvore de dependências de cenários."""

    def __init__(self, graph: _GraphLike | None = None) -> None:
        if graph is None:
            from motor.pipeline.graph_service import GraphService

            graph = GraphService()
        self.graph = graph

    def simulate(
        self,
        active_ids: list[str] | None = None,
        base_indice: float = 0.58,
        trials: int = 200,
        noise: float = 0.04,
    ) -> dict[str, Any]:
        cenarios = self.graph.build_cenarios()
        ativos = set(active_ids or [])
        unlocked = [
            c
            for c in cenarios
            if all(p in ativos for p in c.get("precondicoes", []))
            and all(d in ativos for d in c.get("dependencias", []))
        ]
        impacto_deterministico = sum(float(c.get("impacto_indice", 0)) for c in unlocked)
        indice_base = min(0.95, base_indice + impacto_deterministico)

        samples: list[float] = []
        rng = random.Random(42 + len(ativos))
        for _ in range(max(10, min(trials, 2000))):
            jitter = sum(
                float(c.get("impacto_indice", 0)) * (1.0 + rng.uniform(-noise, noise))
                for c in unlocked
            )
            # Chance de desbloquear dependências parciais
            bonus = 0.0
            for c in cenarios:
                if c["id"] in {u["id"] for u in unlocked}:
                    continue
                pre = c.get("precondicoes", [])
                if (
                    pre
                    and sum(1 for p in pre if p in ativos) / len(pre) >= 0.5
                    and rng.random() < 0.25
                ):
                    bonus += float(c.get("impacto_indice", 0)) * 0.5
            samples.append(min(0.98, base_indice + jitter + bonus))

        samples.sort()
        n = len(samples)
        p50 = samples[n // 2]
        p10 = samples[max(0, n // 10)]
        p90 = samples[min(n - 1, int(n * 0.9))]

        return {
            "ativos": sorted(ativos),
            "cenarios_desbloqueados": [
                {"id": c["id"], "titulo": c["titulo"], "impacto_indice": c["impacto_indice"]}
                for c in unlocked
            ],
            "indice_projetado": round(indice_base, 4),
            "monte_carlo": {
                "trials": n,
                "p10": round(p10, 4),
                "p50": round(p50, 4),
                "p90": round(p90, 4),
                "mean": round(sum(samples) / n, 4),
            },
            "fase_sugerida": self._fase_from_indice(p50),
        }

    def _fase_from_indice(self, indice: float) -> str:
        if indice >= 0.8:
            return "FASE_IV"
        if indice >= 0.65:
            return "FASE_III"
        if indice >= 0.45:
            return "FASE_II"
        return "FASE_I"
