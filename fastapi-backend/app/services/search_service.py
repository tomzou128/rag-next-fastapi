import logging
import re
from datetime import datetime, timezone

from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
from fastapi import Request, HTTPException
from starlette import status

from app.config import settings
from app.schemas.document import DocumentProcessResult, DocumentUpdateRequest
from app.schemas.search import SearchType
from app.services.embedding_service import EmbeddingService
from app.utils.formatter import parse_es_response_flexible

logger = logging.getLogger(__name__)


class SearchService:
    """
    Service for document indexing and searching using Elasticsearch.

    This service provides:
    1. Document indexing with both text and vector embeddings
    2. Hybrid search capabilities (keyword + semantic)
    3. Relevance ranking and filtering
    """

    def __init__(self, embedding_service: EmbeddingService):
        """
        Initialize the search service with Elasticsearch connection.

        Args:
            embedding_service: Service for generating text embeddings
        """
        self.embedding_service = embedding_service
        self.index_name = settings.ELASTICSEARCH_INDEX_NAME
        self.es = None

        self.highlight_query = {
            "fields": {
                "text": {
                    "fragment_size": 200,  # Longer fragments for context
                    "number_of_fragments": 2,  # Show up to 2 fragments
                    "order": "score",  # Order by fragment relevance
                },
                "description": {"fragment_size": 150, "number_of_fragments": 1},
                "filename": {},  # Default settings for filename
            },
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
        }

    async def initialize(self) -> None:
        """
        Initialize the Elasticsearch connection and set up indices.
        This should be called during application startup.
        """
        try:
            # Connect to Elasticsearch with proper async client
            self.es = AsyncElasticsearch(
                hosts=[settings.ELASTICSEARCH_URL],
                retry_on_timeout=True,
                max_retries=3,
                timeout=30,
            )

            # Check connection
            if not await self.es.ping():
                raise ConnectionError("Could not connect to Elasticsearch")

            logger.info(f"Connected to Elasticsearch at {settings.ELASTICSEARCH_URL}")

            # Ensure index exists with the right mapping
            await self._ensure_index_exists()

        except Exception as e:
            logger.error(f"Error connecting to Elasticsearch: {str(e)}", exc_info=True)
            raise

    async def _ensure_index_exists(self) -> None:
        """
        Create the document index if it doesn't exist, with appropriate mappings.
        The mapping includes configuration for both text search and vector search.
        """
        if await self.es.indices.exists(index=self.index_name):
            logger.info(f"Index '{self.index_name}' already exists")
            return

        # Define index mapping
        mapping = {
            "mappings": {
                "properties": {
                    "chunk_id": {"type": "keyword"},
                    "text": {"type": "text", "analyzer": "english"},
                    # Vector embedding for semantic search
                    "embedding": {
                        "type": "dense_vector",
                        "dims": settings.EMBEDDING_DIMENSION,
                        "index": True,  # Enable vector search
                        "similarity": "cosine",  # Use cosine similarity
                    },
                    "indexed_at": {"type": "date"},
                    # Document metadata
                    "document_id": {"type": "keyword"},
                    "filename": {"type": "text", "analyzer": "english"},
                    "description": {"type": "text", "analyzer": "english"},
                    "page_number": {"type": "integer"},
                    "author": {
                        "type": "text",
                        "fields": {"keyword": {"type": "keyword"}},
                    },
                    "metadata": {"type": "object"},
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "refresh_interval": "30s",
            },
        }

        await self.es.indices.create(index=self.index_name, body=mapping)
        logger.info(f"Created index '{self.index_name}' with vector search mapping")

    async def index_document(
        self,
        document_update: DocumentUpdateRequest,
        document_result: DocumentProcessResult,
    ) -> None:
        """
        Index a document's chunks in Elasticsearch.

        Args:
            document_id: Document identifier
            document_title: Document title
            chunks: List of text chunks with metadata
        """
        try:
            # Add embeddings to chunks
            chunks_with_embeddings = self.embedding_service.process_chunks_for_indexing(
                document_result.text_chunks
            )

            # Prepare bulk indexing actions
            actions = []
            for chunk in chunks_with_embeddings:
                actions.append(
                    {
                        "_index": self.index_name,
                        "_id": chunk["chunk_id"],
                        "_source": {
                            "chunk_id": chunk["chunk_id"],
                            "text": chunk["text"],
                            "embedding": chunk["embedding"],
                            "document_id": document_result.id,
                            "filename": document_result.filename,
                            "description": document_update.description,
                            "page_number": chunk["page_number"],
                            "author": document_result.metadata.get("author"),
                            "indexed_at": datetime.now(timezone.utc).isoformat(),
                        },
                    }
                )

            # Bulk index
            if actions:
                success, failed = await async_bulk(self.es, actions)
                logger.info(
                    f"Indexed {success} chunks for document ID: {document_result.id}"
                )
                if failed:
                    logger.warning(f"Failed to index {len(failed)} chunks: {failed}")
            else:
                logger.warning(
                    f"No chunks to index for document ID: {document_result.id}"
                )

        except Exception as e:
            logger.error(f"Error indexing document: {str(e)}")
            raise

    async def delete_document(self, document_id: str) -> None:
        """
        Delete a document and all its chunks from the index.

        Args:
            document_id: Document identifier
        """
        try:
            # Delete by query based on document_id
            await self.es.delete_by_query(
                index=settings.ELASTICSEARCH_INDEX_NAME,
                body={"query": {"term": {"document_id": document_id}}},
            )
            logger.info(f"Deleted document {document_id} from index")
        except Exception as e:
            logger.error(f"Error deleting document from index: {str(e)}")
            raise

    async def search_all(self, page: int, page_size: int):
        page = max(1, page)
        start = (page - 1) * page_size
        try:
            body = {
                "query": {"match_all": {}},
                "from": start,
                "size": page_size,
            }
            response = await self.es.search(index=self.index_name, body=body)
            return parse_es_response_flexible(
                response.body, ignore_fields=["embedding"]
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
            )

    def _create_keyword_query(self, query: str, tie_breaker: float = 0.3):
        return {
            "multi_match": {
                "query": query,
                "fields": [
                    "filename^4",
                    "description^2",
                    "text^1.5",
                    "author^1.2",
                    "metadata.*^0.5",
                    "author.keyword^1.5",
                ],
                "analyzer": "english",
                "type": "best_fields",
                "tie_breaker": tie_breaker,
                "minimum_should_match": "50%",
            }
        }

    async def keyword_search(
        self,
        query: str,
        document_ids: list[str] | None = None,
        page: int = 1,
        page_size: int = 10,
        include_highlight: bool = False,
    ):
        page = max(1, page)
        start = (page - 1) * page_size

        keyword_query = self._create_keyword_query(query)
        if document_ids and len(document_ids) > 0:
            keyword_query = {
                "bool": {
                    "must": [keyword_query],
                    "filter": [{"terms": {"document_id": document_ids}}],
                }
            }
        highlight_query = self.highlight_query if include_highlight else None

        response = await self.es.search(
            index=self.index_name,
            query=keyword_query,
            from_=start,
            size=page_size,
            source={"excludes": ["embedding"]},
            highlight=highlight_query,
        )
        return parse_es_response_flexible(response, include_highlight=include_highlight)

    def _create_knn_query(
        self,
        query: str,
        page_size: int = 10,
        field: str = "embedding",
    ) -> dict:
        query_embedding = self.embedding_service.generate_embedding(query)
        return {
            "field": field,
            "query_vector": query_embedding,
            "k": page_size,  # Number of nearest neighbors to find
            "num_candidates": page_size * 4,  # Typically 2-4x k for good recall
        }

    async def semantic_search(
        self,
        query: str,
        document_ids: list[str] | None = None,
        page: int = 1,
        page_size: int = 10,
        include_highlight: bool = False,
    ) -> dict:
        page = max(1, page)
        start = (page - 1) * page_size

        knn_query = self._create_knn_query(query, page_size)
        if document_ids and len(document_ids) > 0:
            knn_query["filter"] = [{"terms": {"document_id": document_ids}}]
        logger.info(knn_query)
        highlight_query = self.highlight_query if include_highlight else None

        response = await self.es.search(
            index=self.index_name,
            knn=knn_query,
            from_=start,
            size=page_size,
            source={"excludes": ["embedding"]},
            highlight=highlight_query,
        )
        return parse_es_response_flexible(response, include_highlight=include_highlight)

    async def hybrid_search(
        self,
        query: str,
        document_ids: list[str] | None = None,
        page: int = 1,
        page_size: int = 10,
        include_highlight: bool = False,
        keyword_weight: float = 0.3,
        semantic_weight: float = 0.7,
    ) -> dict:
        """
        Perform a hybrid search combining both keyword and semantic search.

        Args:
            query: The search query string
            keyword_weight: Weight of the keyword search component (0.0 to 1.0)
            semantic_weight: Weight of the semantic search component (0.0 to 1.0)
            page: Page number for pagination
            page_size: Number of results per page
            include_highlight: Whether to include highlighted text in results

        Returns:
            Processed search results
        """
        page = max(1, page)
        start = (page - 1) * page_size

        # Generate embedding for semantic search
        keyword_query = self._create_keyword_query(query)
        keyword_query["multi_match"]["boost"] = keyword_weight
        if document_ids and len(document_ids) > 0:
            keyword_query = {
                "bool": {
                    "must": [keyword_query],
                    "filter": [{"terms": {"document_id": document_ids}}],
                }
            }

        knn_query = self._create_knn_query(query, page_size)
        knn_query["boost"] = semantic_weight
        if document_ids and len(document_ids) > 0:
            knn_query["filter"] = [{"terms": {"document_id": document_ids}}]

        # Create highlight query if needed
        highlight_query = self.highlight_query if include_highlight else None

        # Execute the search
        response = await self.es.search(
            index=self.index_name,
            query=keyword_query,
            knn=knn_query,
            from_=start,
            size=page_size,
            source={"excludes": ["embedding"]},
            highlight=highlight_query,
        )

        return parse_es_response_flexible(response, include_highlight=include_highlight)

    async def search(
        self,
        query: str,
        search_type: SearchType = SearchType.HYBRID,
        document_ids: list[str] | None = None,
        page: int = 1,
        page_size: int = 20,  # Typically want more results for a search engine
        include_highlight: bool = True,  # Highlights are important for search engines
    ):
        if search_type == SearchType.KEYWORD:
            return await self.keyword_search(
                query=query,
                document_ids=document_ids,
                page=page,
                page_size=page_size,
                include_highlight=include_highlight,
            )
        elif search_type == SearchType.SEMANTIC:
            return await self.semantic_search(
                query=query,
                document_ids=document_ids,
                page=page,
                page_size=page_size,
                include_highlight=include_highlight,
            )
        elif search_type == SearchType.HYBRID:
            # Search engine queries typically benefit from more balanced weights
            # Users expect both keyword matches and semantic understanding
            return await self.hybrid_search(
                query=query,
                document_ids=document_ids,
                page=page,
                page_size=page_size,
                include_highlight=include_highlight,
                keyword_weight=0.5,  # More balanced approach
                semantic_weight=0.5,  # Equal weight to semantic search
            )

    def _preprocess_rag_query(self, query):
        # Handle common question patterns
        instruction_patterns = [
            r"^can you (tell me|explain|describe|provide information on|help me understand) ",
            r"^(what|who|where|when|why|how) (is|are|was|were|do|does|did) ",
            r"^i('m| am) (looking|searching|trying) to (find|understand|learn) (about )?",
        ]

        for pattern in instruction_patterns:
            query = re.sub(pattern, "", query, flags=re.IGNORECASE)

        # Remove filler words that don't add meaning
        filler_words = [
            "please",
            "actually",
            "basically",
            "just",
            "like",
            "so",
            "very",
            "really",
        ]
        for word in filler_words:
            query = re.sub(r"\b" + word + r"\b", "", query, flags=re.IGNORECASE)

        # Clean up extra spaces and punctuation
        query = re.sub(r"\s+", " ", query).strip()
        query = query.rstrip("?.!")

        return query

    def _determine_query_weights(self, query: str) -> tuple[float, float]:
        """Dynamically determine weights based on query characteristics."""
        token_count = len(query.split())

        if token_count <= 3:
            return 0.7, 0.3  # Short query - more keyword focus
        elif token_count >= 8:
            return 0.2, 0.8  # Long query - more semantic focus
        else:
            return 0.4, 0.6  # Medium query - balanced but slight semantic preference

    async def rag_context_query(
        self,
        query: str,
        search_type: SearchType = SearchType.HYBRID,
        document_ids: list[str] | None = None,
        page_size: int = 5,  # Fewer, higher quality results for RAG
    ):
        processed_query = self._preprocess_rag_query(query)

        if search_type == SearchType.KEYWORD:
            return await self.keyword_search(
                query=processed_query,
                document_ids=document_ids,
                page=1,
                page_size=page_size,
                include_highlight=False,
            )
        elif search_type == SearchType.SEMANTIC:
            return await self.semantic_search(
                query=processed_query,
                document_ids=document_ids,
                page=1,
                page_size=page_size,
                include_highlight=False,
            )
        elif search_type == SearchType.HYBRID:
            keyword_weight, semantic_weight = self._determine_query_weights(
                processed_query
            )
            # Search engine queries typically benefit from more balanced weights
            # Users expect both keyword matches and semantic understanding
            return await self.hybrid_search(
                query=processed_query,
                document_ids=document_ids,
                page=1,
                page_size=page_size,
                include_highlight=False,
                keyword_weight=keyword_weight,  # More balanced approach
                semantic_weight=semantic_weight,  # Equal weight to semantic search
            )

    async def close(self):
        if self.es:
            await self.es.close()
            logger.info("Elasticsearch connection closed")


def get_search_service(request: Request) -> SearchService:
    return request.app.state.search_service
