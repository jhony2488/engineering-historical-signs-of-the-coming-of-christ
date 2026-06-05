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
    bge_model_name: str = "BAAI/bge-m3"

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

    groq_model_extraction: str = "llama-3.1-8b-instant"
    groq_model_timeline: str = "llama-3.3-70b-versatile"
    groq_model_reasoning: str = "llama-3.3-70b-versatile"
    groq_model_hermeneutics: str = "llama-3.3-70b-versatile"

    feeds_config_path: Path = Field(default=CONFIG_DIR / "feeds.yaml")


@lru_cache
def get_settings() -> Settings:
    return Settings()
