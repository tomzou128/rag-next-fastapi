"""
API endpoints for document operations.
"""

import logging
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from starlette import status
from starlette.responses import StreamingResponse

from app.schemas.document import (
    DocumentUpdateRequest,
    DocumentUpdateResponse,
    DocumentVO,
    DocumentPresignedURLResponse,
)
from app.services.document_service import DocumentService, get_document_service
from app.services.search_service import SearchService, get_search_service
from app.services.storage_service import StorageService, get_storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post(
    "", response_model=DocumentUpdateResponse, status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile = File(...),
    description: str = Form(""),
    document_service: DocumentService = Depends(get_document_service),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Upload and process a PDF document.

    Args:
        file: The PDF file to upload
        description: Optional description for the document
        document_service: Service for document processing
        search_service: Service for document indexing

    Returns:
        Document ID and filename after successful upload

    Raises:
        400: If file is not a PDF
        500: For other processing errors
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )

    document_create = DocumentUpdateRequest(id=None, description=description)

    try:
        # Process document and get text chunks
        document_result = await document_service.process_pdf(file, document_create)

        # Index the document for search functionality
        await search_service.index_document(document_create, document_result)

        return DocumentUpdateResponse(
            id=document_result.id, filename=document_result.filename
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("", response_model=List[DocumentVO])
async def list_documents(
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    List all available documents.

    Args:
        storage_service: Service for file storage operations

    Returns:
        List of document information objects

    Raises:
        500: If listing documents fails
    """
    try:
        return storage_service.list_files()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{document_id}", response_model=DocumentVO)
async def get_document(
    document_id: str, storage_service: StorageService = Depends(get_storage_service)
):
    """
    Get information about a specific document.

    Args:
        document_id: ID of the document to retrieve
        storage_service: Service for file storage operations

    Returns:
        Document information object

    Raises:
        500: If retrieving document information fails
    """
    try:
        document = storage_service.get_file_info(document_id)
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{document_id}/download")
async def download_document(
    file_id: str,
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    Download a document as a file.

    Args:
        file_id: ID of the file to download
        storage_service: Service for file storage operations

    Returns:
        Streaming response with the file content

    Raises:
        500: If download fails
    """
    try:
        download_info = storage_service.download_file(file_id)

        return StreamingResponse(
            download_info["file_data"],
            media_type=download_info["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename={download_info["filename"]}"
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{file_id}/presigned", response_model=DocumentPresignedURLResponse)
async def get_presigned_url(
    document_id: str,
    storage_service: StorageService = Depends(get_storage_service),
):
    """
    Generate a presigned URL for direct document access.

    Args:
        document_id: ID of the document
        storage_service: Service for file storage operations

    Returns:
        Object containing the presigned URL

    Raises:
        500: If URL generation fails
    """
    try:
        return storage_service.generate_presigned_url(document_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    storage_service: StorageService = Depends(get_storage_service),
    search_service: SearchService = Depends(get_search_service),
):
    """
    Delete a document and its search index.

    Args:
        document_id: ID of the document to delete
        storage_service: Service for file storage operations
        search_service: Service for document indexing

    Returns:
        204 No Content on success

    Raises:
        500: If deletion fails
    """
    try:
        # Remove document from search index first
        await search_service.delete_document(document_id)
        # Then delete the actual file
        storage_service.delete_file(document_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
