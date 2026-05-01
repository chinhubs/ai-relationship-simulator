from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./simulation.db"
    app_secret_key: str = "dev-secret-key"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
