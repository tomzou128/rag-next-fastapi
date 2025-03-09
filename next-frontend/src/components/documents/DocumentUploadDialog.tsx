/**
 * Document Upload Component
 *
 * This component provides a form for uploading PDF documents with metadata,
 * implemented using react-hook-form and zod.
 */
import React, { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

interface DocumentUploadProps {
  onClose: () => void;
  open: boolean;
  onUpload: (file: File, description?: string) => Promise<void>;
  disabled?: boolean;
}

// Define schema with zod for validation
const documentUploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a PDF file" })
    .refine(
      (file) => file.type === "application/pdf",
      "Only PDF files are allowed",
    ),
  description: z.string().optional(),
});

// Create type from zod schema
type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

export default function DocumentUploadDialog({
                                               onClose,
                                               open,
                                               onUpload,
                                               disabled = false,
                                             }: DocumentUploadProps) {
  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      description: "",
    },
    mode: "onChange",
  });

  // Watch the file field to display file information
  const selectedFile = watch("file");

  /**
   * Handle file selection
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      setValue("file", files[0], { shouldValidate: true });
    }
  };

  /**
   * Handle file removal
   */
  const handleRemoveFile = () => {
    // @ts-expect-error remove file
    setValue("file", undefined, { shouldValidate: false });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Handle form submission
   */
  const onFormSubmit = async (data: DocumentUploadFormData) => {
    try {
      await onUpload(
        data.file,
        data.description && data.description.trim(),
      );

      // Reset form after successful upload
      reset();

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      // Error handling can be added here
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog onClose={handleDialogClose} open={open}>
      <DialogTitle>
        Upload a Document
        <IconButton
          aria-label="close"
          onClick={handleDialogClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
          {/* File upload section */}
          <Box mt={2} mb={3}>
            <input
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              id="document-upload-input"
              type="file"
              multiple={false}
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={disabled || isSubmitting}
            />

            {!selectedFile ? (
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={handleFileSelect}
                disabled={disabled || isSubmitting}
                sx={{
                  py: 2,
                  borderStyle: "dashed",
                  borderWidth: 2,
                }}
              >
                Select PDF File
              </Button>
            ) : (
              <Box
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box display="flex" alignItems="center">
                  <PictureAsPdfIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                    {selectedFile.name}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {errors.file && (
              <Typography
                color="error"
                variant="caption"
                sx={{ mt: 0.5, display: "block" }}
              >
                {errors.file.message}
              </Typography>
            )}
          </Box>

          {/* Description input */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                fullWidth
                id="description"
                label="Description (Optional)"
                multiline
                rows={2}
                disabled={disabled || isSubmitting}
              />
            )}
          />

          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            loading={isSubmitting}
            disabled={disabled || !isValid}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? "Uploading..." : "Upload Document"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
