import path from "path";
import { logger } from "@/lib/utils/logger";
import { StorageError } from "@/lib/errors/custom-errors";
import { UPLOAD_SUBDIRS } from "../utils/upload/constants";
import { SaveFileResult } from "../utils/upload/types";
import { ThumbnailOptions } from "../utils/upload/types";
import { FileMetadata } from "../utils/upload/types";
import { getImageMetadata } from "../utils/upload/image-processor";
import { generateThumbnail } from "../utils/upload/image-processor";
import { getSupabaseStorage, getStorageBucket } from "./supabase-client";

/**
 * Gets the appropriate subdirectory (storage key prefix) for a file type.
 */
function getSubdirectory(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    return UPLOAD_SUBDIRS.images;
  }
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("application/") ||
    mimeType.startsWith("text/")
  ) {
    return UPLOAD_SUBDIRS.documents;
  }
  return UPLOAD_SUBDIRS.temp;
}

/**
 * Validates and sanitizes a filename to prevent path traversal.
 */
function sanitizeStoragePath(filename: string): string {
  const sanitized = path.basename(filename).replace(/\.\./g, "");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new StorageError("Invalid filename");
  }
  return sanitized;
}

/**
 * Builds a storage object key from a relative path (forward slashes).
 */
function toObjectKey(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

/**
 * Extracts the object key from a Supabase public URL we previously issued.
 */
function urlToObjectKey(url: string): string | null {
  const marker = `/object/public/${getStorageBucket()}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Saves a file to Supabase Storage.
 */
export async function saveFile(
  buffer: Buffer,
  filename: string,
  mimeType: string = "application/octet-stream"
): Promise<SaveFileResult> {
  const safeFilename = sanitizeStoragePath(filename);
  const subdir = getSubdirectory(mimeType);
  const objectKey = toObjectKey(path.join(subdir, safeFilename));

  const supabase = getSupabaseStorage();
  const bucket = getStorageBucket();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectKey, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    logger.error("Failed to save file to Supabase Storage", {
      filename,
      objectKey,
      error: error.message,
    });
    throw new StorageError(`Failed to save file: ${safeFilename}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(objectKey);

  logger.debug(`File saved to Supabase: ${objectKey}`, {
    size: buffer.length,
    mimeType,
  });

  return {
    url: publicUrlData.publicUrl,
    absolutePath: objectKey,
    size: buffer.length,
  };
}

/**
 * Saves a file along with its thumbnail to Supabase Storage.
 */
export async function saveFileWithThumbnail(
  buffer: Buffer,
  filename: string,
  thumbnailOptions?: ThumbnailOptions
): Promise<{ url: string; thumbnailUrl: string; metadata: FileMetadata }> {
  const safeFilename = sanitizeStoragePath(filename);
  const ext = path.extname(safeFilename);
  const base = path.basename(safeFilename, ext);
  const thumbnailFilename = `${base}_thumb${ext}`;

  const originalKey = toObjectKey(
    path.join(UPLOAD_SUBDIRS.images, safeFilename)
  );
  const thumbnailKey = toObjectKey(
    path.join(UPLOAD_SUBDIRS.thumbnails, thumbnailFilename)
  );

  const supabase = getSupabaseStorage();
  const bucket = getStorageBucket();

  try {
    const metadata = await getImageMetadata(buffer);
    const thumbnail = await generateThumbnail(buffer, thumbnailOptions);

    const contentType = metadata.format
      ? `image/${metadata.format}`
      : "application/octet-stream";

    const [originalRes, thumbRes] = await Promise.all([
      supabase.storage
        .from(bucket)
        .upload(originalKey, buffer, { contentType, upsert: false }),
      supabase.storage
        .from(bucket)
        .upload(thumbnailKey, thumbnail, { contentType, upsert: false }),
    ]);

    if (originalRes.error || thumbRes.error) {
      // Cleanup whichever upload succeeded
      const toRemove: string[] = [];
      if (!originalRes.error) toRemove.push(originalKey);
      if (!thumbRes.error) toRemove.push(thumbnailKey);
      if (toRemove.length > 0) {
        await supabase.storage
          .from(bucket)
          .remove(toRemove)
          .catch(() => {});
      }
      throw new StorageError(
        originalRes.error?.message || thumbRes.error?.message || "Upload failed"
      );
    }

    const { data: originalUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(originalKey);
    const { data: thumbnailUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbnailKey);

    return {
      url: originalUrl.publicUrl,
      thumbnailUrl: thumbnailUrl.publicUrl,
      metadata,
    };
  } catch (error) {
    logger.error("Failed to save file with thumbnail", { filename, error });
    if (error instanceof StorageError) throw error;
    throw new StorageError("Failed to save file with thumbnail");
  }
}

/**
 * Deletes a file from Supabase Storage given its public URL.
 */
export async function deleteFile(url: string): Promise<boolean> {
  const objectKey = urlToObjectKey(url);
  if (!objectKey) {
    logger.debug(`URL is not a Supabase storage URL, skipping delete: ${url}`);
    return false;
  }

  const supabase = getSupabaseStorage();
  const { error } = await supabase.storage
    .from(getStorageBucket())
    .remove([objectKey]);

  if (error) {
    logger.error("Failed to delete file from Supabase Storage", {
      url,
      objectKey,
      error: error.message,
    });
    return false;
  }

  logger.debug(`File deleted: ${objectKey}`);
  return true;
}

/**
 * Deletes multiple files from Supabase Storage.
 */
export async function deleteFiles(
  urls: string[]
): Promise<{ deleted: number; failed: number }> {
  const keys = urls.map(urlToObjectKey).filter((k): k is string => k !== null);

  if (keys.length === 0) {
    return { deleted: 0, failed: urls.length };
  }

  const supabase = getSupabaseStorage();
  const { data, error } = await supabase.storage
    .from(getStorageBucket())
    .remove(keys);

  if (error) {
    logger.error("Failed batch delete from Supabase Storage", {
      error: error.message,
    });
    return { deleted: 0, failed: urls.length };
  }

  const deleted = data?.length ?? 0;
  return { deleted, failed: urls.length - deleted };
}

/**
 * Checks if a file exists in Supabase Storage.
 */
export async function fileExists(url: string): Promise<boolean> {
  const objectKey = urlToObjectKey(url);
  if (!objectKey) return false;

  const supabase = getSupabaseStorage();
  const dir = path.posix.dirname(objectKey);
  const filename = path.posix.basename(objectKey);

  const { data, error } = await supabase.storage
    .from(getStorageBucket())
    .list(dir, { search: filename, limit: 1 });

  if (error) return false;
  return !!data && data.some((entry) => entry.name === filename);
}

/**
 * No-op on Supabase Storage. Temp files don't accumulate on disk because the
 * bucket isn't local. Kept for API compatibility with prior filesystem impl.
 */
export async function cleanupTempFiles(
  _maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  return 0;
}
