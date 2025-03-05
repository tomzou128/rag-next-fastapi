/**
 * Search and RAG Page
 *
 * This page allows users to:
 * 1. Search for content in uploaded documents
 * 2. Ask questions about the documents using RAG
 * 3. View search results with citations
 */
"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import SearchForm from "@/components/SearchForm";
import ResultDisplay from "@/components/ResultDisplay";
import {
  generateRagAnswer,
  generateStreamingRagAnswer,
  search,
} from "@/lib/search";

// Type definitions
interface SearchResult {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  search_type: string;
}

interface Citation {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
}

interface RAGResponse {
  answer: string;
  citations: Citation[];
  query: string;
}

// TAB values
const SEARCH_TAB = 0;
const RAG_TAB = 1;

export default function SearchPage() {
  // Tab state
  const [tabValue, setTabValue] = useState<number>(SEARCH_TAB);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // RAG state
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [ragLoading, setRagLoading] = useState<boolean>(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  /**
   * Handle search submission
   */
  const handleSearch = async (
    query: string,
    searchType: string,
    documentIds?: string[],
  ) => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      setSearchResults(null);

      const results = await search(query, searchType, 10, documentIds);
      setSearchResults(results);
    } catch (err) {
      console.error("Error searching documents:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Handle RAG query submission
   */
  const handleRagQuery = async (
    query: string,
    searchType: string,
    streaming: boolean,
    documentIds?: string[],
  ) => {
    try {
      setRagLoading(true);
      setRagError(null);
      setRagResponse(null);
      setStreamingAnswer("");
      setStreamingCitations([]);
      setIsStreaming(streaming);

      if (streaming) {
        // Handle streaming response
        const streamSource = await generateStreamingRagAnswer(
          query,
          searchType,
          5,
          documentIds,
        );

        // Process each chunk as it arrives
        streamSource.addEventListener("message", (event) => {
          if (event.data === "[DONE]") {
            setRagLoading(false);
            return;
          }

          try {
            const chunk = JSON.parse(event.data);

            if (chunk.type === "answer") {
              setStreamingAnswer((prev) => prev + chunk.content);
            } else if (chunk.type === "citations") {
              setStreamingCitations(chunk.content);
            } else if (chunk.type === "error") {
              setRagError(chunk.content);
              setRagLoading(false);
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", e);
          }
        });

        streamSource.addEventListener("error", () => {
          setRagError("Stream connection error. Please try again.");
          setRagLoading(false);
        });
      } else {
        // Handle non-streaming response
        const response = await generateRagAnswer(
          query,
          searchType,
          5,
          documentIds,
        );
        setRagResponse(response);
        setRagLoading(false);
      }
    } catch (err) {
      console.error("Error generating RAG answer:", err);
      setRagError("Failed to generate answer. Please try again.");
      setRagLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Document Search & Q&A
      </Typography>

      {/* Tab navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="search tabs"
        >
          <Tab label="Search Documents" id="search-tab" />
          <Tab label="Ask Questions (RAG)" id="rag-tab" />
        </Tabs>
      </Box>

      {/* Search tab content */}
      <div role="tabpanel" hidden={tabValue !== SEARCH_TAB}>
        {tabValue === SEARCH_TAB && (
          <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search your documents
              </Typography>
              <SearchForm
                onSubmit={(query, searchType, documentIds) =>
                  handleSearch(query, searchType, documentIds)
                }
                isRag={false}
                loading={searchLoading}
              />
            </Paper>

            {searchError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {searchError}
              </Alert>
            )}

            {searchLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : searchResults ? (
              <Paper sx={{ p: 3 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Search Results</Typography>
                  <Chip
                    label={`${searchResults.total} results found`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <ResultDisplay
                  type="search"
                  results={searchResults.results}
                  query={searchResults.query}
                />
              </Paper>
            ) : null}
          </Box>
        )}
      </div>

      {/* RAG tab content */}
      <div role="tabpanel" hidden={tabValue !== RAG_TAB}>
        {tabValue === RAG_TAB && (
          <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ask questions about your documents
              </Typography>
              <SearchForm
                onSubmit={(query, searchType, documentIds, streaming) =>
                  handleRagQuery(
                    query,
                    searchType,
                    streaming || false,
                    documentIds,
                  )
                }
                isRag={true}
                loading={ragLoading}
              />
            </Paper>

            {ragError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {ragError}
              </Alert>
            )}

            {ragLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : isStreaming &&
              (streamingAnswer || streamingCitations.length > 0) ? (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Answer
                </Typography>

                <ResultDisplay
                  type="rag"
                  answer={streamingAnswer}
                  citations={streamingCitations}
                />
              </Paper>
            ) : ragResponse ? (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Answer
                </Typography>

                <ResultDisplay
                  type="rag"
                  answer={ragResponse.answer}
                  citations={ragResponse.citations}
                  query={ragResponse.query}
                />
              </Paper>
            ) : null}
          </Box>
        )}
      </div>
    </Container>
  );
}
