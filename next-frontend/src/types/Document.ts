// Document interface
export interface Document {
  id: string;
  title: string;
  description?: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  uploadDate: Date;
  processingStatus: string;
}
