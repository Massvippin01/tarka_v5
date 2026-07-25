from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    NEO4J_URI: str = "bolt://localhost:7687"

    NEO4J_USERNAME: str = "neo4j"

    NEO4J_PASSWORD: str = "password"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()