"""
API endpoints for search and RAG functionality.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette import status
from starlette.responses import StreamingResponse

from app.schemas.rag import RAGRequest, RAGResponse
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchType,
)
from app.services.rag_service import RAGService, get_rag_service
from app.services.search_service import SearchService, get_search_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/all")
async def search_all(
    page: int = Query(1),
    page_size: int = Query(10),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Retrieve all indexed documents with pagination.

    Args:
        page: Page number for pagination (default: 1)
        page_size: Number of results per page (default: 10)
        search_service: Injected search service

    Returns:
        Paginated list of all documents

    Raises:
        500: If search operation fails
    """
    try:
        return await search_service.search_all(page, page_size)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/keyword_search")
async def keyword_search(
    query: str = Query(...),
    page: int = Query(1),
    page_size: int = Query(10),
    include_highlight: bool = Query(False),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Search documents using keyword-based search.

    Args:
        query: Search keywords
        page: Page number for pagination (default: 1)
        page_size: Number of results per page (default: 10)
        include_highlight: Whether to include highlighted text in results (default: False)
        search_service: Injected search service

    Returns:
        Keyword search results with pagination

    Raises:
        500: If search operation fails
    """
    try:
        return await search_service.keyword_search(
            query, page, page_size, include_highlight
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/semantic_search")
async def semantic_search(
    query: str = Query(...),
    page: int = Query(1),
    page_size: int = Query(10),
    include_highlight: bool = Query(False),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Search documents using vector/semantic search based on embeddings.

    Args:
        query: Natural language query for semantic matching
        page: Page number for pagination (default: 1)
        page_size: Number of results per page (default: 10)
        include_highlight: Whether to include highlighted text in results (default: False)
        search_service: Injected search service

    Returns:
        Semantic search results with pagination

    Raises:
        500: If search operation fails
    """
    try:
        return await search_service.semantic_search(
            query, page, page_size, include_highlight
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/hybrid_search")
async def hybrid_search(
    query: str = Query(...),
    page: int = Query(1),
    page_size: int = Query(10),
    include_highlight: bool = Query(False),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Search documents using hybrid approach (combining keyword and semantic search).

    Args:
        query: Search query
        page: Page number for pagination (default: 1)
        page_size: Number of results per page (default: 10)
        include_highlight: Whether to include highlighted text in results (default: False)
        search_service: Injected search service

    Returns:
        Hybrid search results with pagination

    Raises:
        500: If search operation fails
    """
    try:
        return await search_service.hybrid_search(
            query, page, page_size, include_highlight
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest, search_service: SearchService = Depends(get_search_service)
):
    """
    General search endpoint that supports different search types through a request body.

    Args:
        request: Search request object containing query and search options
        search_service: Injected search service

    Returns:
        Structured search response with results and metadata

    Raises:
        500: If search operation fails
    """
    try:
        results = await search_service.search(**request.model_dump())

        search_results = [
            SearchResult(
                document_id=result["source"]["document_id"],
                filename=result["source"]["filename"],
                page_number=result["source"]["page_number"],
                text=result["source"]["text"],
                text_highlight=result.get("highlight", {}).get("text"),
                score=result["score"],
            )
            for result in results["hits"]
        ]
        return SearchResponse(
            results=search_results,
            total=results["total"],
            count=len(results["hits"]),
            query=request.query,
            search_type=request.search_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/rag", response_model=RAGResponse)
async def generate_rag_answer(
    request: RAGRequest, rag_service: RAGService = Depends(get_rag_service)
):
    """
    Generate an answer using Retrieval-Augmented Generation (RAG).

    Args:
        request: RAG request with query and search parameters
        rag_service: Injected RAG service

    Returns:
        Generated answer with retrieved context sources

    Raises:
        400: If streaming is requested (use /rag/stream endpoint instead)
        500: If RAG operation fails
    """
    if request.stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint doesn't support streaming. Use /rag/stream instead.",
        )

    try:
        response = await rag_service.generate_answer(
            query=request.query,
            search_type=request.search_type,
            top_k=request.top_k,
            document_ids=request.document_ids,
        )

        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/rag/stream")
async def generate_rag_answer_stream(
    query: str = Query(...),
    search_type: SearchType = Query(SearchType.HYBRID),
    top_k: int = Query(5),
    document_ids: list[str] = Query(None),
    stream: bool = Query(True),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Stream a generated answer using Retrieval-Augmented Generation (RAG).

    Args:
        query: User question
        search_type: Type of search to perform (default: HYBRID)
        top_k: Number of relevant chunks to retrieve (default: 5)
        document_ids: Optional list of document IDs to limit search
        stream: Must be True for this endpoint
        rag_service: Injected RAG service

    Returns:
        Streaming response with generated answer chunks

    Raises:
        400: If streaming is disabled (use /rag endpoint instead)
        500: If streaming operation fails
    """
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint requires streaming=true. Use /rag for non-streaming.",
        )

    async def stream_generator():
        """Generate streaming response."""
        try:
            yield f"data: {json.dumps({'type': 'ping', 'content': 'Connection established'})}\n\n"

            async for chunk in rag_service.generate_streaming_answer(
                query=query,
                search_type=search_type,
                top_k=top_k,
                document_ids=document_ids,
            ):
                # Format each chunk as a Server-Sent Event
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            logger.error(str(e))
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            # End the stream
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
