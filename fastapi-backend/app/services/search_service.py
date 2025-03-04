import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
from fastapi import Request, HTTPException
from starlette import status

from app.config import settings
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

        # Check if index exists
        if await self.es.indices.exists(index=self.index_name):
            logger.info(f"Index '{self.index_name}' already exists")
            return

        # Define index mapping with text and vector fields
        mapping = {
            "mappings": {
                "properties": {
                    # Document metadata
                    "document_id": {"type": "keyword"},
                    "chunk_id": {"type": "keyword"},
                    "page_number": {"type": "integer"},
                    # Document content for text search
                    "text": {
                        "type": "text",
                        "analyzer": "standard",
                        # Store original text for highlighting
                        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                    },
                    # Vector embedding for semantic search
                    "embedding": {
                        "type": "dense_vector",
                        "dims": settings.EMBEDDING_DIMENSION,
                        "index": True,  # Enable vector search
                        "similarity": "cosine",  # Use cosine similarity
                    },
                    # Additional metadata
                    "title": {"type": "text"},
                    "indexed_at": {"type": "date"},
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "standard": {"type": "standard", "stopwords": "_english_"}
                    }
                },
            },
        }

        # Create index with mapping
        await self.es.indices.create(index=self.index_name, body=mapping)
        logger.info(f"Created index '{self.index_name}' with vector search mapping")

    async def index_document(
        self, document_id: str, document_title: str, chunks: List[Dict[str, Any]]
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
                chunks
            )

            # Prepare bulk indexing actions
            actions = []
            for chunk in chunks_with_embeddings:
                actions.append(
                    {
                        "_index": self.index_name,
                        "_id": chunk["chunk_id"],
                        "_source": {
                            "document_id": document_id,
                            "chunk_id": chunk["chunk_id"],
                            "page_number": chunk["page_number"],
                            "text": chunk["text"],
                            "embedding": chunk["embedding"],
                            "title": document_title,
                            "indexed_at": datetime.now(timezone.utc).isoformat(),
                        },
                    }
                )

            # Bulk index
            if actions:
                success, failed = await async_bulk(self.es, actions)
                logger.info(f"Indexed {success} chunks for document {document_id}")
                if failed:
                    logger.warning( f"Failed to index {len(failed)} chunks: {failed}" )
            else:
                logger.warning(f"No chunks to index for document {document_id}")

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
        if page < 1:
            page = 1
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

    async def search(
        self,
        query: str,
        search_type: SearchType = SearchType.HYBRID,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant document chunks based on query.

        Args:
            query: Search query text
            search_type: Type of search to perform (keyword, semantic, or hybrid)
            top_k: Number of results to return
            document_ids: Optional list of document IDs to restrict search

        Returns:
            List of search results with metadata
        """
        try:
            results = []

            # Prepare filter if document IDs are specified
            doc_filter = None
            if document_ids:
                doc_filter = {"terms": {"document_id": document_ids}}

            if search_type == SearchType.KEYWORD or search_type == SearchType.HYBRID:
                # Keyword search query
                keyword_query = {
                    "query": {
                        "bool": {
                            "must": [{"match": {"text": query}}],
                            "filter": doc_filter if doc_filter else [],
                        }
                    },
                    "size": top_k,
                }

                # Execute keyword search
                keyword_results = self.es.search(
                    index=settings.ELASTICSEARCH_INDEX_NAME, body=keyword_query
                )

                # Process results
                for hit in keyword_results["hits"]["hits"]:
                    results.append(
                        {
                            "document_id": hit["_source"]["document_id"],
                            "document_title": hit["_source"]["title"],
                            "page_number": hit["_source"]["page_number"],
                            "text": hit["_source"]["text"],
                            "score": hit["_score"],
                            "search_type": "keyword",
                        }
                    )

            if search_type == SearchType.SEMANTIC or search_type == SearchType.HYBRID:
                # Generate query embedding
                query_embedding = self.embedding_service.generate_embedding(query)

                # Create semantic search query
                semantic_query = {
                    "query": {"bool": {"filter": doc_filter if doc_filter else []}},
                    "knn": {
                        "field": "embedding",
                        "query_vector": query_embedding,
                        "k": top_k,
                        "num_candidates": top_k * 2,
                    },
                    "size": top_k,
                }

                # Execute semantic search
                semantic_results = await self.es.search(
                    index=settings.ELASTICSEARCH_INDEX_NAME, body=semantic_query
                )

                # Process results
                for hit in semantic_results["hits"]["hits"]:
                    results.append(
                        {
                            "document_id": hit["_source"]["document_id"],
                            "document_title": hit["_source"]["title"],
                            "page_number": hit["_source"]["page_number"],
                            "text": hit["_source"]["text"],
                            "score": hit["_score"],
                            "search_type": "semantic",
                        }
                    )

            # For hybrid search, combine and deduplicate results
            if search_type == SearchType.HYBRID:
                # Deduplicate by chunk_id
                seen_chunks = set()
                deduplicated_results = []

                for result in results:
                    chunk_id = f"{result['document_id']}_{result['page_number']}_{result['text'][:50]}"
                    if chunk_id not in seen_chunks:
                        seen_chunks.add(chunk_id)
                        deduplicated_results.append(result)

                results = deduplicated_results

            # Sort by score descending and limit to top_k
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]

        except Exception as e:
            logger.error(f"Error during search: {str(e)}")
            raise

    async def close(self):
        if self.es:
            self.es.close()
            logger.info("Elasticsearch connection closed")


def get_search_service(request: Request) -> SearchService:
    return request.app.state.search_service
