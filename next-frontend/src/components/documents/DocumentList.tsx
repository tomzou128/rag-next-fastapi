/**
 * Document List Component (Simplified Table Version)
 *
 * This component displays a list of uploaded documents in a table with row-level actions.
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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/DownLoad";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import type { Document } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { Add } from "@mui/icons-material";
import DocumentUploadDialog from "@/components/documents/DocumentUploadDialog";
import DocumentInfoDialog from "@/components/documents/DocumentInfoDialog";

interface DocumentListProps {
  documents: Document[];
  loading?: boolean;
  onUpload: (file: File, description?: string) => Promise<void>;
  onDownload: (documentId: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

export default function DocumentList({
                                       documents,
                                       loading = false,
                                       onUpload,
                                       onDownload,
                                       onDelete,
                                     }: DocumentListProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

  // Open delete confirmation dialog for a document
  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  // Confirm document deletion
  const handleDeleteConfirm = async () => {
    if (selectedDocument) {
      await onDelete(selectedDocument.id);
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    }
  };

  // Open document info dialog
  const handleInfoClick = (document: Document) => {
    setSelectedDocument(document);
    setInfoDialogOpen(true);
  };

  // Handle document download
  const handleDownload = (document: Document) => {
    onDownload(document.id);
  };

  return (
    <>
      {/* Toolbar with title and upload button */}
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Stack direction="row" justifyContent="space-between" width="100%">
          <Typography variant="h6" id="tableTitle" component="div">
            Your Documents
          </Typography>
          <IconButton
            onClick={() => setUploadDialogOpen(true)}
            disabled={loading}
          >
            <Add />
          </IconButton>
        </Stack>
      </Toolbar>

      {/* Document Table */}
      <TableContainer component={Paper} sx={{ borderRadius: "0 0 8px 8px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="30%" sx={{ minWidth: "200px" }}>Document</TableCell>
              <TableCell width="20%" sx={{ minWidth: "150px" }}>File Info</TableCell>
              <TableCell width="15%" sx={{ minWidth: "100px" }}>Pages</TableCell>
              <TableCell width="15%" align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length > 0 ? (
              documents.map((document) => (
                <TableRow
                  key={document.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        <PictureAsPdfIcon />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="subtitle1"
                          component="span"
                          fontWeight="medium"
                          id={`document-${document.id}`}
                        >
                          {document.metadata?.title || document.filename}
                        </Typography>
                        {document.metadata?.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {document.metadata.description}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {document.filename} • {formatFileSize(document.size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${document.metadata?.pageCount} pages`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                    >
                      <Tooltip title="Document Info">
                        <IconButton
                          size="small"
                          disabled={loading}
                          onClick={() => handleInfoClick(document)}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          disabled={loading}
                          onClick={() => handleDownload(document)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          disabled={loading}
                          onClick={() => handleDeleteClick(document)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ height: "300px", border: 0 }}>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="100%"
                  >
                    <Typography color="text.secondary">
                      No documents uploaded yet. Upload your first PDF to get started!
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

          </TableBody>
        </Table>
      </TableContainer>

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        onClose={() => setUploadDialogOpen(false)}
        open={uploadDialogOpen}
        onUpload={onUpload}
        disabled={loading}
      />

      {/* Document Info Dialog */}
      <DocumentInfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        document={selectedDocument}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;
            {selectedDocument?.metadata?.title || selectedDocument?.filename}
            &quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="text">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
