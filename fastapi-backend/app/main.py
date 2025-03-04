"""
Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import documents, search
from app.config import settings
from app.services import (
    StorageService,
    DocumentService,
    EmbeddingService,
    SearchService,
    RAGService,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

logger.info(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_service = StorageService()
    app.state.storage_service = storage_service
    logger.info("StorageService Initialized")

    document_service = DocumentService(storage_service=storage_service)
    app.state.document_service = document_service
    logger.info("DocumentService Initialized")

    embedding_service = EmbeddingService()
    app.state.embedding_service = embedding_service
    logger.info("EmbeddingService Initialized")

    search_service = SearchService(embedding_service=embedding_service)
    await search_service.initialize()
    app.state.search_service = search_service
    logger.info("SearchService Initialized")

    rag_service = RAGService(search_service=search_service)
    app.state.rag_service = rag_service
    logger.info("RAGService Initialized")

    yield

    # 清理阶段
    await search_service.close()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_TITLE,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(documents.router)
app.include_router(search.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
