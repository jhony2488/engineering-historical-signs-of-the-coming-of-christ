"""v1 prompt contracts — placeholders and required output fields."""

from pathlib import Path

import pytest

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "motor" / "prompts" / "v1"

REQUIRED_PLACEHOLDERS = {
    "extraction.txt": ["{{texto}}", "{{rag}}"],
    "reasoning.txt": ["{{dados}}"],
    "hermeneutics.txt": ["{{eventos}}", "{{rag}}"],
    "timeline.txt": ["{{eventos}}"],
    "hybrid_analysis.txt": [],
}

REQUIRED_OUTPUT_KEYS = {
    "extraction.txt": ["evento", "grau_tensao", "energia", "dimensao"],
    "reasoning.txt": ["pontuacao_logica", "fase_sugerida", "raciocinio"],
    "hermeneutics.txt": ["aderencia_profetica", "similaridades", "citacoes"],
    "timeline.txt": ["linha_temporal", "comparacao_7d", "eventos_chave"],
    "hybrid_analysis.txt": ["panorama", "aceleracao_transicao", "marco_zero_deslocamento"],
}


@pytest.mark.parametrize("filename", REQUIRED_PLACEHOLDERS.keys())
def test_prompt_file_exists(filename: str) -> None:
    assert (PROMPTS_DIR / filename).is_file()


@pytest.mark.parametrize("filename,placeholders", REQUIRED_PLACEHOLDERS.items())
def test_prompt_placeholders(filename: str, placeholders: list[str]) -> None:
    content = (PROMPTS_DIR / filename).read_text(encoding="utf-8")
    for ph in placeholders:
        assert ph in content, f"{filename} must contain {ph}"


@pytest.mark.parametrize("filename,keys", REQUIRED_OUTPUT_KEYS.items())
def test_prompt_declares_output_keys(filename: str, keys: list[str]) -> None:
    content = (PROMPTS_DIR / filename).read_text(encoding="utf-8")
    for key in keys:
        assert key in content, f"{filename} must document output field '{key}'"
