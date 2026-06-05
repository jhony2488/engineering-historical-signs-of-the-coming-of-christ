from __future__ import annotations

from typing import Any

from motor.adapters.supabase import SupabaseClient, get_supabase
from motor.ml.gnn import PropheticGNN
from motor.ml.graph import PropheticGraph


class GraphService:
    def __init__(self, db: SupabaseClient | None = None) -> None:
        self.db = db or get_supabase()

    def load_graph(self) -> PropheticGraph:
        pg = PropheticGraph()
        nodes = self.db.select("grafo_nos", limit=500)
        edges = self.db.select("grafo_arestas", limit=2000)
        if not nodes:
            pg.seed_default()
            return pg
        for row in nodes:
            attrs = row.get("attrs") or {}
            if isinstance(attrs, dict):
                pg.add_node(row["node_id"], row.get("tipo", "evento"), attrs)
            else:
                pg.add_node(row["node_id"], row.get("tipo", "evento"), {})
        for row in edges:
            pg.add_edge(row["source_id"], row["target_id"], row.get("relacao", "influencia"))
        return pg

    def to_api_payload(self) -> dict[str, Any]:
        pg = self.load_graph()
        nodes, edges = pg.to_records()
        gnn = PropheticGNN(pg.graph)
        gnn_scores = gnn.forward()
        enriched_nodes = []
        for n in nodes:
            nid = n["id"]
            enriched_nodes.append(
                {
                    "id": nid,
                    "label": n.get("nome") or n.get("label") or nid,
                    "tipo": n.get("tipo", "evento"),
                    "peso_gnn": round(gnn_scores.get(nid, 0.0), 4),
                    "attrs": {k: v for k, v in n.items() if k not in ("id", "tipo")},
                }
            )
        return {
            "nodes": enriched_nodes,
            "edges": [
                {
                    "source": e["source"],
                    "target": e["target"],
                    "relacao": e.get("relacao", "influencia"),
                }
                for e in edges
            ],
            "gnn_convergence": round(
                gnn.phase_convergence_score(
                    [n["id"] for n in nodes if n.get("tipo") == "profecia"]
                ),
                4,
            ),
            "leader_anomaly": round(gnn.leader_influence_anomaly("lider_global"), 4),
        }

    def build_cenarios(self) -> list[dict[str, Any]]:
        pg = self.load_graph()
        nodes, edges = pg.to_records()
        precond: dict[str, list[str]] = {}
        depend: dict[str, list[str]] = {}
        for e in edges:
            rel = e.get("relacao", "")
            tgt, src = e["target"], e["source"]
            if rel in ("precondicao", "antecede", "sinaliza"):
                precond.setdefault(tgt, []).append(src)
            elif rel in ("dependencia", "cumpre", "cumpre_parcial", "influencia"):
                depend.setdefault(tgt, []).append(src)

        cenarios = []
        for n in nodes:
            if n.get("tipo") not in ("cenario", "evento", "profecia"):
                continue
            nid = n["id"]
            attrs = {k: v for k, v in n.items() if k not in ("id", "tipo")}
            cenarios.append(
                {
                    "id": nid,
                    "titulo": attrs.get("titulo") or attrs.get("nome") or attrs.get("ref") or nid,
                    "descricao": attrs.get("descricao", ""),
                    "precondicoes": precond.get(nid, []),
                    "dependencias": depend.get(nid, []),
                    "fase_alvo": attrs.get("fase_alvo", "FASE_II"),
                    "impacto_indice": float(attrs.get("impacto_indice", 0.08)),
                }
            )
        if not cenarios:
            return self._default_cenarios()
        return cenarios

    def _default_cenarios(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "evt_cbdc",
                "titulo": "Infraestrutura CBDC global",
                "descricao": "Consolidação de moeda digital programável.",
                "precondicoes": ["evt_oriente_medio"],
                "dependencias": [],
                "fase_alvo": "FASE_III",
                "impacto_indice": 0.12,
            },
            {
                "id": "prof_ap12",
                "titulo": "Convergência Ap 12-13",
                "descricao": "Padrão profético de controle e adoração.",
                "precondicoes": ["evt_cbdc", "evt_oriente_medio"],
                "dependencias": ["evt_cbdc"],
                "fase_alvo": "FASE_III",
                "impacto_indice": 0.15,
            },
        ]
