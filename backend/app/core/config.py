from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"  # override in .env if needed
    database_url: str = "sqlite+aiosqlite:///./simulation.db"
    app_secret_key: str = "dev-secret-key"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
