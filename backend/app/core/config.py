from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini-2025-04-14"  # override in .env if needed
    database_url: str = "sqlite+aiosqlite:///./simulation.db"
    app_secret_key: str = "dev-secret-key"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
