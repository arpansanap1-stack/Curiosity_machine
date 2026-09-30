"""Application configuration and settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for .env in current directory or parent directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
PARENT_ENV_PATH = BASE_DIR.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ENV_PATH), str(PARENT_ENV_PATH)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gemini API settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"

    # Database
    database_url: str = "sqlite+aiosqlite:///./curiosity.db"

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Degraded mode flag (fallback to Wikipedia links)
    force_degraded_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
