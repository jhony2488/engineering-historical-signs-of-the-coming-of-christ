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


def test_graph_custom_nodes():
    g = PropheticGraph()
    g.add_node("evt_a", "evento")
    g.add_node("evt_b", "evento")
    g.add_edge("evt_a", "evt_b", "precede")
    assert g.leader_centrality("evt_a") >= 0
