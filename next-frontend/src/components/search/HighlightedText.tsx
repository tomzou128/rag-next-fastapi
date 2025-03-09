import React, { useState } from "react";
import { Box, Button, Collapse, Paper, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface HighlightedTextProps {
  text: string;
  textHighlight?: string[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, textHighlight }) => {
  const [showFullText, setShowFullText] = useState(false);

  // If no highlights, just render the full text
  if (!textHighlight || textHighlight.length === 0) {
    return (
      <Box sx={{ p: 1, mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Full Context:
        </Typography>
        <Paper elevation={0} sx={{ p: 1, mb: 1 }}>
          <Typography variant="body2">
            {text}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Function to safely parse highlights
  const renderHighlightedSnippet = (snippet: string) => {
    // The safer way is to split the string by <mark> and </mark> tags
    const parts = [];
    let currentText = snippet;
    let markStart = currentText.indexOf("<mark>");
    let markEnd = currentText.indexOf("</mark>");

    // Continue parsing until no more <mark> tags are found
    while (markStart !== -1 && markEnd !== -1) {
      // Add text before the mark
      if (markStart > 0) {
        parts.push({
          text: currentText.substring(0, markStart),
          highlighted: false,
        });
      }

      // Add the highlighted text (without the <mark> tags)
      parts.push({
        text: currentText.substring(markStart + 6, markEnd), // +6 to skip <mark>
        highlighted: true,
      });

      // Update the current text to everything after </mark>
      currentText = currentText.substring(markEnd + 7); // +7 to skip </mark>

      // Look for the next <mark> tag
      markStart = currentText.indexOf("<mark>");
      markEnd = currentText.indexOf("</mark>");
    }

    // Add any remaining text
    if (currentText) {
      parts.push({
        text: currentText,
        highlighted: false,
      });
    }

    return (
      <Paper elevation={0} sx={{ mb: 1, p: 1 }}>
        {parts.map((part, i) => (
          <Box
            key={i}
            component="span"
            sx={part.highlighted ? { bgcolor: "yellow", px: 0.5 } : {}}
          >
            {part.text}
          </Box>
        ))}
      </Paper>
    );
  };

  return (
    <Box>
      {/* Highlighted snippets */}
      <Box sx={{ p: 1, mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom component="div">
          Highlighted Portions:
        </Typography>
        {textHighlight?.map((snippet, index) => (
          <React.Fragment key={index}>
            {renderHighlightedSnippet(snippet)}
          </React.Fragment>
        ))}
      </Box>

      {/* Toggle button */}
      <Button
        size="small"
        onClick={() => setShowFullText(!showFullText)}
        endIcon={showFullText ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1 }}
      >
        {showFullText ? "Hide full context" : "Show full context"}
      </Button>

      {/* Full Text */}
      <Collapse in={showFullText}>
        <Paper elevation={0} sx={{ m: 1, p: 1, mb: 1 }}>
          <Typography variant="body2">
            {text}
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default HighlightedText;
