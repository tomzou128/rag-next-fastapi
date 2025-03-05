/**
 * Document List Component
 *
 * This component displays a list of uploaded documents with actions.
 */
import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import type { Document } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: string, filename: string) => Promise<void>;
}

export default function DocumentList({
  documents,
  onDelete,
}: DocumentListProps) {
  // State for the delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );

  // State for the document info dialog
  const [infoDialogOpen, setInfoDialogOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

  // Open delete confirmation dialog
  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  // Confirm document deletion
  const handleDeleteConfirm = async () => {
    if (documentToDelete) {
      await onDelete(documentToDelete.id, documentToDelete.filename);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  // Open document info dialog
  const handleInfoClick = (document: Document) => {
    setSelectedDocument(document);
    setInfoDialogOpen(true);
  };

  return (
    <>
      <List>
        {documents.map((document) => (
          <ListItem
            key={document.id}
            divider
            sx={{
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.04)",
              },
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <PictureAsPdfIcon />
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={
                <Typography
                  variant="subtitle1"
                  component="span"
                  fontWeight="medium"
                >
                  {document.title}
                </Typography>
              }
              secondary={
                <Box mt={0.5}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {document.filename} • {formatFileSize(document.fileSize)}
                  </Typography>

                  <Box mt={1} display="flex" gap={1}>
                    <Chip
                      label={`${document.pageCount} pages`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={document.processingStatus}
                      size="small"
                      color={
                        document.processingStatus === "processed"
                          ? "success"
                          : "warning"
                      }
                      variant="outlined"
                    />
                  </Box>
                </Box>
              }
            />

            <ListItemSecondaryAction>
              <Tooltip title="Document Info">
                <IconButton
                  edge="end"
                  aria-label="info"
                  onClick={() => handleInfoClick(document)}
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>

              {/*{document.download_url && (*/}
              {/*  <Tooltip title="Download">*/}
              {/*    <IconButton*/}
              {/*      edge="end"*/}
              {/*      aria-label="download"*/}
              {/*      href={document.download_url}*/}
              {/*      target="_blank"*/}
              {/*      rel="noopener noreferrer"*/}
              {/*    >*/}
              {/*      <DownloadIcon />*/}
              {/*    </IconButton>*/}
              {/*  </Tooltip>*/}
              {/*)}*/}

              <Tooltip title="Delete">
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteClick(document)}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{documentToDelete?.title}
            &quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedDocument.title}
              </Typography>

              {selectedDocument.description && (
                <Typography variant="body1" paragraph>
                  {selectedDocument.description}
                </Typography>
              )}

              <Typography variant="subtitle2" gutterBottom>
                File Information
              </Typography>

              <Box
                component="dl"
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
                  gap: 1,
                }}
              >
                <Typography component="dt" variant="body2" fontWeight="medium">
                  Filename:
                </Typography>
                <Typography component="dd" variant="body2">
                  {selectedDocument.filename}
                </Typography>

                <Typography component="dt" variant="body2" fontWeight="medium">
                  File Size:
                </Typography>
                <Typography component="dd" variant="body2">
                  {formatFileSize(selectedDocument.fileSize)}
                </Typography>

                <Typography component="dt" variant="body2" fontWeight="medium">
                  Pages:
                </Typography>
                <Typography component="dd" variant="body2">
                  {selectedDocument.pageCount}
                </Typography>

                <Typography component="dt" variant="body2" fontWeight="medium">
                  Upload Date:
                </Typography>
                <Typography component="dd" variant="body2">
                  {selectedDocument.uploadDate.toLocaleString()}
                </Typography>

                <Typography component="dt" variant="body2" fontWeight="medium">
                  Status:
                </Typography>
                <Typography component="dd" variant="body2">
                  <Chip
                    label={selectedDocument.processingStatus}
                    size="small"
                    color={
                      selectedDocument.processingStatus === "processed"
                        ? "success"
                        : "warning"
                    }
                  />
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        {/*<DialogActions>*/}
        {/*  {selectedDocument?.download_url && (*/}
        {/*    <Button*/}
        {/*      href={selectedDocument.download_url}*/}
        {/*      target="_blank"*/}
        {/*      rel="noopener noreferrer"*/}
        {/*      startIcon={<DownloadIcon />}*/}
        {/*    >*/}
        {/*      Download*/}
        {/*    </Button>*/}
        {/*  )}*/}
        {/*  <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>*/}
        {/*</DialogActions>*/}
      </Dialog>
    </>
  );
}
