import io
import logging
import uuid
from datetime import datetime
from typing import BinaryIO, Dict, Tuple, Optional, Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import Request, HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Service for managing file storage using S3-compatible storage systems like MinIO.

    This service provides a generic interface for file operations (upload, download,
    delete, list) against any S3-compatible storage backend, with particular
    configuration for MinIO.
    """

    def __init__(self):
        """
        Initialize the S3 client using settings from config.

        Args:
            settings: Application settings containing S3/MinIO configuration

        Raises:
            Exception: If connection to S3/MinIO fails
        """
        try:
            # Create boto3 client for S3 API
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                config=Config(signature_version="s3v4"),
            )
            self.bucket_name = settings.MINIO_BUCKET_NAME
            logger.info(
                f"Connected to S3-compatible storage at {settings.MINIO_ENDPOINT}"
            )

            # Ensure bucket exists
            self._create_bucket_if_not_exists()

        except Exception as e:
            logger.error(f"Failed to initialize S3 connection: {str(e)}")
            raise

    def _create_bucket_if_not_exists(self) -> None:
        """
        Create the bucket if it doesn't exist.
        This is called during service initialization.

        Raises:
            Exception: If there's an error creating the bucket
        """
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket '{self.bucket_name}' already exists")
        except ClientError as e:
            logger.info(f"Creating bucket '{settings.MINIO_BUCKET_NAME}'")
            self.client.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)

    def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str,
        file_id: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, str] | None:
        """
        Upload a file to storage.

        Args:
            file_obj: Binary file-like object to upload
            filename: Original name of the file
            content_type: MIME type of the file
            file_id: Optional custom ID for the file, defaults to a UUID
            metadata: Optional additional metadata to store with the file

        Returns:
            Dict containing file information including ID and name

        Raises:
            HTTPException: If upload fails
        """
        if file_id is None:
            file_id = str(uuid.uuid4())

        # Prepare metadata
        file_metadata = {"filename": filename}
        if metadata:
            file_metadata.update(metadata)

        try:
            # Reset file position to the beginning
            file_obj.seek(0)

            # Upload to S3/MinIO
            self.client.upload_fileobj(
                Fileobj=file_obj,
                Bucket=self.bucket_name,
                Key=file_id,
                ExtraArgs={
                    "ContentType": content_type,
                    "Metadata": file_metadata,
                },
            )

            logger.info(f"Uploaded file '{filename}' with ID {file_id}")
            return {
                "id": file_id,
                "content_type": content_type,
                "filename": filename,
                "metadata": file_metadata,
            }
        except Exception as e:
            error_msg = f"Error uploading file: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
            )
        finally:
            # Reset file position for potential further processing
            try:
                file_obj.seek(0)
            except Exception:
                # Ignore errors if seek fails (e.g., if the file was closed)
                pass

    def list_files(
        self,
        prefix: str = "",
        max_keys: int = 1000,
    ) -> list[dict]:
        """
        List files in the storage bucket with pagination support.

        Args:
            prefix: Optional prefix to filter objects by key
            max_keys: Maximum number of keys to return

        Returns:
            List of files

        Raises:
            HTTPException: If listing files fails
        """
        try:
            params = {"Bucket": self.bucket_name, "MaxKeys": max_keys, "Prefix": prefix}

            response = self.client.list_objects_v2(**params)

            files = []
            if "Contents" in response:
                for obj in response["Contents"]:
                    file_info = self.get_file_info(obj["Key"])
                    files.append(file_info)
            return files
        except Exception as e:
            error_msg = f"Error listing files: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
            )

    def get_file_info(self, file_id: str) -> Dict[str, Any]:
        """
        Get metadata information about a specific file.

        Args:
            file_id: ID of the file to get information for

        Returns:
            Dict containing file metadata

        Raises:
            HTTPException: If file is not found or request fails
        """
        try:
            head = self.client.head_object(Bucket=self.bucket_name, Key=file_id)
            return {
                "id": file_id,
                "content_type": head.get("ContentType", "application/octet-stream"),
                "filename": head["Metadata"]["filename"],
                "size": head["ContentLength"],
                "upload_date": datetime.fromisoformat(head["Metadata"]["upload-date"]),
                "last_modified": head["LastModified"],
                "metadata": {
                    k.replace("-", "_"): v for k, v in head["Metadata"].items()
                },
            }
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "404" or error_code == "NoSuchKey":
                logger.warning(f"File not found: {file_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
                )
            else:
                error_msg = f"Error getting file info: {str(e)}"
                logger.error(error_msg)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
                )

    def delete_file(self, file_id: str) -> dict[str, Any]:
        """
        Delete a file from storage.

        Args:
            file_id: ID of the file to delete

        Returns:
            Dict containing deletion confirmation

        Raises:
            HTTPException: If deletion fails
        """
        try:
            # Get info before deleting for the return value
            try:
                info = self.get_file_info(file_id)
            except HTTPException:
                # If file doesn't exist, just return success
                return {
                    "success": True,
                    "id": file_id,
                    "message": "File not found but delete operation successful",
                }

            # Delete the object
            self.client.delete_object(Bucket=self.bucket_name, Key=file_id)
            logger.info(f"Deleted file with ID {file_id}")

            return {
                "success": True,
                "id": file_id,
                "filename": info.get("filename", file_id),
                "message": "File deleted successfully",
            }
        except Exception as e:
            error_msg = f"Error deleting file: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
            )

    def download_file(self, file_id: str) -> Tuple[io.BytesIO, str, str]:
        """
        Download a file from storage.

        Args:
            file_id: ID of the file to download

        Returns:
            Tuple containing (file_data, content_type, filename)

        Raises:
            HTTPException: If file is not found or download fails
        """
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=file_id)

            # Read the file data into a BytesIO object
            file_data = io.BytesIO(response["Body"].read())
            content_type = response.get("ContentType", "application/octet-stream")
            filename = response.get("Metadata", {}).get("filename", file_id)

            return file_data, content_type, filename
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "NoSuchKey":
                logger.warning(f"File not found: {file_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
                )
            else:
                error_msg = f"Error downloading file: {str(e)}"
                logger.error(error_msg)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
                )

    def generate_presigned_url(
        self,
        file_id: str,
        expiration: int = 3600,
    ) -> Dict[str, str]:
        """
        Generate a presigned URL for direct file access.

        Args:
            file_id: ID of the file to generate URL for
            expiration: Time in seconds until URL expires (default: 1 hour)

        Returns:
            Dict containing the presigned URL and content type

        Raises:
            HTTPException: If URL generation fails
        """
        try:
            # Verify file exists and get info
            info = self.get_file_info(file_id)
            content_type = info.get("content_type")
            filename = info.get("filename")

            # Prepare parameters for URL generation
            params = {"Bucket": self.bucket_name, "Key": file_id}

            # Generate URL
            url = self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expiration,
            )

            return {
                "url": url,
                "content_type": content_type,
                "filename": filename,
                "expiration_seconds": expiration,
            }
        except HTTPException:
            raise
        except Exception as e:
            error_msg = f"Error generating presigned URL: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg
            )


def get_storage_service(request: Request) -> StorageService:
    """
    FastAPI dependency to get the StorageService instance.

    Args:
        request: FastAPI request object

    Returns:
        StorageService instance from application state
    """
    return request.app.state.storage_service
