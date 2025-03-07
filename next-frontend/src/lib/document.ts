/**
 * Document API Service
 *
 * Service for interacting with the document management API endpoints.
 */
import axiosInstance from "@/lib/axios";
import { Document, DocumentPresignedURLResponse, DocumentUpdateResponse, } from "@/types";

/**
 * Upload a document with metadata
 */
export async function uploadDocument(
  formData: FormData,
): Promise<DocumentUpdateResponse> {
  const response = await axiosInstance.post<DocumentUpdateResponse>(
    "/documents",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
}

/**
 * List all uploaded documents
 */
export async function listDocuments(): Promise<Document[]> {
  const response = await axiosInstance.get<Document[]>("/documents");
  return response.data;
}

/**
 * Get a specific document by ID
 */
export async function getDocument(documentId: string): Promise<Document> {
  const response = await axiosInstance.get<Document>(
    `/documents/${documentId}`,
  );
  return response.data;
}

export async function downloadDocument(
  documentId: string,
): Promise<DocumentPresignedURLResponse> {
  const response = await axiosInstance.get<DocumentPresignedURLResponse>(
    `/documents/${documentId}/presigned`,
  );
  return response.data;
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await axiosInstance.delete(`/documents/${documentId}`);
}
