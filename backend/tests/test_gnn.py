import pytest

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


def test_gnn_missing_weights_keeps_untrained_backend(tmp_path):
    pg = PropheticGraph()
    pg.seed_default()
    gnn = PropheticGNN(pg.graph, weights_path=tmp_path / "inexistente.pt")
    assert gnn.backend in ("numpy_proxy", "pytorch_geometric")


def test_gnn_train_requires_torch_geometric():
    pg = PropheticGraph()
    pg.seed_default()
    gnn = PropheticGNN(pg.graph)
    if gnn.backend == "numpy_proxy":
        result = gnn.train_link_prediction(epochs=2)
        assert result["ok"] is False
    else:
        result = gnn.train_link_prediction(epochs=2)
        assert result["ok"]


def test_gnn_train_save_and_reload(tmp_path):
    pytest.importorskip("torch_geometric")
    pg = PropheticGraph()
    pg.seed_default()
    gnn = PropheticGNN(pg.graph)

    result = gnn.train_link_prediction(epochs=5)
    assert result["ok"]
    assert result["n_edges"] > 0

    path = tmp_path / "gnn_weights.pt"
    gnn.save_weights(path, meta=result)

    reloaded = PropheticGNN(pg.graph, weights_path=path)
    assert reloaded.backend == "pyg_trained"
    scores = reloaded.forward()
    assert "lider_global" in scores
