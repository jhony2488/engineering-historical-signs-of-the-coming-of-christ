from motor.ml.gnn import PropheticGNN
from motor.ml.graph import PropheticGraph


def test_gnn_forward_scores():
    pg = PropheticGraph()
    pg.seed_default()
    gnn = PropheticGNN(pg.graph)
    scores = gnn.forward()
    assert "lider_global" in scores
    assert 0 <= scores["lider_global"] <= 1


def test_leader_influence_anomaly():
    pg = PropheticGraph()
    pg.seed_default()
    gnn = PropheticGNN(pg.graph)
    anomaly = gnn.leader_influence_anomaly("lider_global")
    assert anomaly >= 0


def test_prophetic_graph_uses_gnn_blend():
    pg = PropheticGraph()
    pg.seed_default()
    score = pg.detect_convergent_influence(["lider_global"])
    assert score >= 0
