import io
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Any

import fitz  # PyMuPDF
import nltk
from fastapi import UploadFile, HTTPException, Request
from nltk.tokenize import sent_tokenize

from app.config import settings
from app.schemas.document import DocumentCreate, DocumentResponse
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service for processing PDF documents and extracting text content.

    This service handles:
    1. PDF text extraction using PyMuPDF
    2. Text chunking for efficient processing and indexing
    3. Document metadata extraction
    """

    # NLTK resources to download/check
    NLTK_RESOURCES = [("tokenizers/punkt", "punkt")]

    def __init__(self, storage_service: StorageService):
        """
        Initialize the document service.

        Args:
            storage_service: The storage service for file operations
        """
        self.storage_service = storage_service
        self._initialize_nltk_resources()

    def _initialize_nltk_resources(self) -> None:
        """
        Initialize NLTK resources needed for text processing.
        Downloads required resources if they're not already available.
        """
        for resource_path, resource_name in self.NLTK_RESOURCES:
            try:
                # Check if the resource is already downloaded
                nltk.data.find(resource_path)
                logger.debug(f"NLTK resource '{resource_name}' is already available")
            except LookupError:
                # Download the resource if not found
                logger.info(f"Downloading NLTK resource: {resource_name}")
                nltk.download(resource_name, quiet=True)
                logger.info(f"Successfully downloaded NLTK resource: {resource_name}")

    async def process_pdf(
            self, file: UploadFile, document_create: DocumentCreate
    ) -> Tuple[DocumentResponse, List[Dict[str, Any]]]:
        """
        Process an uploaded PDF file:
        1. Upload to storage
        2. Extract text and metadata
        3. Chunk text for indexing

        Args:
            file: The uploaded PDF file
            document_create: Document metadata provided by user

        Returns:
            Tuple of (document metadata, list of text chunks)

        Raises:
            HTTPException: If processing fails
        """
        try:
            file_content = await file.read()

            # Upload to MinIO
            upload_result = self.storage_service.upload_file(
                file_obj=io.BytesIO(file_content),
                filename=file.filename or "document.pdf",
                content_type=file.content_type or "application/pdf",
                metadata={
                    "title": document_create.title,
                    "description": document_create.description,
                    "upload_date": datetime.now(timezone.utc).isoformat(),
                    "filename": file.filename or "document.pdf",
                },
            )

            document_id = upload_result["id"]
            filename = upload_result["filename"]

            # Process with PyMuPDF
            doc_info, chunks = self._extract_pdf_content(
                io.BytesIO(file_content), document_id
            )

            # Create document response
            document_response = DocumentResponse(
                id=document_id,
                filename=filename,
                file_size=len(file_content),
                page_count=doc_info["page_count"],
                upload_date=datetime.now(timezone.utc),
                processing_status="processed",
            )

            return document_response, chunks
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"PDF processing failed: {str(e)}"
            )
        finally:
            # Reset file pointer
            await file.seek(0)

    def _extract_pdf_content(
            self, file_bytes: io.BytesIO, document_id: str
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Extract text and metadata from a PDF file.

        Args:
            file_bytes: BytesIO object containing the PDF
            document_id: Document ID for reference

        Returns:
            Tuple of (document metadata, list of text chunks)
        """
        try:
            file_bytes.seek(0)
            # Open PDF with PyMuPDF
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")

            # Document metadata
            doc_info = {
                "page_count": len(pdf_document),
                "metadata": pdf_document.metadata,
            }

            # Extract and chunk text
            all_chunks = []

            for page_num, page in enumerate(pdf_document):
                # Extract text from page
                text = page.get_text()

                # Skip if page is empty
                if not text.strip():
                    continue

                # Create chunks from the page text
                page_chunks = self._chunk_text(text, document_id, page_num + 1)
                all_chunks.extend(page_chunks)

            pdf_document.close()
            return doc_info, all_chunks

        except Exception as e:
            logger.error(f"Error extracting PDF content: {str(e)}")
            raise
        finally:
            file_bytes.seek(0)

    def _tokenize_text(self, text: str) -> List[str]:
        try:
            return sent_tokenize(text)
        except Exception as e:
            logger.warning(f"Sentence tokenization failed: {str(e)}. Using fallback.")
            return [s.strip() + "." for s in text.split(".") if s.strip()]

    def _chunk_text(
            self, text: str, document_id: str, page_num: int
    ) -> List[Dict[str, Any]]:
        """
        Split text into manageable chunks for processing and indexing.

        Args:
            text: Text to chunk
            document_id: Document ID for reference
            page_num: Page number where text was extracted

        Returns:
            List of chunk dictionaries with metadata
        """
        # Clean text (remove excessive whitespace, etc.)
        text = re.sub(r"\s+", " ", text).strip()

        # Use NLTK to split into sentences
        sentences = self._tokenize_text(text)

        chunks = []
        current_chunk = ""

        # Create chunks with appropriate size
        for sentence in sentences:
            # If adding this sentence exceeds chunk size and we already have content,
            # finalize the current chunk and start a new one
            if (
                    len(current_chunk) + len(sentence) > settings.CHUNK_SIZE
                    and current_chunk
            ):
                chunk_id = str(uuid.uuid4())
                chunks.append(
                    {
                        "chunk_id": chunk_id,
                        "document_id": document_id,
                        "page_number": page_num,
                        "text": current_chunk,
                    }
                )

                # Start new chunk with overlap (keeping some context from previous chunk)
                current_chunk = (
                        current_chunk[-settings.CHUNK_OVERLAP:] + " " + sentence
                )
            else:
                # Add sentence to current chunk
                current_chunk += " " + sentence if current_chunk else sentence

        # Add the final chunk if it has content
        if current_chunk:
            chunk_id = str(uuid.uuid4())
            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "page_number": page_num,
                    "text": current_chunk,
                }
            )

        return chunks

    def get_document_chunks(self, document_id: str) -> List[Dict[str, Any]]:
        """
        Get all chunks for a specific document by re-processing it.
        Useful for re-indexing or processing existing documents.

        Args:
            document_id: Document ID
            storage_service: Storage service instance

        Returns:
            List of text chunks
        """
        try:
            # Download document from storage
            file_data, _, _ = self.storage_service.download_file(document_id)

            # Extract text and metadata
            _, chunks = self._extract_pdf_content(file_data, document_id)
            return chunks

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting document chunks: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing document")


def get_document_service(request: Request) -> DocumentService:
    """
    FastAPI dependency to get the DocumentService instance.

    Args:
        request: FastAPI request object

    Returns:
        DocumentService instance from application state
    """
    return request.app.state.document_service
