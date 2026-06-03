from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    API_VERSION: str = "v1"
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    DEFAULT_LLM_PROVIDER: str = "openai"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    BUILD_TIMEOUT: int = 900  # 15 minutes
    MAX_BUILD_RETRIES: int = 2


settings = Settings()
