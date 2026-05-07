import fs from "fs/promises";
import path from "path";
import { logger } from "@/lib/utils/logger";
import { StorageError } from "@/lib/errors/custom-errors";
import { UPLOAD_BASE_DIR, UPLOAD_SUBDIRS } from "../utils/upload/constants";
import { SaveFileResult } from "../utils/upload/types";
import { ThumbnailOptions } from "../utils/upload/types";
import { FileMetadata } from "../utils/upload/types";
import { getImageMetadata } from "../utils/upload/image-processor";
import { generateThumbnail } from "../utils/upload/image-processor";
/**
 * Ensures the upload directory structure exists.
 * Creates directories if they don't exist.
 */
async function ensureUploadDirectories(): Promise<void> {
    const directories = [
        UPLOAD_BASE_DIR,
        ...Object.values(UPLOAD_SUBDIRS).map((subdir) =>
            path.join(UPLOAD_BASE_DIR, subdir)
        ),
    ];

    for (const dir of directories) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true, mode: 0o755 });
            logger.info(`Created upload directory: ${dir}`);
        }
    }
}

/**
 * Gets the appropriate subdirectory for a file type.
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
    // Remove any path separators and parent directory references
    const sanitized = path.basename(filename).replace(/\.\./g, "");

    if (!sanitized || sanitized === "." || sanitized === "..") {
        throw new StorageError("Invalid filename");
    }

    return sanitized;
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Saves a file to disk with proper organization.
 *
 * @param buffer - File content
 * @param filename - Sanitized filename
 * @param mimeType - File MIME type (used for directory organization)
 * @returns Save result with URL and metadata
 */
export async function saveFile(
    buffer: Buffer,
    filename: string,
    mimeType: string = "application/octet-stream"
): Promise<SaveFileResult> {
    await ensureUploadDirectories();

    const safeFilename = sanitizeStoragePath(filename);
    const subdir = getSubdirectory(mimeType);
    const relativePath = path.join(subdir, safeFilename);
    const absolutePath = path.join(UPLOAD_BASE_DIR, relativePath);

    try {
        // Write file with restricted permissions
        await fs.writeFile(absolutePath, buffer, { mode: 0o644 });

        const url = `/uploads/${relativePath.replace(/\\/g, "/")}`;

        logger.debug(`File saved: ${absolutePath}`, {
            size: buffer.length,
            mimeType,
        });

        return {
            url,
            absolutePath,
            size: buffer.length,
        };
    } catch (error) {
        logger.error("Failed to save file", { filename, error });
        throw new StorageError(`Failed to save file: ${safeFilename}`);
    }
}

/**
 * Saves a file with its thumbnail.
 *
 * @param buffer - Original image buffer
 * @param filename - Base filename
 * @param options - Thumbnail options
 * @returns URLs for both original and thumbnail
 */
export async function saveFileWithThumbnail(
    buffer: Buffer,
    filename: string,
    thumbnailOptions?: ThumbnailOptions
): Promise<{ url: string; thumbnailUrl: string; metadata: FileMetadata }> {
    await ensureUploadDirectories();

    const safeFilename = sanitizeStoragePath(filename);

    // Generate thumbnail filename
    const ext = path.extname(safeFilename);
    const base = path.basename(safeFilename, ext);
    const thumbnailFilename = `${base}_thumb${ext}`;

    // Save original
    const originalPath = path.join(
        UPLOAD_BASE_DIR,
        UPLOAD_SUBDIRS.images,
        safeFilename
    );

    // Save thumbnail
    const thumbnailPath = path.join(
        UPLOAD_BASE_DIR,
        UPLOAD_SUBDIRS.thumbnails,
        thumbnailFilename
    );

    try {
        // Get metadata from original
        const metadata = await getImageMetadata(buffer);

        // Generate thumbnail
        const thumbnail = await generateThumbnail(buffer, thumbnailOptions);

        // Write both files
        await Promise.all([
            fs.writeFile(originalPath, buffer, { mode: 0o644 }),
            fs.writeFile(thumbnailPath, thumbnail, { mode: 0o644 }),
        ]);

        return {
            url: `/uploads/${UPLOAD_SUBDIRS.images}/${safeFilename}`,
            thumbnailUrl: `/uploads/${UPLOAD_SUBDIRS.thumbnails}/${thumbnailFilename}`,
            metadata,
        };
    } catch (error) {
        // Cleanup on failure
        await Promise.allSettled([
            fs.unlink(originalPath).catch(() => { }),
            fs.unlink(thumbnailPath).catch(() => { }),
        ]);

        logger.error("Failed to save file with thumbnail", { filename, error });
        throw new StorageError("Failed to save file with thumbnail");
    }
}

/**
 * Deletes a file from disk.
 *
 * @param url - Public URL of the file
 * @returns True if file was deleted, false if it didn't exist
 */
export async function deleteFile(url: string): Promise<boolean> {
    try {
        // Extract relative path from URL
        const relativePath = url.replace(/^\/uploads\//, "");
        const safeRelativePath = sanitizeStoragePath(relativePath);
        const absolutePath = path.join(UPLOAD_BASE_DIR, safeRelativePath);

        // Verify the path is within upload directory
        const normalizedPath = path.normalize(absolutePath);
        if (!normalizedPath.startsWith(UPLOAD_BASE_DIR)) {
            logger.warn("Attempted path traversal in deleteFile", { url });
            return false;
        }

        await fs.unlink(absolutePath);
        logger.debug(`File deleted: ${absolutePath}`);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            logger.debug(`File not found for deletion: ${url}`);
            return false;
        }
        logger.error("Failed to delete file", { url, error });
        return false;
    }
}

/**
 * Deletes multiple files from disk.
 *
 * @param urls - Array of public URLs
 * @returns Object with success and failure counts
 */
export async function deleteFiles(
    urls: string[]
): Promise<{ deleted: number; failed: number }> {
    const results = await Promise.allSettled(urls.map((url) => deleteFile(url)));

    let deleted = 0;
    let failed = 0;

    results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
            deleted++;
        } else {
            failed++;
        }
    });

    return { deleted, failed };
}

/**
 * Checks if a file exists.
 */
export async function fileExists(url: string): Promise<boolean> {
    try {
        const relativePath = url.replace(/^\/uploads\//, "");
        const absolutePath = path.join(UPLOAD_BASE_DIR, relativePath);

        await fs.access(absolutePath);
        return true;
    } catch {
        return false;
    }
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Cleans up temporary files older than specified age.
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @returns Number of files cleaned up
 */
export async function cleanupTempFiles(
    maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
    const tempDir = path.join(UPLOAD_BASE_DIR, UPLOAD_SUBDIRS.temp);
    let cleanedCount = 0;

    try {
        const files = await fs.readdir(tempDir);
        const now = Date.now();

        for (const file of files) {
            try {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtimeMs > maxAgeMs) {
                    await fs.unlink(filePath);
                    cleanedCount++;
                }
            } catch {
                // Ignore individual file errors
            }
        }

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} temporary files`);
        }
    } catch (error) {
        logger.error("Failed to cleanup temp files", { error });
    }

    return cleanedCount;
}