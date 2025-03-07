"""
API endpoints for search and RAG functionality.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from starlette import status

from app.schemas.rag import RAGRequest, RAGResponse
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
)
from app.services.rag_service import RAGService, get_rag_service
from app.services.search_service import SearchService, get_search_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/all")
async def search_all(
    page: int = Query(1),
    page_size: int = Query(10),
    search_service: SearchService = Depends(get_search_service),
):
    return await search_service.search_all(page, page_size)


@router.post("", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest, search_service: SearchService = Depends(get_search_service)
):
    """
    Search for documents based on a query.

    Args:
        request: Search request parameters

    Returns:
        Search results
    """
    try:
        results = await search_service.search(
            query=request.query,
            search_type=request.search_type,
            top_k=request.top_k,
            document_ids=request.document_ids,
        )

        search_results = [
            SearchResult(
                document_id=result["source"]["document_id"],
                document_title=result["source"]["document_title"],
                page_number=result["source"]["page_number"],
                text=result["source"]["text"],
                score=result["score"],
            )
            for result in results
        ]
        return SearchResponse(
            results=search_results,
            count=len(search_results),
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
    Generate an answer using RAG (without streaming).

    Args:
        request: RAG request parameters

    Returns:
        Generated answer with citations
    """
    if request.stream:
        raise HTTPException(
            status_code=400,
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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag/stream")
async def generate_rag_answer_stream(
    request: RAGRequest, rag_service: RAGService = Depends(get_rag_service)
):
    """
    Generate a streaming RAG answer.

    Args:
        request: RAG request parameters

    Returns:
        Streaming response with generated answer and citations
    """
    if not request.stream:
        raise HTTPException(
            status_code=400,
            detail="This endpoint requires streaming=true. Use /rag for non-streaming.",
        )

    async def stream_generator():
        """Generate streaming response."""
        try:
            async for chunk in rag_service.generate_streaming_answer(
                query=request.query,
                search_type=request.search_type,
                top_k=request.top_k,
                document_ids=request.document_ids,
            ):
                # Format each chunk as a Server-Sent Event
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            # End the stream
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
