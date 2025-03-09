/**
 * Search and RAG Page
 *
 * This page allows users to:
 * 1. Search for content in uploaded documents
 * 2. Ask questions about the documents using RAG
 * 3. View search results with citations
 */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Pagination,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import SearchForm from "@/components/search/SearchForm";
import ResultDisplay from "@/components/search/ResultDisplay";
import { generateRagAnswer, generateStreamingRagAnswer, search } from "@/lib/search";
import { Citation, RAGResponse, SearchResponse } from "@/types";
import { toast } from "sonner";

// TAB values
const SEARCH_TAB = 0;
const RAG_TAB = 1;


export default function SearchPage() {
  // Tab state
  const [tabValue, setTabValue] = useState<number>(SEARCH_TAB);

  // Search state
  const [searchParams, setSearchParams] = useState<{
    query: string,
    searchType: string,
    documentIds?: string[],
  }>({ query: "", searchType: "hybrid", documentIds: undefined });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [includeHighlight, setIncludeHighlight] = useState(true);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null,
  );
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // RAG state
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [ragLoading, setRagLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const streamCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam === "rag") setTabValue(RAG_TAB);
    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
    };
  }, []);

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
      setSearchParams({ query, searchType, documentIds });

      const response = await search(query, searchType, documentIds, page, pageSize, includeHighlight);
      setSearchResponse(response);
    } catch (err) {
      console.error("Error searching documents:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePaginatedSearch = async (pageNumber: number) => {
    try {
      setPaginationLoading(true);

      const { query, searchType, documentIds } = searchParams;

      const response = await search(
        query,
        searchType,
        documentIds,
        pageNumber,
        pageSize,
        includeHighlight,
      );

      setSearchResponse(response);
    } catch (err) {
      console.error("Error searching documents:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setPaginationLoading(false);
    }
  };

  const totalPages = useMemo(
    () => searchResponse ? Math.ceil(searchResponse.total / pageSize) : 0,
    [searchResponse, pageSize],
  );

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    handlePaginatedSearch(newPage);
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
      // Clean up any existing stream first
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }

      setRagLoading(true);
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

        // Function to close the stream and remove event listeners
        const closeStream = () => {
          streamSource.close();
          streamSource.removeEventListener("message", handleMessage);
          streamSource.removeEventListener("error", handleError);
          streamCleanupRef.current = null;
        };

        // Store cleanup function for later
        streamCleanupRef.current = closeStream;

        // Handle incoming messages
        const handleMessage = (event) => {
          if (event.data === "[DONE]") {
            setRagLoading(false);
            closeStream();
            return;
          }

          try {
            const chunk = JSON.parse(event.data);
            setRagLoading(false);

            if (chunk.type === "answer") {
              setStreamingAnswer((prev) => prev + chunk.content);
            } else if (chunk.type === "citations") {
              setStreamingAnswer(chunk.content);
              setStreamingCitations(chunk.citations);
            } else if (chunk.type === "error") {
              toast.error(chunk.content);
              closeStream();
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", e);
            closeStream();
          }
        };

        // Handle stream errors
        const handleError = (event) => {
          console.error("Error in stream:", event);
          toast.error("Stream connection error. Please try again.");
          setRagLoading(false);
          closeStream();
        };

        // Add event listeners
        streamSource.addEventListener("message", handleMessage);
        streamSource.addEventListener("error", handleError);
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
      toast.error("Failed to generate answer. Please try again.");
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

            {searchLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : searchResponse ? (
              <Paper sx={{ p: 3 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Search Results</Typography>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={paginationLoading}
                  />
                  <Chip
                    label={`${searchResponse.total} results found`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <ResultDisplay
                  type="search"
                  results={searchResponse.results}
                  query={searchResponse.query}
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
