from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.search import SearchType


class RAGRequest(BaseModel):
    """Schema for RAG requests"""

    query: str = Field(..., description="User query for RAG processing")
    search_type: SearchType = Field(
        default=SearchType.HYBRID, description="Type of search to perform"
    )
    top_k: int = Field(default=5, description="Number of sources to use for context")
    document_ids: Optional[List[str]] = Field(
        None, description="Optional filter for specific documents"
    )
    stream: bool = Field(default=False, description="Whether to stream the response")


class Citation(BaseModel):
    """Schema for citation information"""

    document_id: str = Field(..., description="Document ID")
    document_title: str = Field(..., description="Document title")
    page_number: Optional[int] = Field(None, description="Page number")
    text: str = Field(..., description="Cited text")


class RAGResponse(BaseModel):
    """Schema for RAG response"""

    answer: str = Field(..., description="Generated answer")
    citations: List[Citation] = Field(
        ..., description="Sources used for answer generation"
    )
    query: str = Field(..., description="The original query")
