/**
 * Document Info Dialog Component
 *
 * This component displays detailed information about a document in a dialog.
 */
import React from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/DownLoad";
import CloseIcon from "@mui/icons-material/Close";
import type { Document } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface DocumentInfoDialogProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onDownload: (document: Document) => void;
}

export default function DocumentInfoDialog({
  document,
  open,
  onClose,
  onDownload,
}: DocumentInfoDialogProps) {
  if (!document) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Document Details
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <IconButton onClick={() => onDownload(document)}>
            <DownloadIcon />
          </IconButton>
          <IconButton aria-label="close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          {document.metadata?.title || document.filename}
        </Typography>

        {document.metadata?.description && (
          <Typography variant="body1" gutterBottom>
            {document.metadata?.description}
          </Typography>
        )}

        <Typography variant="h6" gutterBottom mt={2}>
          File Information
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
            gap: 1,
          }}
        >
          <DocumentInfoRow title="Filename" value={document.filename} />
          <DocumentInfoRow
            title="File Size"
            value={formatFileSize(document.size)}
          />
          {document.uploadDate && (
            <DocumentInfoRow
              title="Upload Date"
              value={new Date(document.uploadDate).toLocaleString()}
            />
          )}
          {document.lastModified && (
            <DocumentInfoRow
              title="Modified Date"
              value={new Date(document.lastModified).toLocaleString()}
            />
          )}
          {document.metadata && (
            <>
              <DocumentInfoRow
                title="Pages"
                value={document.metadata.pageCount}
              />
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const DocumentInfoRow = ({
  title,
  value,
}: {
  title: string;
  value: string;
}) => (
  <>
    <Typography component="dt" variant="body1" fontWeight="medium">
      {title}:
    </Typography>
    <Typography component="dd" variant="body1">
      {value}
    </Typography>
  </>
);
