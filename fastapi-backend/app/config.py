import json
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    This class uses pydantic-settings to load and validate configuration
    from environment variables with proper type checking.
    """

    ENVIRONMENT: str = "development"

    # APP settings
    APP_TITLE: str = "RAG API"
    APP_DESCRIPTION: str = "Retrieval Augmented Generation API with PDF processing"
    APP_VERSION: str = "0.1.0"

    # MinIO settings (for PDF storage)
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str

    # Text processing settings
    CHUNK_SIZE: int  # Text chunk size for processing
    CHUNK_OVERLAP: int  # Overlap between chunks

    # Embedding model settings
    EMBEDDING_MODEL_NAME: str
    EMBEDDING_BATCH_SIZE: int
    EMBEDDING_DIMENSION: int

    # ElasticSearch settings
    ELASTICSEARCH_URL: str
    ELASTICSEARCH_INDEX_NAME: str

    # OpenAI settings
    OPENAI_API_KEY: str
    OPENAI_MODEL_NAME: str

    # CORS settings
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_json(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        env_file=f".env.{os.getenv('ENVIRONMENT', 'development')}",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Create a global settings instance
settings = Settings()
