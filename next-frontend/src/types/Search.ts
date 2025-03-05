// Search result interface
export interface SearchResult {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
  score: number;
}

// Search response interface
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  search_type: string;
}

// Citation interface
export interface Citation {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
}

// RAG response interface
export interface RAGResponse {
  answer: string;
  citations: Citation[];
  query: string;
}
