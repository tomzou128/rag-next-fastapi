"use client";

import React, { useEffect, useState } from "react";
import { Container, Paper, Stack, Typography } from "@mui/material";
import DocumentList from "@/components/documents/DocumentList";
import { deleteDocument, downloadDocument, listDocuments, uploadDocument } from "@/lib/document";
import type { Document } from "@/types";
import { toast } from "sonner";

export default function DocumentsPage() {
  // State variables
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
    description?: string,
  ) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      if (description) formData.append("description", description);

      const response = await uploadDocument(formData);
      toast.success(`${response.filename} uploaded successfully.`);
      await fetchDocuments();
    } catch (err) {
      console.error("Error uploading document:", err);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docuemntId: string) => {
    try {
      setLoading(true);

      const { url, filename } = await downloadDocument(docuemntId);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async (documentId: string) => {
    try {
      setLoading(true);
      await deleteDocument(documentId);
      toast.success("Document deleted successfully.");
      await fetchDocuments();
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
          <DocumentList
            documents={documents}
            loading={loading}
            onUpload={handleUpload}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
