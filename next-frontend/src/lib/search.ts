/**
 * Search API Service
 *
 * Service for interacting with the search and RAG API endpoints.
 */
import axiosInstance, { API_URL } from "@/lib/axios";

import type { RAGResponse, SearchResponse } from "@/types";

/**
 * Search for content in documents
 */
export async function search(
  query: string,
  searchType: string = "hybrid",
  documentIds?: string[],
  page: number = 1,
  pageSize: number = 10,
  includeHighlight: boolean = false,
): Promise<SearchResponse> {
  const response = await axiosInstance.post<SearchResponse>("/search", {
    query,
    searchType,
    documentIds,
    page,
    pageSize,
    includeHighlight,
  });
  return response.data;
}

/**
 * Generate an answer using RAG (non-streaming)
 */
export async function generateRagAnswer(
  query: string,
  searchType: string = "hybrid",
  topK: number = 5,
  documentIds?: string[],
): Promise<RAGResponse> {
  const response = await axiosInstance.post<RAGResponse>("/search/rag", {
    query,
    search_type: searchType,
    top_k: topK,
    document_ids: documentIds,
    stream: false,
  });
  return response.data;
}

/**
 * Generate a streaming RAG answer
 * Returns an EventSource for handling the streaming response
 */
export async function generateStreamingRagAnswer(
  query: string,
  searchType: string = "hybrid",
  topK: number = 5,
  documentIds?: string[],
): Promise<EventSource> {
  // Create URL with query parameters
  const url = new URL(`${API_URL}/search/rag/stream`, window.location.origin);

  // Add query parameters to the URL
  url.searchParams.append("query", query);
  url.searchParams.append("search_type", searchType);
  url.searchParams.append("top_k", topK.toString());
  url.searchParams.append("stream", "true");
  if (documentIds && documentIds.length > 0) {
    documentIds.forEach(id => url.searchParams.append("document_ids", id));
  }

  // Now create a single EventSource that will make a GET request with the parameters
  return new EventSource(url.toString(), {
    withCredentials: false,
  });
}
