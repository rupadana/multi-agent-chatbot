from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Konfigurasi aplikasi, dibaca dari environment / file .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default provider LLM (OpenAI-compatible). Dapat dioverride per-agent.
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    database_url: str = "sqlite:///./chatbot.db"
    cors_origins: str = "http://localhost:3000"

    # Autentikasi (JWT). GANTI jwt_secret di produksi lewat .env!
    jwt_secret: str = "ubah-secret-ini-di-produksi-please-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 hari

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
