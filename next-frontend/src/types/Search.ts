// Search result interface
export interface SearchResult {
  documentId: string;
  filename: string;
  pageNumber?: number;
  text: string;
  textHighlight?: string[];
  score: number;
}

// Search response interface
export interface SearchResponse {
  results: SearchResult[];
  total: number;   // total available in the databse
  count: string;   // think about a better name for the real number of result returned
  query: string;
  searchType: string;
}

// Citation interface
export interface Citation {
  document_id: string;
  filename: string;
  marker: string;
  pageNumber?: number;
  text: string;
}

// RAG response interface
export interface RAGResponse {
  answer: string;
  citations: Citation[];
  query: string;
}
