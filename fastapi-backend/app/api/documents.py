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
    title: str = Form(...),
    description: str = Form(""),
    document_service: DocumentService = Depends(get_document_service),
    search_service: SearchService = Depends(get_search_service),
):
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    document_create = DocumentUpdateRequest(
        id=None, title=title, description=description
    )

    try:
        # Process document and get chunks
        document_response, chunks = await document_service.process_pdf(
            file, document_create
        )

        await search_service.index_document(
            document_response["id"], document_create.title, chunks
        )

        return document_response
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
    List all uploaded documents.

    Returns:
        List of document metadata
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
    document_id: str,
    storage_service: StorageService = Depends(get_storage_service),
):
    try:
        download_info = storage_service.download_file(document_id)

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
    try:
        await search_service.delete_document(document_id)
        storage_service.delete_file(document_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
