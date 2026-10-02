from __future__ import annotations

from typing import Any

import networkx as nx


class PropheticGraph:
    """Proxy NetworkX para centralidade"""

    def __init__(self) -> None:
        self.graph = nx.DiGraph()

    def add_node(self, node_id: str, node_type: str, attrs: dict[str, Any] | None = None) -> None:
        self.graph.add_node(node_id, tipo=node_type, **(attrs or {}))

    def add_edge(self, source: str, target: str, relation: str) -> None:
        self.graph.add_edge(source, target, relacao=relation)

    def leader_centrality(self, leader_id: str) -> float:
        if leader_id not in self.graph:
            return 0.0
        centrality = nx.degree_centrality(self.graph)
        return float(centrality.get(leader_id, 0.0))

    def detect_convergent_influence(self, node_ids: list[str]) -> float:
        if not node_ids:
            return 0.0
        try:
            from motor.ml.gnn import PropheticGNN

            gnn = PropheticGNN(self.graph)
            gnn_score = gnn.phase_convergence_score(node_ids)
            anomaly = (
                max(gnn.leader_influence_anomaly(n) for n in node_ids if n in self.graph)
                if node_ids
                else 0.0
            )
            nx_score = 0.0
            centralities = [self.leader_centrality(n) for n in node_ids if n in self.graph]
            if centralities:
                nx_score = min(1.0, sum(centralities) / len(centralities) * 2)
            return min(1.0, 0.5 * gnn_score + 0.35 * nx_score + 0.15 * anomaly)
        except Exception:
            centralities = [self.leader_centrality(n) for n in node_ids if n in self.graph]
            if not centralities:
                return 0.0
            return min(1.0, sum(centralities) / len(centralities) * 2)

    def to_records(self) -> tuple[list[dict], list[dict]]:
        nodes = [{"id": n, **d} for n, d in self.graph.nodes(data=True)]
        edges = [{"source": u, "target": v, **d} for u, v, d in self.graph.edges(data=True)]
        return nodes, edges

    def seed_default(self) -> None:
        self.add_node("evt_oriente_medio", "evento", {"regiao": "oriente_medio"})
        self.add_node("evt_cbdc", "evento", {"tema": "controle_financeiro"})
        self.add_node("prof_ap12", "profecia", {"ref": "Ap 12-13"})
        self.add_node("lider_global", "figura", {"nome": "Líder Global"})
        self.add_edge("evt_oriente_medio", "prof_ap12", "sinaliza")
        self.add_edge("evt_cbdc", "prof_ap12", "cumpre_parcial")
        self.add_edge("lider_global", "evt_oriente_medio", "influencia")
        self.add_edge("lider_global", "evt_cbdc", "influencia")

    def enrich_from_events(self, events: list[dict[str, Any]], limit: int = 25) -> int:
        """Acrescenta nós/arestas do dia sobre o seed teológico (não substitui)."""
        added = 0
        for i, ev in enumerate(events[: max(0, limit)]):
            regiao = str(ev.get("regiao") or "global").strip().lower().replace(" ", "_")
            evento = str(ev.get("evento") or f"sinal_{i}").strip().lower().replace(" ", "_")
            energia = str(ev.get("energia") or "neutro")
            dimensao = str(ev.get("dimensao") or "macro")
            region_id = f"reg_{regiao}"
            event_id = f"day_{evento}_{regiao}_{i}"

            if region_id not in self.graph:
                self.add_node(region_id, "regiao", {"regiao": regiao})
                added += 1
            if event_id not in self.graph:
                self.add_node(
                    event_id,
                    "evento",
                    {
                        "regiao": regiao,
                        "energia": energia,
                        "dimensao": dimensao,
                        "grau_tensao": float(ev.get("grau_tensao") or 0),
                    },
                )
                added += 1

            self.add_edge(event_id, region_id, "sinaliza")
            if "prof_ap12" in self.graph:
                self.add_edge(event_id, "prof_ap12", "influencia")
            if "lider_global" in self.graph and dimensao == "macro":
                self.add_edge("lider_global", event_id, "influencia")
            if regiao in ("oriente_medio", "israel", "jerusalem") and "evt_oriente_medio" in self.graph:
                self.add_edge(event_id, "evt_oriente_medio", "influencia")
            if (
                any(k in evento for k in ("cbdc", "financeiro", "identidade", "vigilancia"))
                and "evt_cbdc" in self.graph
            ):
                self.add_edge(event_id, "evt_cbdc", "influencia")
        return added
