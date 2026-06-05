"""Testes de validação JSON Schema."""

import jsonschema
import pytest

from motor.schemas.validator import SchemaValidator, get_validator


def test_ranking_candidato_valid():
    v = get_validator()
    entry = {
        "posicao": 1,
        "candidato_id": "cand-mar-001",
        "nome": "Coalizão de Mediação Global",
        "personagem": "besta_mar",
        "probabilidade_atual": 72.1,
        "tendencia_24h": 2.1,
        "fator_principal": "Destaque em influencia_unificacao",
    }
    assert v.is_valid("ranking_candidato", entry)


def test_ranking_candidato_missing_required_raises():
    v = SchemaValidator()
    with pytest.raises(jsonschema.ValidationError):
        v.validate("ranking_candidato", {"nome": "incompleto"})


def test_ranking_candidato_invalid_personagem():
    v = SchemaValidator()
    entry = {
        "posicao": 1,
        "candidato_id": "x",
        "nome": "X",
        "personagem": "invalido",
        "probabilidade_atual": 50,
        "tendencia_24h": 0,
        "fator_principal": "teste",
    }
    assert v.is_valid("ranking_candidato", entry) is False


def test_evento_estruturado_valid():
    v = get_validator()
    evento = {
        "evento": "conflito_militar",
        "regiao": "oriente_medio",
        "grau_tensao": 0.8,
        "impacto_global": 0.7,
        "energia": "contracao",
        "dimensao": "macro",
    }
    assert v.is_valid("evento_estruturado", evento)


def test_validator_cached_instance():
    assert get_validator() is get_validator()
