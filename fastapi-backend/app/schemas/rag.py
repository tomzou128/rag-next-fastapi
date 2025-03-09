from typing import Any

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.search import SearchType


class RAGRequest(BaseModel):
    """Schema for RAG requests"""

    query: str = Field(..., description="User query for RAG processing")
    search_type: SearchType = Field(
        default=SearchType.HYBRID, description="Type of search to perform"
    )
    top_k: int = Field(default=5, description="Number of sources to use for context")
    document_ids: list[str] | None = Field(
        None, description="Optional filter for specific documents"
    )
    stream: bool = Field(default=False, description="Whether to stream the response")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Citation(BaseModel):
    """Schema for citation information"""

    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Document filename")
    marker: str = Field(..., description="Document marker")
    page_number: int | None = Field(default=None, description="Page number")
    text: str = Field(..., description="Cited text")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def model_dump(self, **kwargs) -> dict[str, Any]:
        data = super().model_dump(**kwargs)
        return {to_camel(key): value for key, value in data.items()}


class RAGResponse(BaseModel):
    """Schema for RAG response"""

    answer: str = Field(..., description="Generated answer")
    citations: list[Citation] = Field(
        ..., description="Sources used for answer generation"
    )
    query: str = Field(..., description="The original query")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
