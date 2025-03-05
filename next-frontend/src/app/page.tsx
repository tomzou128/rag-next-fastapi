"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import Link from "next/link";
import SearchIcon from "@mui/icons-material/Search";
import FolderIcon from "@mui/icons-material/Folder";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import AnalyticsIcon from "@mui/icons-material/Analytics";

export default function Home() {
  return (
    <Box component="main">
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 10,
          mb: 6,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            fontWeight="bold"
            sx={{ mb: 3 }}
          >
            Document Intelligence with RAG
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, fontWeight: "normal" }}>
            Upload PDFs, search content, and ask questions using retrieval
            augmented generation powered by AI.
          </Typography>
          <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
            <Button
              component={Link}
              href="/documents"
              variant="contained"
              size="large"
              sx={{
                bgcolor: "white",
                color: "primary.main",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.9)",
                },
              }}
              startIcon={<FolderIcon />}
            >
              Manage Documents
            </Button>
            <Button
              component={Link}
              href="/search"
              variant="outlined"
              size="large"
              sx={{
                borderColor: "white",
                color: "white",
                "&:hover": {
                  borderColor: "white",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                },
              }}
              startIcon={<SearchIcon />}
            >
              Search & Ask
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          textAlign="center"
          gutterBottom
          sx={{ mb: 5 }}
        >
          Key Features
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" justifyContent="center" mb={2}>
                  <FolderIcon color="primary" sx={{ fontSize: 48 }} />
                </Box>
                <Typography
                  variant="h5"
                  component="h3"
                  textAlign="center"
                  gutterBottom
                >
                  Document Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Upload, organize, and manage your PDF documents. All uploaded
                  documents are automatically processed and indexed for fast
                  search.
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <Button component={Link} href="/documents" size="small">
                  Manage Documents
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" justifyContent="center" mb={2}>
                  <SearchIcon color="primary" sx={{ fontSize: 48 }} />
                </Box>
                <Typography
                  variant="h5"
                  component="h3"
                  textAlign="center"
                  gutterBottom
                >
                  Hybrid Search
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Find information using both keyword and semantic search. Our
                  hybrid approach helps you find content even when exact
                  keywords aren't present.
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <Button component={Link} href="/search" size="small">
                  Search Documents
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box display="flex" justifyContent="center" mb={2}>
                  <QuestionAnswerIcon color="primary" sx={{ fontSize: 48 }} />
                </Box>
                <Typography
                  variant="h5"
                  component="h3"
                  textAlign="center"
                  gutterBottom
                >
                  Question Answering
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Ask questions about your documents and get AI-generated
                  answers with citations to the source material. Perfect for
                  research and information extraction.
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <Button component={Link} href="/search?tab=rag" size="small">
                  Ask Questions
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: "background.paper", py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            textAlign="center"
            gutterBottom
            sx={{ mb: 5 }}
          >
            How It Works
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ pr: { md: 4 } }}>
                <Typography variant="h5" gutterBottom>
                  Retrieval Augmented Generation
                </Typography>
                <Typography paragraph>
                  RAG enhances large language models by providing them with
                  relevant context from your documents before generating
                  answers.
                </Typography>
                <Typography paragraph>
                  When you ask a question, the system:
                </Typography>
                <Typography component="ol" sx={{ pl: 2 }}>
                  <li>Searches your documents for relevant information</li>
                  <li>Retrieves the most similar passages to your query</li>
                  <li>
                    Provides these passages as context to the language model
                  </li>
                  <li>Generates an answer based on this specific context</li>
                  <li>Includes citations to help you verify the sources</li>
                </Typography>
                <Typography paragraph>
                  This approach leads to more accurate, reliable answers
                  grounded in your documents.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  p: 3,
                  bgcolor: "#f0f4f8",
                  borderRadius: 2,
                }}
              >
                <AnalyticsIcon
                  sx={{ fontSize: 240, color: "rgba(25, 118, 210, 0.2)" }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Ready to get started?
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          Upload your PDFs and start exploring your documents in a whole new
          way.
        </Typography>
        <Button
          component={Link}
          href="/documents"
          variant="contained"
          size="large"
          startIcon={<FolderIcon />}
        >
          Upload Your First Document
        </Button>
      </Container>
    </Box>
  );
}
