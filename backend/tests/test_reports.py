"""HTML report generator tests (Layer 9)."""

from motor.pipeline.reports.generator import ReportGenerator


def test_generate_html_contains_key_sections():
    gen = ReportGenerator()
    payload = {
        "data_referencia": "2026-06-04",
        "fase_atual": "FASE_II",
        "probabilidade_fase": 0.62,
        "indice_global": 0.58,
        "confianca": 0.71,
        "correlacao": {"alerta_falso_lider": True},
        "eventos_analisados": [
            {"evento": "conflito", "regiao": "global", "energia": "contracao"},
        ],
        "ranking_mar": [
            {"nome": "Coalizão Global", "probabilidade_atual": 72.1},
        ],
    }
    html = gen.generate_html(payload)
    assert "<!DOCTYPE html>" in html
    assert "2026-06-04" in html
    assert "FASE_II" in html
    assert "Alerta Falso Líder" in html
    assert "Coalizão Global" in html
    assert "conflito" in html


def test_generate_html_without_alerta():
    gen = ReportGenerator()
    html = gen.generate_html(
        {
            "fase_atual": "FASE_I",
            "probabilidade_fase": 0.4,
            "indice_global": 0.35,
            "confianca": 0.5,
            "correlacao": {},
            "eventos_analisados": [],
            "ranking_mar": [],
        }
    )
    assert "Alerta Falso Líder" not in html
