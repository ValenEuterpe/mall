// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FileValidationOptions {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Allowed file extensions (without dot) */
  allowedExtensions?: string[];
  /** Minimum file size in bytes (to reject empty files) */
  minSize?: number;
  /** Maximum filename length */
  maxFilenameLength?: number;
}

export interface ImageDimensionOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  sanitizedName: string;
  extension: string;
  mimeType: string;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  preserveAspectRatio?: boolean;
}

export interface ThumbnailOptions {
  size?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface SaveFileResult {
  url: string;
  absolutePath: string;
  size: number;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  format?: string;
  size: number;
  hasAlpha?: boolean;
}

export interface UploadResponse {
  url: string;
  thumbnailUrl?: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

export interface UploadOptions {
  generateThumbnail?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}
