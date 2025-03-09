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
  Stack,
  Typography,
} from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ReactMarkdown from "react-markdown";
import { Citation, SearchResult } from "@/types";
import HighlightedText from "./HighlightedText";

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

  // Render search results
  if (type === "search" && results.length > 0) {
    return (
      <List disablePadding>
        {results.map((result, index) => (
          <React.Fragment key={`result-${index}`}>
            {index > 0 && <Divider component="li" />}
            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
              <ListItemText
                component="div"
                primary={
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <PictureAsPdfIcon
                      fontSize="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="subtitle1" component="span">
                      {result.filename}
                    </Typography>
                    {result.pageNumber && (
                      <Chip
                        label={`Page ${result.pageNumber}`}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box mt={1}>
                    <Box
                      color="text.primary"
                      sx={{
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        p: 1.5,
                        borderRadius: 1,
                        whiteSpace: "pre-line",
                      }}
                    >
                      <HighlightedText
                        text={result.text}
                        textHighlight={result.textHighlight}
                      />
                    </Box>
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
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BookmarkIcon
                          fontSize="small"
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="subtitle2">
                          {citation.marker}
                        </Typography>
                        <Typography variant="subtitle2">
                          {citation.filename}
                        </Typography>
                        {citation.pageNumber && (
                          <Chip
                            label={`Page ${citation.pageNumber}`}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Stack>
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
