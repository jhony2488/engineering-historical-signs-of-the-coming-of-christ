import sys
import types

from motor.i18n.field_specs import FIELD_SPECS, REF_SPECS
from motor.i18n.translator import BIBLICAL_REF_MAP, TranslationService


def test_map_biblical_refs_en_to_pt():
    t = TranslationService()
    assert t.map_biblical_refs("Matt 24:6-7") == "Mt 24:6-7"
    assert t.map_biblical_refs("2 Thess 2:3") == "2Ts 2:3"
    assert t.map_biblical_refs("Rev 13:7") == "Ap 13:7"
    # não toca abreviações já em PT
    assert t.map_biblical_refs("Mt 24:6") == "Mt 24:6"


def test_map_biblical_refs_in_list_fields():
    t = TranslationService()
    obj = {"citacoes": ["Matt 24:6", "Rev 13:1"], "passagens_primarias": ["2 Thess 2:3"]}
    t.map_ref_fields(obj, REF_SPECS["hermeneutics"])
    assert obj["citacoes"] == ["Mt 24:6", "Ap 13:1"]
    assert obj["passagens_primarias"] == ["2Ts 2:3"]


def test_translate_fields_nested_paths(monkeypatch):
    calls: list[str] = []

    t = TranslationService()

    def fake(text):
        calls.append(text)
        return f"PT::{text}"

    monkeypatch.setattr(t, "translate_text", fake)
    obj = {
        "raciocinio": "reasoning",
        "incertezas": ["u1", "u2"],
        "key_drivers": [{"driver": "d1", "causal_explanation": "e1", "spc_score": 0.5}],
        "disclaimer": "disc",
        "pontuacao_logica": 0.7,
    }
    t.translate_fields(obj, FIELD_SPECS["reasoning"])
    assert obj["raciocinio"] == "PT::reasoning"
    assert obj["incertezas"] == ["PT::u1", "PT::u2"]
    assert obj["key_drivers"][0]["driver"] == "PT::d1"
    assert obj["key_drivers"][0]["causal_explanation"] == "PT::e1"
    assert obj["key_drivers"][0]["spc_score"] == 0.5
    assert obj["pontuacao_logica"] == 0.7


def test_translate_fields_tolerates_missing_keys():
    t = TranslationService()
    obj = {"descricao": "x"}
    # não deve falhar com paths que apontam para chaves ausentes
    t.translate_fields(obj, FIELD_SPECS["hermeneutics"])
    t.map_ref_fields(obj, REF_SPECS["hermeneutics"])
    assert obj["descricao"] == "x"


def test_translate_passthrough_when_unavailable(monkeypatch):
    monkeypatch.delitem(sys.modules, "transformers", raising=False)

    def boom(name, **kw):
        raise ImportError("no transformers")

    fake = types.ModuleType("transformers")
    fake.pipeline = boom
    monkeypatch.setitem(sys.modules, "transformers", fake)

    t = TranslationService()
    assert t.is_available is False
    assert t.translate_text("hello") == "hello"


def test_translate_uses_pipeline_and_glossary(monkeypatch):
    def fake_pipeline(task, **kw):
        assert task == "translation"
        assert kw["src_lang"] == "eng_Latn"
        assert kw["tgt_lang"] == "por_Latn"

        def run(text):
            return [{"translation_text": "a mark of the beast event"}]

        return run

    fake = types.ModuleType("transformers")
    fake.pipeline = fake_pipeline
    monkeypatch.setitem(sys.modules, "transformers", fake)

    t = TranslationService()
    assert t.is_available is True
    assert t.translate_text("x") == "a Marca da Besta event"


def test_biblical_map_covers_common_books():
    for book in ("Matt", "Mark", "Luke", "John", "Acts", "Rev", "Dan", "Isa", "2 Thess"):
        assert book in BIBLICAL_REF_MAP
