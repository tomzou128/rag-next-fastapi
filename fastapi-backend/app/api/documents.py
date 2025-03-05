"""
API endpoints for document operations.
"""

from datetime import datetime
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

from app.schemas.document import DocumentResponse, DocumentCreate
from app.schemas.storage import DocumentInfo
from app.services.document_service import DocumentService, get_document_service
from app.services.search_service import SearchService, get_search_service
from app.services.storage_service import StorageService, get_storage_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse)
async def upload_document(
        # background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        title: str | None = Form(None),
        description: str | None = Form(None),
        document_service: DocumentService = Depends(get_document_service),
        search_service: SearchService = Depends(get_search_service),
):
    """
    Upload and process a PDF document.

    Args:
        file: PDF file to upload
        title: Document title
        description: Optional document description

    Returns:
        Document metadata and processing status
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if title is None:
        title = file.filename

    try:
        # Create document metadata
        document_create = DocumentCreate(title=title, description=description)

        # Process document and get chunks
        document_response, chunks = await document_service.process_pdf(
            file, document_create
        )

        await search_service.index_document(
            document_response.id, title, chunks
        )

        return document_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/", response_model=List[DocumentInfo])
async def list_documents(
        storage_service: StorageService = Depends(get_storage_service),
):
    """
    List all uploaded documents.

    Returns:
        List of document metadata
    """
    try:
        documents = storage_service.list_files()
        document_list = [
            DocumentInfo.model_validate(
                {
                    **document,
                    "last_modified": (
                        document["last_modified"].isoformat()
                        if isinstance(document.get("last_modified"), datetime)
                        else None
                    ),
                }
            )
            for document in documents
        ]
        return document_list
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{document_id}", response_model=DocumentInfo)
async def get_document(
        document_id: str, storage_service: StorageService = Depends(get_storage_service)
):
    """
    Get document metadata by ID.

    Args:
        document_id: Document ID

    Returns:
        Document metadata
    """
    try:
        document = storage_service.get_file_info(document_id)
        if isinstance(document.get("last_modified"), datetime):
            document["last_modified"] = document["last_modified"].isoformat()
        return DocumentInfo.model_validate(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{document_id}/download")
async def download_document(
        document_id: str,
        storage_service: StorageService = Depends(get_storage_service),
):
    """
    Download a document.

    Args:
        document_id: Document ID
        filename: Original filename

    Returns:
        PDF file as a streaming response
    """
    try:
        file_data, content_type, filename = storage_service.download_file(document_id)

        return StreamingResponse(
            file_data,
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
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
    try:
        await search_service.delete_document(document_id)
        storage_service.delete_file(document_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
