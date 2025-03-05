"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";
import { deleteDocument, listDocuments, uploadDocument } from "@/lib/document";
import type { Document } from "@/types";

export default function DocumentsPage() {
  // State variables
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Load documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  /**
   * Fetch the list of documents from the API
   */
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle document upload
   */
  const handleUpload = async (
    file: File,
    title: string,
    description?: string,
  ) => {
    try {
      setLoading(true);
      setError(null);
      setUploadSuccess(false);

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      if (description) {
        formData.append("description", description);
      }

      // Upload document
      const uploadedDoc = await uploadDocument(formData);

      // Add new document to the list
      setDocuments((prev) => [...prev, uploadedDoc]);
      setUploadSuccess(true);

      // Hide success message after 5 seconds
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err) {
      console.error("Error uploading document:", err);
      setError("Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async (documentId: string, filename: string) => {
    try {
      setLoading(true);
      setError(null);

      // Delete document
      await deleteDocument(documentId, filename);

      // Remove document from the list
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Document Management
      </Typography>

      {/* Error and success messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {uploadSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Success</AlertTitle>
          Document uploaded successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Document upload section */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Upload Document
            </Typography>
            <DocumentUpload onUpload={handleUpload} disabled={loading} />
          </Paper>
        </Grid>

        {/* Document list section */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Your Documents
            </Typography>

            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
              >
                <CircularProgress />
              </Box>
            ) : documents.length > 0 ? (
              <DocumentList documents={documents} onDelete={handleDelete} />
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
              >
                <Typography color="textSecondary">
                  No documents uploaded yet. Upload your first PDF to get
                  started!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
