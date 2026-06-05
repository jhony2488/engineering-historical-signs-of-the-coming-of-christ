from __future__ import annotations

import networkx as nx
import numpy as np


class PropheticGNN:
    """Message-passing leve (2 camadas) — proxy GNN sem PyTorch Geometric."""

    def __init__(self, graph: nx.DiGraph, hidden_dim: int = 8) -> None:
        self.graph = graph
        self.hidden_dim = hidden_dim
        self._node_index = {n: i for i, n in enumerate(graph.nodes())}
        self._adj = self._build_adjacency()

    def _build_adjacency(self) -> np.ndarray:
        n = len(self._node_index)
        if n == 0:
            return np.zeros((0, 0))
        adj = np.zeros((n, n), dtype=np.float32)
        for u, v in self.graph.edges():
            i, j = self._node_index[u], self._node_index[v]
            adj[i, j] = 1.0
        row_sum = adj.sum(axis=1, keepdims=True)
        row_sum[row_sum == 0] = 1.0
        return adj / row_sum

    def _node_features(self) -> np.ndarray:
        n = len(self._node_index)
        feats = np.zeros((n, self.hidden_dim), dtype=np.float32)
        type_map = {"evento": 0, "profecia": 1, "figura": 2, "cenario": 3, "macro": 4, "micro": 5}
        for node_id, idx in self._node_index.items():
            data = self.graph.nodes[node_id]
            tipo = str(data.get("tipo", "evento"))
            slot = type_map.get(tipo, 6) % self.hidden_dim
            feats[idx, slot] = 1.0
            if "peso" in data:
                feats[idx, 0] = float(data["peso"])
        return feats

    def forward(self, steps: int = 2) -> dict[str, float]:
        if self._adj.size == 0:
            return {}
        h = self._node_features()
        for _ in range(steps):
            h = np.tanh(self._adj @ h)
        scores = {}
        for node_id, idx in self._node_index.items():
            scores[node_id] = float(np.mean(h[idx]))
        return scores

    def phase_convergence_score(self, phase_nodes: list[str]) -> float:
        scores = self.forward()
        if not phase_nodes:
            return 0.0
        vals = [scores.get(n, 0.0) for n in phase_nodes if n in self._node_index]
        return min(1.0, max(0.0, sum(vals) / max(1, len(vals))))

    def leader_influence_anomaly(self, leader_id: str) -> float:
        """Detecta centralidade artificial em múltiplos domínios (falso líder no grafo)."""
        if leader_id not in self.graph:
            return 0.0
        domains: dict[str, int] = {}
        for _, target, data in self.graph.out_edges(leader_id, data=True):
            tipo = self.graph.nodes[target].get("tipo", "outro")
            rel = data.get("relacao", "influencia")
            domains[f"{tipo}:{rel}"] = domains.get(f"{tipo}:{rel}", 0) + 1
        if len(domains) < 2:
            return 0.0
        scores = self.forward()
        base = scores.get(leader_id, 0.0)
        return min(1.0, base * len(domains) / 4)
