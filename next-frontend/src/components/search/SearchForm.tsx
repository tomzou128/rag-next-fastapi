/**
 * Search Form Component
 *
 * This component provides a form for searching documents or asking questions.
 */
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import { listDocuments } from "@/lib/document";

// Document type for autocomplete
interface DocumentSummary {
  id: string;
  filename: string;
}

interface SearchFormProps {
  onSubmit: (
    query: string,
    searchType: string,
    documentIds?: string[],
    streaming?: boolean,
  ) => void;
  isRag: boolean;
  loading?: boolean;
}

// Define form schema with zod
const createSearchFormSchema = (isRag: boolean) => {
  return z.object({
    query: z.string().min(1, "Please enter a search query"),
    searchType: z.enum(["keyword", "semantic", "hybrid"]),
    selectedDocuments: z.array(
      z.object({
        id: z.string(),
        filename: z.string(),
      }),
    ),
    streaming: isRag ? z.boolean() : z.boolean().optional(),
  });
};

export default function SearchForm({ onSubmit, isRag, loading = false }: SearchFormProps) {
  // Create schema based on current isRag value
  const searchFormSchema = createSearchFormSchema(isRag);
  type SearchFormData = z.infer<typeof searchFormSchema>;

  // State for document loading
  const [documents, setDocuments] = React.useState<DocumentSummary[]>([]);
  const [loadingDocuments, setLoadingDocuments] =
    React.useState<boolean>(false);

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      query: "",
      searchType: "hybrid",
      selectedDocuments: [],
      streaming: true,
    },
  });

  // Load documents for filtering
  const fetchDocuments = async () => {
    if (documents.length > 0) return; // Already loaded

    try {
      setLoadingDocuments(true);
      const docs = await listDocuments();

      const mappedDocs = docs.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
      }));

      setDocuments(mappedDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Handle form submission
  const onFormSubmit = (data: SearchFormData) => {
    // Get selected document IDs
    const documentIds =
      data.selectedDocuments.length > 0
        ? data.selectedDocuments.map((doc) => doc.id)
        : undefined;

    // Submit the search
    onSubmit(
      data.query,
      data.searchType,
      documentIds,
      isRag ? data.streaming : undefined,
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <Grid container spacing={2}>
        {/* Query input */}
        <Grid size={{ xs: 12 }}>
          <Controller
            name="query"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="query"
                label={isRag ? "Ask a question" : "Search query"}
                variant="outlined"
                error={!!errors.query}
                helperText={
                  errors.query?.message ||
                  (isRag
                    ? "Ask a question about your documents"
                    : "Enter keywords or phrases to search for")
                }
                disabled={loading}
                autoFocus
                placeholder={
                  isRag
                    ? "E.g., What are the main findings in the report?"
                    : "E.g., model architecture"
                }
              />
            )}
          />
        </Grid>

        {/* Search type selection */}
        <Grid size={{ xs: 12, sm: isRag ? 6 : 12, md: isRag ? 4 : 6 }}>
          <Controller
            name="searchType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth disabled={loading}>
                <InputLabel id="search-type-label">Search Type</InputLabel>
                <Select
                  {...field}
                  labelId="search-type-label"
                  id="search-type"
                  label="Search Type"
                >
                  <MenuItem value="keyword">Keyword Search</MenuItem>
                  <MenuItem value="semantic">Semantic Search</MenuItem>
                  <MenuItem value="hybrid">Hybrid Search</MenuItem>
                </Select>
                <FormHelperText>
                  {field.value === "keyword" && "Traditional keyword matching"}
                  {field.value === "semantic" &&
                    "Find semantically similar content"}
                  {field.value === "hybrid" &&
                    "Combine keyword and semantic search"}
                </FormHelperText>
              </FormControl>
            )}
          />
        </Grid>

        {/* Streaming option (RAG only) */}
        {isRag && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Controller
              name="streaming"
              control={control}
              render={({ field }) => (
                <FormControl component="fieldset" sx={{ width: "100%" }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={loading}
                      />
                    }
                    label="Enable streaming"
                    sx={{ height: "100%", alignItems: "center" }}
                  />
                  <FormHelperText>
                    Stream the response as it&#39;s generated
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Grid>
        )}

        {/* Document filter */}
        <Grid size={{ xs: 12, md: isRag ? 4 : 6 }}>
          <FormControl fullWidth disabled={loading}>
            <Controller
              name="selectedDocuments"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  id="documents-filter"
                  options={documents}
                  loading={loadingDocuments}
                  getOptionLabel={(option) => option.filename}
                  value={field.value}
                  onChange={(_, newValue) => field.onChange(newValue)}
                  onOpen={fetchDocuments}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Documents"
                      placeholder="All Documents"
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingDocuments ? (
                                <CircularProgress size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              )}
            />
            <FormHelperText>
              Leave empty to search all documents
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* Submit button */}
        <Grid size={{ xs: 12 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={isRag ? <QuestionAnswerIcon /> : <SearchIcon />}
            loading={loading}
            size="large"
            fullWidth
            sx={{ mt: 1 }}
          >
            {isRag ? (
              "Generate Answer"
            ) : (
              "Search Documents"
            )}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
