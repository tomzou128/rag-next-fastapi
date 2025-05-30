from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ConfigDict, model_serializer
from pydantic.alias_generators import to_camel

from app.utils.formatter import camelize_dict


class DocumentUpdateRequest(BaseModel):
    """Schema for document update requests"""

    id: str | None = Field(None, description="Document ID")
    description: str = Field(..., max_length=500, description="Document description")


class DocumentUpdateResponse(BaseModel):
    """Schema for document update responses"""

    id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Document filename")


class DocumentProcessResult(BaseModel):
    """Schema for document processing responses"""

    id: str = Field(None, description="Document ID")
    content_type: str = Field(..., description="Document content type")
    filename: str = Field(..., description="Document filename")
    upload_date: datetime = Field(..., description="Document upload date")
    page_count: int = Field(..., description="Document page count")
    metadata: dict = Field({}, description="Document metadata")
    text_chunks: list[dict[str, Any]] = Field([], description="Document text chunks")


class DocumentVO(BaseModel):
    """Schema for document responses with additional metadata"""

    id: str = Field(..., description="Document ID")
    content_type: str = Field(..., description="Document content type")
    filename: str = Field(..., description="Document filename")
    size: int = Field(..., description="File size in bytes")
    upload_date: datetime = Field(..., description="Document upload timestamp")
    last_modified: datetime = Field(..., description="Document last modified timestamp")
    metadata: dict = Field(..., description="Document metadata")

    @model_serializer
    def serialize_model(self):
        data = {
            "id": self.id,
            "content_type": self.content_type,
            "filename": self.filename,
            "size": self.size,
            "upload_date": self.upload_date,
            "last_modified": self.last_modified,
            "metadata": camelize_dict(self.metadata) if self.metadata else {},
        }
        # Apply the camelCase conversion to the top-level fields
        return {to_camel(k): v for k, v in data.items()}


class DocumentPresignedURLResponse(BaseModel):
    id: str = Field(..., description="Document ID")
    content_type: str = Field(..., description="Document content type")
    filename: str = Field(..., description="Document filename")
    url: str = Field(..., description="Document pre-signed url")

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
