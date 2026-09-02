import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    api_prefix: str = "/api"
    cors_origins: str = "*"

    database_url: str = "postgresql+psycopg://owem:not-a-real-password@localhost:5432/owem"
    sql_echo: bool = False

    receipt_storage_dir: str = ".receipts"
    dev_user_email: str = "payer@owem.local"

    ai_model: str = "claude-opus-5"
    anthropic_workspace_id: str = ""
    ai_timeout_seconds: int = 120
    ai_use_stub: bool | None = None

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def use_stub(self) -> bool:
        if self.ai_use_stub is not None:
            return self.ai_use_stub
        has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
        return not (has_key or (Path.home() / ".config" / "anthropic").is_dir())


settings = Settings()
