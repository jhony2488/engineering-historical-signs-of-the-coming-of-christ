from motor.prompts import loader

PT_FILES = [p.name for p in (loader.PROMPTS_DIR).iterdir() if p.suffix == ".txt"]
EN_DIR = loader.PROMPTS_DIR.parent / "v2_en"


def test_v2_en_mirrors_v1_files():
    en_files = [p.name for p in EN_DIR.iterdir() if p.suffix == ".txt"]
    assert sorted(en_files) == sorted(PT_FILES)


def test_v2_en_keeps_markers_and_enums():
    for name in PT_FILES:
        pt = (loader.PROMPTS_DIR / name).read_text(encoding="utf-8")
        en = (EN_DIR / name).read_text(encoding="utf-8")
        for marker in (
            "{{texto}}",
            "{{rag}}",
            "{{eventos}}",
            "{{dados}}",
            "{{abm}}",
            "{{threat}}",
            "{{resilience}}",
            "{{debiasing}}",
        ):
            if marker in pt:
                assert marker in en, f"{name}: marker {marker} ausente no EN"
        for token in ("expansao", "contracao", "FASE_I", "json"):
            if token in pt.lower():
                assert token.lower() in en.lower(), f"{name}: '{token}' ausente no EN"


def test_loader_respects_prompts_lang(monkeypatch):
    from motor.config import get_settings

    monkeypatch.setenv("PROMPTS_LANG", "en")
    get_settings.cache_clear()
    assert loader.prompts_lang() == "en"
    assert loader.get_prompt_version() == "v2.0-en"
    composed = loader.compose_prompt("extraction.txt")
    assert "ROLE" in composed and "ANTI-BIAS" in composed.upper()

    monkeypatch.setenv("PROMPTS_LANG", "pt")
    get_settings.cache_clear()
    assert loader.prompts_lang() == "pt"
    assert loader.get_prompt_version() == "v1.2-debias"
    composed = loader.compose_prompt("extraction.txt")
    assert "PAPEL" in composed


def test_system_debias_language(monkeypatch):
    from motor.config import get_settings

    monkeypatch.setenv("PROMPTS_LANG", "en")
    get_settings.cache_clear()
    assert "anti-bias" in loader.with_system_debias("x").lower()

    monkeypatch.delenv("PROMPTS_LANG", raising=False)
    get_settings.cache_clear()
    assert "anti-viés" in loader.with_system_debias("x")
