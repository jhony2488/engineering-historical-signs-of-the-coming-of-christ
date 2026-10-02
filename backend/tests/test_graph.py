from motor.ml.graph import PropheticGraph


def test_graph_centrality():
    g = PropheticGraph()
    g.seed_default()
    score = g.detect_convergent_influence(["lider_global"])
    assert score > 0


def test_graph_unknown_node_zero_centrality():
    g = PropheticGraph()
    g.seed_default()
    assert g.leader_centrality("inexistente") == 0.0


def test_graph_empty_node_list():
    g = PropheticGraph()
    g.seed_default()
    assert g.detect_convergent_influence([]) == 0.0


def test_graph_to_records_structure():
    g = PropheticGraph()
    g.seed_default()
    nodes, edges = g.to_records()
    assert len(nodes) >= 4
    assert len(edges) >= 3
    assert all("id" in n for n in nodes)
    assert all("source" in e and "target" in e for e in edges)


def test_graph_enrich_from_events_adds_day_nodes():
    g = PropheticGraph()
    g.seed_default()
    before = g.graph.number_of_nodes()
    added = g.enrich_from_events(
        [
            {
                "evento": "conflito_militar",
                "regiao": "oriente_medio",
                "grau_tensao": 0.8,
                "energia": "contracao",
                "dimensao": "macro",
            },
            {
                "evento": "cbdc_piloto",
                "regiao": "global",
                "grau_tensao": 0.6,
                "energia": "contracao",
                "dimensao": "macro",
            },
        ]
    )
    assert added >= 2
    assert g.graph.number_of_nodes() > before
    assert any(n.startswith("day_") for n in g.graph.nodes)
