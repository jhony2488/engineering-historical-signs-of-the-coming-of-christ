"""Spec de campos narrativos por artefato (traduzidos EN→PT) e campos de
referências bíblicas (mapeamento de abreviações EN→PT).

Sintaxe dos paths:
- "campo"            → dict["campo"]
- "campo[]"          → todos os itens de dict["campo"]
- "campo[].sub"      → sub-campo de cada item da lista
- "a.b"              → dict["a"]["b"] aninhado
"""

FIELD_SPECS: dict[str, list[str]] = {
    "evento": ["descricao"],
    "timeline": [
        "comparacao_7d",
        "eixo_dominante",
        "eventos_chave[]",
    ],
    "reasoning": [
        "raciocinio",
        "criterios_atendidos[]",
        "criterios_pendentes[]",
        "incertezas[]",
        "key_drivers[].driver",
        "key_drivers[].causal_explanation",
        "disclaimer",
    ],
    "hermeneutics": [
        "similaridades[]",
        "divergencias[]",
        "nota_hermeneutica",
        "adherence_caution",
        "disclaimer",
        "structural_echoes.primary_parallel",
        "structural_echoes.mechanisms_matched[]",
        "structural_echoes.key_divergences[]",
    ],
}

# Campos que recebem mapa de abreviações EN→PT em vez de tradução.
REF_SPECS: dict[str, list[str]] = {
    "hermeneutics": ["citacoes[]", "passagens_primarias[]"],
}
