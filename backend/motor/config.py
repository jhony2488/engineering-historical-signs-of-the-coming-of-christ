from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = BACKEND_ROOT / "config"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    groq_api_key: str = ""
    openrouter_api_key: str = ""
    llm_dry_run: bool = False

    redis_url: str = "redis://localhost:6379/0"

    admin_api_key: str = "change-me"
    api_rate_limit: str = "30/minute"

    batch_cron_tz: str = "America/Sao_Paulo"
    batch_hour: int = 4
    max_documents_per_day: int = 50
    embedding_batch_size: int = 8
    bge_model_name: str = "all-MiniLM-L6-v2"

    false_leader_incongruence_threshold: float = 0.7
    phase_confidence_min: float = 0.55
    phase_transition_margin_max: float = 0.15
    auto_approve_criteria: bool = False

    weight_bayes: float = 0.35
    weight_hmm: float = 0.35
    weight_llm: float = 0.30

    acled_api_key: str = ""
    acled_email: str = ""

    api_bible_key: str = ""
    api_bible_id: str = "de4e12af7f28f599-02"
    reddit_enabled: bool = False
    reddit_user_agent: str = "SinaisHistoricosBot/1.0"
    google_trends_enabled: bool = False

    archive_dir: Path = Field(default=BACKEND_ROOT / "archive")
    cold_storage_years: int = 2
    embed_chunk_limit: int = 40
    ocr_images_dir: Path | None = None
    allow_gdelt_synthetic_fallback: bool = True

    groq_model_extraction: str = "llama-3.1-8b-instant"
    groq_model_timeline: str = "mistral-nemo"
    groq_model_reasoning: str = "deepseek-r1-distill"
    groq_model_hermeneutics: str = "gemma2-9b-it"

    ollama_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434"

    # SLM local in-process (llama.cpp / GGUF) — cascata por alias em
    # adapters/local_llm.py (LOCAL_MODEL_MAP). Extra: pip install -e ".[local]"
    local_llm_enabled: bool = False
    local_models_dir: Path = Field(default=BACKEND_ROOT / "models_cache")
    local_llm_ctx: int = 0  # 0 = usa o perfil do candidato
    local_llm_threads: int = 0  # 0 = usa o perfil do candidato

    # Classificadores locais (motor/ml/)
    relevance_gate_enabled: bool = True
    extraction_top_k: int = 10
    relevance_min_score: float = 0.0
    event_shadow_enabled: bool = True
    reranker_enabled: bool = True
    reranker_model_name: str = "BAAI/bge-reranker-v2-m3"
    reranker_candidate_multiplier: int = 4
    fulfillment_ce_weight: float = 0.5
    semantic_dedup_enabled: bool = True
    semantic_dedup_threshold: float = 0.92
    extraction_mode: str = "llm"  # llm | classifier_first
    classifier_confidence_min: float = 0.6
    distill_min_rows: int = 300
    sentiment_model_name: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

    # Pipeline linguagem: prompts internos pt (v1) | en (v2_en); campos
    # narrativos traduzidos EN→PT via NLLB antes de persistir
    prompts_lang: str = "pt"
    translate_narratives: bool = False
    translator_model: str = "facebook/nllb-200-distilled-600M"
    classifier_hints_enabled: bool = False

    # HMM — treino EM offline (Baum-Welch) via `train-phase-hmm`
    hmm_em_min_days: int = 30
    hmm_em_max_iter: int = 100
    hmm_em_tol: float = 1e-4

    # GNN — link prediction auto-supervisionado via `train-gnn` (extra [gnn])
    gnn_weights_path: Path = Field(default=CONFIG_DIR / "gnn_weights.pt")
    gnn_train_epochs: int = 200
    gnn_train_lr: float = 0.01
    gnn_neg_ratio: int = 1
    gnn_text_features_enabled: bool = False

    feeds_config_path: Path = Field(default=CONFIG_DIR / "feeds.yaml")

    site_url: str = "http://localhost:3000"
    email_from: str = ""
    email_dry_run: bool = True
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Retenção: dados ficam no Postgres (Supabase). Sem S3 / arquivos locais de cold storage.


@lru_cache
def get_settings() -> Settings:
    return Settings()
