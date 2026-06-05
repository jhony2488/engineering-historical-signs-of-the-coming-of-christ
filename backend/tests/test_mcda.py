import json
from pathlib import Path

from motor.math.mcda import rank_candidates

CONFIG = Path(__file__).resolve().parents[1] / "config" / "candidatos_seed.json"


def _load_candidates() -> list[dict]:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def test_rank_top10_mar():
    ranked = rank_candidates(_load_candidates(), "besta_mar")
    assert len(ranked) == 10
    assert ranked[0].pap >= ranked[-1].pap
    assert ranked[0].personagem == "besta_mar"
    assert ranked[0].fator_principal.startswith("Destaque em")


def test_rank_top10_terra():
    ranked = rank_candidates(_load_candidates(), "besta_terra")
    assert len(ranked) == 10
    assert all(r.personagem == "besta_terra" for r in ranked)


def test_rank_with_prior_pap_smooths_scores():
    candidates = _load_candidates()
    prior = {"cand-mar-001": 0.9}
    ranked = rank_candidates(candidates, "besta_mar", prior_pap=prior)
    top = ranked[0]
    assert top.candidato_id == "cand-mar-001"


def test_rank_respects_top_n():
    ranked = rank_candidates(_load_candidates(), "besta_mar", top_n=3)
    assert len(ranked) == 3


def test_pap_within_percentage_range():
    for personagem in ("besta_mar", "besta_terra"):
        for r in rank_candidates(_load_candidates(), personagem):
            assert 0 <= r.pap <= 100
