from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class DocumentBase(BaseModel):
    """Base schema for document information"""

    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")


class DocumentCreate(DocumentBase):
    """Schema for document creation requests"""

    pass


class DocumentResponse(DocumentBase):
    """Schema for document responses with additional metadata"""

    id: str = Field(..., description="Document unique identifier")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    page_count: int = Field(..., description="Number of pages in the document")
    upload_date: datetime = Field(..., description="Document upload timestamp")
    processing_status: str = Field(..., description="Document processing status")
    download_url: Optional[str] = Field(
        None, description="URL to download the document"
    )

    model_config = ConfigDict(from_attributes=True)
