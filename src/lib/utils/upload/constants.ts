import path from "path";
import {
  ImageProcessingOptions,
  ThumbnailOptions,
  UploadOptions,
} from "./types";

/** Magic bytes for common file types (for content verification) */
export const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

/** Default validation constraints */
export const DEFAULT_CONSTRAINTS = {
  MIN_FILE_SIZE: 1, // 1 byte minimum
  MAX_FILENAME_LENGTH: 255,
  SAFE_FILENAME_MAX_LENGTH: 100,
} as const;

/** Characters that are safe in filenames */
export const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export const UPLOAD_BASE_DIR = path.join(process.cwd(), "public", "uploads");

export const DEFAULT_IMAGE_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 95,
  format: "jpeg",
  preserveAspectRatio: true,
};

export const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
  size: 200,
  quality: 80,
  fit: "cover",
};

// Directory structure for organized storage
export const UPLOAD_SUBDIRS = {
  images: "images",
  thumbnails: "thumbnails",
  documents: "documents",
  temp: "temp",
} as const;

export const DEFAULT_OPTIONS: UploadOptions = {
  generateThumbnail: false,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 95,
};

// Files types that should generate thumbnails
export const THUMBNAIL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
