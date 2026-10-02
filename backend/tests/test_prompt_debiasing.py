from motor.prompts.loader import (
    PROMPT_VERSION,
    SYSTEM_DEBIAS_MESSAGE,
    compose_prompt,
    load_debiasing,
    with_system_debias,
)


def test_compose_prompt_injects_debiasing():
    text = compose_prompt("reasoning.txt")
    assert "Neutralidade ideológica" in text
    assert "Proibição de eixos partidários" in text
    assert "{{debiasing}}" not in text
    assert "{{dados}}" in text
    assert "pontuacao_logica" in text


def test_compose_prompt_extraction_keeps_placeholders():
    text = compose_prompt("extraction.txt")
    assert "{{texto}}" in text
    assert "{{rag}}" in text
    assert "Sanitização de nomes" in text or "cargos" in text.lower() or "Neutralidade" in text


def test_prompt_version_bumped():
    assert PROMPT_VERSION == "v1.2-debias"


def test_load_debiasing_non_empty():
    text = load_debiasing()
    assert len(text) > 50
    assert "fonte_opinativa" in text or "isomorfismos" in text


def test_system_debias_message_unified():
    assert "anti-viés" in SYSTEM_DEBIAS_MESSAGE.lower() or "mecanismos" in SYSTEM_DEBIAS_MESSAGE
    assert "esquerda" in SYSTEM_DEBIAS_MESSAGE or "direita" in SYSTEM_DEBIAS_MESSAGE
    assert with_system_debias("Camada X").startswith(SYSTEM_DEBIAS_MESSAGE)
