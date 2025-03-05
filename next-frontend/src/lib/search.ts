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
  topK: number = 5,
  documentIds?: string[],
): Promise<SearchResponse> {
  const response = await axiosInstance.post<SearchResponse>("/search", {
    query,
    search_type: searchType,
    top_k: topK,
    document_ids: documentIds,
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
  // Prepare the URL with query parameters
  const url = new URL(`${API_URL}/search/rag/stream`, window.location.origin);

  // Create a new EventSource for SSE
  const eventSource = new EventSource(url.toString(), {
    withCredentials: false,
  });

  // Send the initial request to start the stream
  fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_type: searchType,
      top_k: topK,
      document_ids: documentIds,
      stream: true,
    }),
  }).catch((error) => {
    console.error("Error initiating streaming request:", error);
    eventSource.close();
    throw error;
  });
  return eventSource;
}
