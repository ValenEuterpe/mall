import { FileValidationOptions } from "../utils/upload/types";
import { FileValidationResult } from "../utils/upload/types";
import { parseMaxFileSize } from "../utils/upload/helpers";
import { DEFAULT_CONSTRAINTS } from "../utils/upload/constants";
import { parseAllowedTypes } from "../utils/upload/helpers";
import { ValidationError } from "../errors/custom-errors";
import { extractExtension } from "../utils/upload/helpers";
import { formatBytes } from "../utils/upload/helpers";
import { sanitizeFilename } from "../utils/sanitize";
import { FILE_SIGNATURES } from "../utils/upload/constants";
import { ImageDimensionOptions } from "../utils/upload/types";
import { generateRandomString } from "../utils/upload/helpers";
/**
 * Validates an uploaded file against specified constraints.
 *
 * Performs the following checks:
 * - File existence and validity
 * - File size (min and max)
 * - MIME type validation
 * - File extension validation
 * - Filename length and format
 *
 * @param file - The file to validate
 * @param options - Validation options
 * @throws {ValidationError} If any validation check fails
 */
export function validateFile(
    file: File,
    options: FileValidationOptions = {}
): FileValidationResult {
    // Destructure options with defaults
    const {
        maxSize = parseMaxFileSize(),
        allowedTypes = parseAllowedTypes(),
        allowedExtensions,
        minSize = DEFAULT_CONSTRAINTS.MIN_FILE_SIZE,
        maxFilenameLength = DEFAULT_CONSTRAINTS.MAX_FILENAME_LENGTH,
    } = options;

    // Validate file exists
    if (!file || !(file instanceof File)) {
        throw new ValidationError("Invalid file object provided");
    }

    // Validate filename exists and is reasonable
    if (!file.name || typeof file.name !== "string") {
        throw new ValidationError("File must have a valid name");
    }

    // Validate filename length
    if (file.name.length > maxFilenameLength) {
        throw new ValidationError(
            `Filename exceeds maximum length of ${maxFilenameLength} characters`
        );
    }

    // Validate minimum file size (reject empty files)
    if (file.size < minSize) {
        throw new ValidationError("File is empty or too small");
    }

    // Validate maximum file size
    if (file.size > maxSize) {
        const maxSizeMB = formatBytes(maxSize);
        const fileSizeMB = formatBytes(file.size);
        throw new ValidationError(
            `File size (${fileSizeMB}) exceeds maximum allowed size of ${maxSizeMB}`
        );
    }

    // Validate MIME type
    if (!file.type || !allowedTypes.includes(file.type)) {
        throw new ValidationError(
            `File type "${file.type || "unknown"}" is not allowed. ` +
            `Allowed types: ${allowedTypes.join(", ")}`
        );
    }

    // Extract and validate extension
    const extension = extractExtension(file.name);
    if (!extension) {
        throw new ValidationError("File must have a valid extension");
    }

    // Validate extension if specific extensions are required
    if (allowedExtensions && allowedExtensions.length > 0) {
        const normalizedExtension = extension.toLowerCase();
        const normalizedAllowed = allowedExtensions.map((ext) =>
            ext.toLowerCase().replace(/^\./, "")
        );

        if (!normalizedAllowed.includes(normalizedExtension)) {
            throw new ValidationError(
                `File extension ".${extension}" is not allowed. ` +
                `Allowed extensions: ${normalizedAllowed.map((e) => `.${e}`).join(", ")}`
            );
        }
    }

    // Validate MIME type matches extension
    validateMimeExtensionMatch(file.type, extension);

    return {
        isValid: true,
        sanitizedName: sanitizeFilename(file.name),
        extension: extension.toLowerCase(),
        mimeType: file.type,
    };
}

/**
 * Validates file content by checking magic bytes.
 * This provides an additional layer of security beyond MIME type checking.
 *
 * @param buffer - File content as buffer
 * @param expectedType - Expected MIME type
 * @throws {ValidationError} If magic bytes don't match expected type
 */
export function validateFileSignature(
    buffer: Buffer | ArrayBuffer,
    expectedType: string
): void {
    const signatures = FILE_SIGNATURES[expectedType];

    // Skip validation for types we don't have signatures for (e.g., SVG)
    if (!signatures) {
        return;
    }

    const bytes = buffer instanceof Buffer
        ? buffer
        : Buffer.from(new Uint8Array(buffer));

    const isValid = signatures.some((signature) => {
        if (bytes.length < signature.length) {
            return false;
        }
        return signature.every((byte, index) => bytes[index] === byte);
    });

    if (!isValid) {
        throw new ValidationError(
            `File content does not match declared type "${expectedType}". ` +
            "The file may be corrupted or mislabeled."
        );
    }
}

