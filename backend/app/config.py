from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    API_VERSION: str = "v1"


settings = Settings()
