"""Application configuration loaded from environment variables."""

import secrets
from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "quantumstock"
    ollama_model: str = "llama3.2:latest"
    ollama_base_url: str = "http://localhost:11434"
    spacy_model: str = "en_core_web_sm"
    jwt_secret: str = secrets.token_urlsafe(32)
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    admin_pass: str = "admin123"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8"}


settings = Settings()
