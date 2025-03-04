from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class SearchType(str, Enum):
    """Enum for different search types"""

    KEYWORD = "keyword"  # Traditional keyword search
    SEMANTIC = "semantic"  # Vector/embedding search
    HYBRID = "hybrid"  # Combination of keyword and semantic


class SearchRequest(BaseModel):
    """Schema for search requests"""

    query: str = Field(..., description="Search query text")
    search_type: SearchType = Field(
        default=SearchType.HYBRID, description="Type of search to perform"
    )
    top_k: int = Field(default=5, description="Number of top results to return")
    document_ids: Optional[List[str]] = Field(
        None, description="Optional filter for specific documents"
    )


class SearchResult(BaseModel):
    """Schema for individual search result"""

    document_id: str = Field(..., description="Document ID")
    document_title: str = Field(..., description="Document title")
    page_number: Optional[int] = Field(
        None, description="Page number where the text was found"
    )
    text: str = Field(..., description="Matched text chunk")
    score: float = Field(..., description="Relevance score")


class SearchResponse(BaseModel):
    """Schema for search response"""

    results: List[SearchResult] = Field(..., description="List of search results")
    count: int = Field(0, description="Number of results returned")
    search_type: SearchType = Field(..., description="The search type used")
    query: str = Field(..., description="The original query")
