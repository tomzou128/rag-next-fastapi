// Document interface
export interface Document {
  id: string;
  contentType: string;
  filename: string;
  size: number;
  uploadDate?: Date;
  lastModified?: Date;
  metadata?: {
    filename: string;
    description: string;
    pageCount: string;
    uploadDate?: Date;
  };
}

export interface DocumentUpdateResponse {
  id: string;
  filename: string;
}

export interface DocumentPresignedURLResponse {
  id: string;
  contentType: string;
  filename: string;
  url: string;
}
