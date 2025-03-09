from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class SearchType(str, Enum):
    """Enum for different search types"""

    KEYWORD = "keyword"  # Traditional keyword search
    SEMANTIC = "semantic"  # Vector/embedding search
    HYBRID = "hybrid"  # Combination of keyword and semantic


class SearchRequest(BaseModel):
    """Schema for search requests"""

    query: str = Field(..., description="Search query text")
    search_type: SearchType = Field(
        SearchType.HYBRID, description="Type of search to perform"
    )
    document_ids: list[str] | None = Field(
        default=None, description="Optional filter for specific documents"
    )
    page: int = Field(default=1, description="Page number")
    page_size: int = Field(default=20, description="Page size")
    include_highlight: bool = Field(default=False, description="Include highlight")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SearchResult(BaseModel):
    """Schema for individual search result"""

    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Document filename")
    page_number: int = Field(..., description="Page number where the text was found")
    text: str = Field(..., description="Matched text chunk")
    text_highlight: list[str] | None = Field(default=None, description="text highlight")
    score: float = Field(..., description="Relevance score")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SearchResponse(BaseModel):
    """Schema for search response"""

    results: list[SearchResult] = Field(..., description="List of search results")
    total: int = Field(default=0, description="Total number of results")
    count: int = Field(default=0, description="Number of results returned")
    query: str = Field(..., description="The original query")
    search_type: SearchType = Field(..., description="The search type used")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
