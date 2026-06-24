from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    API_VERSION: str = "v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-flash-latest"  
    DEFAULT_LLM_PROVIDER: str = "openai"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 8192
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    BUILD_TIMEOUT: int = 900  # 15 minutes
    MAX_BUILD_RETRIES: int = 2
    STORAGE_TYPE: str = "local"  # or "s3"
    LOCAL_STORAGE_PATH: str = "./storage/apks"
    S3_BUCKET_NAME: str | None = None
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None


settings = Settings()
