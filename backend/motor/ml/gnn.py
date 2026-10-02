from __future__ import annotations

from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import structlog

from motor.config import get_settings

logger = structlog.get_logger()


def _try_torch_geometric():
    try:
        import torch
        from torch_geometric.nn import SAGEConv  # noqa: F401

        return torch
    except ImportError:
        return None


def _build_pyg_model(hidden_dim: int):
    """Encoder SAGEConv 2 camadas (definido lazy — torch é opcional)."""
    import torch
    from torch_geometric.nn import SAGEConv

    class EdgePredictor(torch.nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.conv1 = SAGEConv(hidden_dim, hidden_dim)
            self.conv2 = SAGEConv(hidden_dim, hidden_dim)

        def forward(self, x, edge_index):
            h = torch.tanh(self.conv1(x, edge_index))
            return torch.tanh(self.conv2(h, edge_index))

    return EdgePredictor()


class PropheticGNN:
    """
    Message-passing 2 camadas.
    Usa PyTorch Geometric quando `[gnn]` está instalado; caso contrário,
    proxy NumPy/NetworkX (zero-custo). Pesos podem ser treinados offline por
    link prediction (`train-gnn`) e carregados de `GNN_WEIGHTS_PATH`.
    """

    def __init__(
        self,
        graph: nx.DiGraph,
        hidden_dim: int = 8,
        embeddings: Any | None = None,
        weights_path: Path | None = None,
    ) -> None:
        self.graph = graph
        self.hidden_dim = hidden_dim
        self.embeddings = embeddings
        self.settings = get_settings()
        self._node_index = {n: i for i, n in enumerate(graph.nodes())}
        self._adj = self._build_adjacency()
        self._torch = _try_torch_geometric()
        self._pyg_model = None
        self._edge_index = None
        self.backend = "numpy_proxy"
        if self._torch is not None:
            self.backend = "pytorch_geometric"
            self._try_load_weights(weights_path or self.settings.gnn_weights_path)

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
        text_feats = self._text_feature_matrix()
        if text_feats is not None:
            feats = np.clip(feats + text_feats, -1.0, 2.0)
        return feats

    def _text_feature_matrix(self) -> np.ndarray | None:
        """Projeção determinística (seed fixa) do embedding BGE do texto do nó
        para `hidden_dim` — ativa via GNN_TEXT_FEATURES_ENABLED."""
        if not self.settings.gnn_text_features_enabled:
            return None
        if self.embeddings is None or not getattr(self.embeddings, "is_available", False):
            return None
        texts = []
        for node_id in self._node_index:
            data = self.graph.nodes[node_id]
            parts = [str(v) for v in data.values() if isinstance(v, str)]
            texts.append(" ".join(parts) or str(node_id))
        try:
            vecs = np.array(self.embeddings.embed_texts([t[:500] for t in texts]), dtype=np.float32)
        except Exception as exc:
            logger.warning("gnn_text_features_failed", error=str(exc))
            return None
        rng = np.random.default_rng(42)
        proj = rng.standard_normal((vecs.shape[1], self.hidden_dim)).astype(np.float32)
        proj /= np.sqrt(vecs.shape[1])
        return vecs @ proj

    def _edge_index_tensor(self):
        import torch

        if self._edge_index is None:
            edges = [[self._node_index[u], self._node_index[v]] for u, v in self.graph.edges()]
            self._edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
        return self._edge_index

    def _get_pyg_model(self):
        if self._pyg_model is None:
            self._pyg_model = _build_pyg_model(self.hidden_dim)
        return self._pyg_model

    def forward(self, steps: int = 2) -> dict[str, float]:
        if self._adj.size == 0:
            return {}
        if self._torch is not None:
            try:
                return self._forward_pyg(steps)
            except Exception as exc:
                logger.warning("gnn_pyg_fallback", error=str(exc))
        return self._forward_numpy(steps)

    def _forward_numpy(self, steps: int) -> dict[str, float]:
        h = self._node_features()
        for _ in range(steps):
            h = np.tanh(self._adj @ h)
        scores = {}
        for node_id, idx in self._node_index.items():
            scores[node_id] = float(np.mean(h[idx]))
        return scores

    def _forward_pyg(self, steps: int) -> dict[str, float]:
        import torch

        x = torch.tensor(self._node_features(), dtype=torch.float32)
        if not self.graph.edges():
            return self._forward_numpy(steps)
        edge_index = self._edge_index_tensor()
        model = self._get_pyg_model()
        with torch.no_grad():
            h = torch.tanh(model.conv1(x, edge_index))
            if steps > 1:
                h = torch.tanh(model.conv2(h, edge_index))
        scores = {}
        for node_id, idx in self._node_index.items():
            scores[node_id] = float(h[idx].mean().item())
        return scores

    def train_link_prediction(
        self,
        epochs: int | None = None,
        lr: float | None = None,
        neg_ratio: int | None = None,
    ) -> dict[str, Any]:
        """Treino auto-supervisionado: arestas reais = positivos, pares
        aleatórios sem aresta = negativos. Requer extra `[gnn]` (torch_geometric)."""
        if self._torch is None:
            return {
                "ok": False,
                "message": "torch_geometric não instalado — pip install -e '.[gnn]'",
            }
        if not self.graph.edges():
            return {"ok": False, "message": "grafo sem arestas"}

        import torch

        settings = self.settings
        epochs = epochs or settings.gnn_train_epochs
        lr = lr or settings.gnn_train_lr
        neg_ratio = neg_ratio or settings.gnn_neg_ratio

        x = torch.tensor(self._node_features(), dtype=torch.float32)
        edge_index = self._edge_index_tensor()
        model = self._get_pyg_model()
        model.train()
        opt = torch.optim.Adam(model.parameters(), lr=lr)
        loss_fn = torch.nn.BCEWithLogitsLoss()

        n_nodes = len(self._node_index)
        pos_src = edge_index[0]
        pos_dst = edge_index[1]
        existing = set(zip(pos_src.tolist(), pos_dst.tolist(), strict=True))
        rng = np.random.default_rng(42)

        losses: list[float] = []
        for _ in range(epochs):
            n_neg = len(existing) * neg_ratio
            neg_src, neg_dst = [], []
            while len(neg_src) < n_neg:
                i, j = int(rng.integers(n_nodes)), int(rng.integers(n_nodes))
                if i != j and (i, j) not in existing:
                    neg_src.append(i)
                    neg_dst.append(j)

            z = model(x, edge_index)
            pos_score = (z[pos_src] * z[pos_dst]).sum(dim=-1)
            neg_score = (z[torch.tensor(neg_src)] * z[torch.tensor(neg_dst)]).sum(dim=-1)
            scores = torch.cat([pos_score, neg_score])
            labels = torch.cat([torch.ones_like(pos_score), torch.zeros_like(neg_score)])
            loss = loss_fn(scores, labels)
            opt.zero_grad()
            loss.backward()
            opt.step()
            losses.append(float(loss.item()))

        model.eval()
        return {
            "ok": True,
            "epochs": epochs,
            "final_loss": round(losses[-1], 6),
            "n_nodes": n_nodes,
            "n_edges": len(existing),
            "neg_ratio": neg_ratio,
        }

    def save_weights(self, path: Path, meta: dict[str, Any] | None = None) -> None:
        """Persiste state_dict + metadados — carregado lazy no próximo run."""
        if self._torch is None or self._pyg_model is None:
            raise RuntimeError("nada para salvar — treine com torch_geometric instalado")
        from datetime import UTC, datetime

        import torch

        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "state_dict": self._pyg_model.state_dict(),
                "hidden_dim": self.hidden_dim,
                "trained_at": datetime.now(UTC).isoformat(),
                "meta": meta or {},
            },
            path,
        )
        logger.info("gnn_weights_saved", path=str(path))

    def _try_load_weights(self, path: Path) -> None:
        if not path.exists():
            return
        try:
            import torch

            blob = torch.load(path, map_location="cpu", weights_only=True)
            if int(blob.get("hidden_dim", 0)) != self.hidden_dim:
                logger.warning("gnn_weights_dim_mismatch", path=str(path))
                return
            model = self._get_pyg_model()
            model.load_state_dict(blob["state_dict"])
            model.eval()
            self.backend = "pyg_trained"
            logger.info("gnn_weights_loaded", path=str(path), meta=blob.get("meta"))
        except Exception as exc:
            logger.warning("gnn_weights_load_failed", error=str(exc))

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
