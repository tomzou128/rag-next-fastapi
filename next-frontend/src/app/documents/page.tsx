"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DocumentList from "@/components/documents/DocumentList";
import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
} from "@/lib/document";
import type { Document } from "@/types";
import { toast } from "sonner";

export default function DocumentsPage() {
  // State variables
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Failed to load documents. Please try again later.");
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

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      if (description) formData.append("description", description);

      // Upload document
      const response = await uploadDocument(formData);
      toast.success(`${response.filename} uploaded successfully.`);

      fetchDocuments();
    } catch (err) {
      console.error("Error uploading document:", err);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docuemntId: string) => {
    try {
      const blob = await downloadDocument(docuemntId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // const fileInfo = files.find((f) => f.id === fileId);
      // link.download = fileInfo?.originalFilename || "downloaded_file"; //
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async (documentId: string) => {
    try {
      setLoading(true);

      // Delete document
      await deleteDocument(documentId);
      toast.success("Document deleted successfully.");

      fetchDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ py: 4, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Document Management
      </Typography>

      {/* Document list section */}
      <Stack sx={{ flex: 1 }}>
        <Paper sx={{ p: 3, flex: 1 }}>
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
            <DocumentList
              documents={documents}
              disableUpload={loading}
              onUpload={handleUpload}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="300px"
            >
              <Typography color="textSecondary">
                No documents uploaded yet. Upload your first PDF to get started!
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
