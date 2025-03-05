/**
 * Result Display Component
 *
 * This component displays search results or RAG answers with citations.
 */
import React, { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ReactMarkdown from "react-markdown";

// Interface for search results
interface SearchResult {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
  score: number;
}

// Interface for citations
interface Citation {
  document_id: string;
  document_title: string;
  page_number?: number;
  text: string;
}

interface ResultDisplayProps {
  type: "search" | "rag";
  results?: SearchResult[];
  answer?: string;
  citations?: Citation[];
  query?: string;
}

export default function ResultDisplay({
  type,
  results = [],
  answer = "",
  citations = [],
  query = "",
}: ResultDisplayProps) {
  // State for expanded citations
  const [expandedCitation, setExpandedCitation] = useState<string | false>(
    false,
  );

  // Handle citation expansion
  const handleCitationToggle = (citationId: string) => {
    setExpandedCitation(expandedCitation === citationId ? false : citationId);
  };

  // Highlight matching text (for search results)
  const highlightMatches = (text: string, query: string) => {
    if (!query) return text;

    try {
      // Create a regex to match the query (case insensitive)
      const queryTerms = query
        .split(" ")
        .filter((term) => term.length > 2) // Skip short terms
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // Escape regex special chars

      if (queryTerms.length === 0) return text;

      const regex = new RegExp(`(${queryTerms.join("|")})`, "gi");

      // Split text by matches
      const parts = text.split(regex);

      // Render with highlights
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ backgroundColor: "#FFEB3B", padding: 0 }}>
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch (e) {
      console.error("Error highlighting matches:", e);
      return text;
    }
  };

  // Render search results
  if (type === "search" && results.length > 0) {
    return (
      <List disablePadding>
        {results.map((result, index) => (
          <React.Fragment key={`result-${index}`}>
            {index > 0 && <Divider component="li" />}
            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <PictureAsPdfIcon
                      fontSize="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="subtitle1" component="span">
                      {result.document_title}
                    </Typography>
                    {result.page_number && (
                      <Chip
                        label={`Page ${result.page_number}`}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box mt={1}>
                    <Typography
                      component="div"
                      variant="body2"
                      color="text.primary"
                      sx={{
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        p: 1.5,
                        borderRadius: 1,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {highlightMatches(result.text, query)}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Relevance: {(result.score * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    );
  }

  // Render RAG answer with citations
  if (type === "rag" && (answer || citations.length > 0)) {
    return (
      <Box>
        {/* Answer section */}
        {answer && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Box px={1}>
              <ReactMarkdown>{answer}</ReactMarkdown>
            </Box>
          </Paper>
        )}

        {/* Citations section */}
        {citations.length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Sources
            </Typography>

            <List disablePadding>
              {citations.map((citation, index) => {
                const citationId = `citation-${index}`;
                return (
                  <Paper
                    key={citationId}
                    elevation={0}
                    sx={{
                      mb: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {/* Citation header */}
                    <Box
                      sx={{
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                      }}
                      onClick={() => handleCitationToggle(citationId)}
                    >
                      <Box display="flex" alignItems="center">
                        <BookmarkIcon
                          fontSize="small"
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="subtitle2">
                          {citation.document_title}
                        </Typography>
                        {citation.page_number && (
                          <Chip
                            label={`Page ${citation.page_number}`}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        sx={{
                          transform:
                            expandedCitation === citationId
                              ? "rotate(90deg)"
                              : "none",
                          transition: "transform 0.3s",
                        }}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </Box>

                    {/* Citation content */}
                    <Collapse in={expandedCitation === citationId}>
                      <Divider />
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-line" }}
                        >
                          {citation.text}
                        </Typography>
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </List>
          </Box>
        )}
      </Box>
    );
  }

  // Fallback for empty state
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
    >
      <Typography color="textSecondary">No results to display</Typography>
    </Box>
  );
}
