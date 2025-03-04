import logging
from typing import Any

from fastapi import Request
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for generating and managing vector embeddings for text.

    This service uses Sentence Transformers to create dense vector
    representations of text, which are used for semantic search.
    """

    def __init__(self):
        """
        Initialize the embedding service with the specified model.
        """
        try:
            # Load the embedding model
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            self.batch_size = settings.EMBEDDING_BATCH_SIZE
            self.embedding_dim = settings.EMBEDDING_DIMENSION

            logger.info(f"Embedding model loaded with dimension: {self.embedding_dim}")
        except Exception as e:
            logger.error(f"Error initializing embedding model: {str(e)}")
            raise

    def generate_embedding(self, text: str) -> list[float]:
        """
        Generate a vector embedding for a given text.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the text embedding
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding generation")
            return [0.0] * self.embedding_dim

        try:
            # Generate embedding
            embedding = self.model.encode(text)

            # Convert to list and ensure it's the right dimension
            embedding_list = embedding.tolist()

            # Validate embedding dimension
            if len(embedding_list) != self.embedding_dim:
                logger.warning(
                    f"Embedding dimension mismatch: expected {self.embedding_dim}, got {len(embedding_list)}"
                )

            return embedding_list
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            # Return zeros if embedding fails
            return [0.0] * self.embedding_dim

    def generate_batch_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for a batch of texts.

        Args:
            texts: List of input texts to embed

        Returns:
            List of embeddings for each input text
        """
        if not texts:
            return []

        # Filter out empty texts and keep track of indices
        filtered_texts = []
        indices = []
        for i, text in enumerate(texts):
            if text and text.strip():
                filtered_texts.append(text)
                indices.append(i)

        if not filtered_texts:
            return [[0.0] * self.embedding_dim for _ in range(len(texts))]

        try:
            # Generate embeddings in batches for better memory management
            all_embeddings = []

            for i in range(0, len(filtered_texts), self.batch_size):
                batch = filtered_texts[i : i + self.batch_size]
                batch_embeddings = self.model.encode(
                    batch,
                    batch_size=self.batch_size,
                )
                all_embeddings.extend(batch_embeddings.tolist())

            # Create result with same length as input, with zeros for empty texts
            result = [[0.0] * self.embedding_dim for _ in range(len(texts))]

            # Fill in the embeddings at the correct positions
            for idx, embedding in zip(indices, all_embeddings):
                result[idx] = embedding

            return result
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            # Return zeros if embedding fails
            return [[0.0] * self.embedding_dim for _ in range(len(texts))]

    def process_chunks_for_indexing(
        self, chunks: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Process text chunks and add embeddings for indexing.

        Args:
            chunks: List of text chunks with metadata

        Returns:
            Enhanced chunks with embeddings added
        """
        try:
            # Extract texts for batch processing
            texts = [chunk["text"] for chunk in chunks]

            # Generate embeddings for all chunks
            embeddings = self.generate_batch_embeddings(texts)

            # Add embeddings to chunks
            for i, chunk in enumerate(chunks):
                chunk["embedding"] = embeddings[i]

            return chunks
        except Exception as e:
            logger.error(f"Error processing chunks for indexing: {str(e)}")
            raise


def get_embedding_service(request: Request) -> EmbeddingService:
    """
    FastAPI dependency to get the EmbeddingService instance.

    Args:
        request: FastAPI request object

    Returns:
        EmbeddingService instance from application state
    """
    return request.app.state.embedding_service