/**
 * Validates that MIME type matches file extension.
 */
export function validateMimeExtensionMatch(mimeType: string, extension: string): void {
    const mimeToExtensions: Record<string, string[]> = {
        "image/jpeg": ["jpg", "jpeg"],
        "image/png": ["png"],
        "image/gif": ["gif"],
        "image/webp": ["webp"],
        "image/svg+xml": ["svg"],
        "application/pdf": ["pdf"],
    };

    const allowedExtensions = mimeToExtensions[mimeType];
    if (
        allowedExtensions &&
        !allowedExtensions.includes(extension.toLowerCase())
    ) {
        throw new ValidationError(
            `File extension ".${extension}" does not match content type "${mimeType}"`
        );
    }
}

/**
 * Validates image dimensions.
 * Works in browser environment using Image API.
 *
 * @param file - Image file to validate
 * @param options - Dimension constraints
 * @throws {ValidationError} If dimensions exceed constraints
 */
export async function validateImageDimensions(
    file: File,
    options: ImageDimensionOptions = {}
): Promise<{ width: number; height: number }> {
    const { maxWidth, maxHeight, minWidth, minHeight } = options;

    // Verify it's an image
    if (!file.type.startsWith("image/")) {
        throw new ValidationError("File is not an image");
    }

    return new Promise((resolve, reject) => {
        // Check if we're in a browser environment
        if (typeof window === "undefined" || typeof Image === "undefined") {
            // Server-side: skip dimension validation (handled by sharp)
            resolve({ width: 0, height: 0 });
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        let resolved = false;

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                URL.revokeObjectURL(url);
            }
        };

        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
            cleanup();
            reject(new ValidationError("Image validation timed out"));
        }, 30000);

        img.onload = () => {
            clearTimeout(timeout);
            cleanup();

            const { width, height } = img;

            // Validate minimum dimensions
            if (minWidth && width < minWidth) {
                reject(
                    new ValidationError(
                        `Image width (${width}px) is below minimum required (${minWidth}px)`
                    )
                );
                return;
            }

            if (minHeight && height < minHeight) {
                reject(
                    new ValidationError(
                        `Image height (${height}px) is below minimum required (${minHeight}px)`
                    )
                );
                return;
            }

            // Validate maximum dimensions
            if (maxWidth && width > maxWidth) {
                reject(
                    new ValidationError(
                        `Image width (${width}px) exceeds maximum allowed (${maxWidth}px)`
                    )
                );
                return;
            }

            if (maxHeight && height > maxHeight) {
                reject(
                    new ValidationError(
                        `Image height (${height}px) exceeds maximum allowed (${maxHeight}px)`
                    )
                );
                return;
            }

            resolve({ width, height });
        };

        img.onerror = () => {
            clearTimeout(timeout);
            cleanup();
            reject(new ValidationError("Failed to load image for validation"));
        };

        img.src = url;
    });
}

// ============================================================================
// Filename Generation
// ============================================================================

/**
 * Generates a safe, unique filename for storage.
 *
 * Format: {timestamp}-{random}-{sanitized-name}.{extension}
 *
 * @param originalName - Original filename
 * @param prefix - Optional prefix for organization (e.g., "avatar", "product")
 * @returns Safe filename suitable for storage
 */
export function generateSafeFilename(
    originalName: string,
    prefix?: string
): string {
    const timestamp = Date.now();
    const randomStr = generateRandomString(8);
    const extension = extractExtension(originalName)?.toLowerCase() || "bin";

    // Sanitize and truncate the original name
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const safeName = sanitizeFilename(nameWithoutExt).slice(
        0,
        DEFAULT_CONSTRAINTS.SAFE_FILENAME_MAX_LENGTH
    );

    const parts = [timestamp.toString(36), randomStr];

    if (prefix) {
        parts.unshift(sanitizeFilename(prefix));
    }

    if (safeName) {
        parts.push(safeName);
    }

    return `${parts.join("-")}.${extension}`;
}

/**
 * Generates a unique identifier for files.
 * Useful for creating storage paths or database references.
 */
export function generateFileId(): string {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(12);
    return `${timestamp}-${random}`;
}