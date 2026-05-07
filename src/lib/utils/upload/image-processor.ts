import sharp from "sharp";
import { sanitizeSvg } from "@/lib/utils/sanitize";
import { logger } from "@/lib/utils/logger";
import { StorageError } from "@/lib/errors/custom-errors";
import {
    ImageProcessingOptions,
    ThumbnailOptions,
    FileMetadata
} from "./types";
import {
    DEFAULT_IMAGE_OPTIONS,
    DEFAULT_THUMBNAIL_OPTIONS
} from "./constants";

/**
 * Processes and optimizes an image.
 *
 * @param buffer - Image buffer
 * @param options - Processing options
 * @returns Processed image buffer
 */
export async function processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
): Promise<Buffer> {
    const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };

    try {
        let pipeline = sharp(buffer, { failOnError: true });

        // Get original metadata
        const metadata = await pipeline.metadata();

        // Only resize if needed
        const needsResize =
            (metadata.width && metadata.width > opts.maxWidth) ||
            (metadata.height && metadata.height > opts.maxHeight);

        if (needsResize) {
            pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
                fit: "inside",
                withoutEnlargement: true,
            });
        }

        // Apply format-specific optimizations
        switch (opts.format) {
            case "jpeg":
                pipeline = pipeline.jpeg({
                    quality: opts.quality,
                    progressive: true,
                });
                break;
            case "png":
                pipeline = pipeline.png({
                    quality: opts.quality,
                    compressionLevel: 6,
                    progressive: true,
                });
                break;
            case "webp":
                pipeline = pipeline.webp({
                    quality: opts.quality,
                    effort: 6,
                });
                break;
        }

        // Remove EXIF data for privacy
        pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip

        return await pipeline.toBuffer();
    } catch (error) {
        logger.error("Image processing failed", { error });
        throw new StorageError("Failed to process image");
    }
}

/**
 * Processes and sanitizes SVG content.
 *
 * @param buffer - SVG content as buffer
 * @returns Sanitized SVG buffer
 */
export async function processSvg(buffer: Buffer): Promise<Buffer> {
    try {
        const svgContent = buffer.toString("utf-8");

        // Validate it's actually SVG
        if (
            !svgContent.includes("<svg") ||
            !svgContent.includes("</svg>") &&
            !svgContent.includes("/>")
        ) {
            throw new StorageError("Invalid SVG content");
        }

        const sanitized = sanitizeSvg(svgContent);

        // Validate sanitized content isn't empty
        if (!sanitized || sanitized.trim().length === 0) {
            throw new StorageError("SVG sanitization produced empty content");
        }

        return Buffer.from(sanitized, "utf-8");
    } catch (error) {
        if (error instanceof StorageError) {
            throw error;
        }
        logger.error("SVG processing failed", { error });
        throw new StorageError("Failed to process SVG");
    }
}

/**
 * Generates a thumbnail from an image.
 *
 * @param buffer - Image buffer
 * @param options - Thumbnail options
 * @returns Thumbnail buffer
 */
export async function generateThumbnail(
    buffer: Buffer,
    options: ThumbnailOptions = {}
): Promise<Buffer> {
    const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

    try {
        return await sharp(buffer, { failOnError: true })
            .resize(opts.size, opts.size, {
                fit: opts.fit,
                position: "center",
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .jpeg({ quality: opts.quality, progressive: true })
            .toBuffer();
    } catch (error) {
        logger.error("Thumbnail generation failed", { error });
        throw new StorageError("Failed to generate thumbnail");
    }
}

/**
 * Gets metadata from an image buffer.
 */
export async function getImageMetadata(buffer: Buffer): Promise<FileMetadata> {
    try {
        const metadata = await sharp(buffer).metadata();

        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: buffer.length,
            hasAlpha: metadata.hasAlpha,
        };
    } catch (error) {
        logger.error("Failed to extract image metadata", { error });
        return { size: buffer.length };
    }
}

/**
 * Converts an image to a different format.
 */
export async function convertImage(
    buffer: Buffer,
    targetFormat: "jpeg" | "png" | "webp",
    quality: number = 85
): Promise<Buffer> {
    try {
        let pipeline = sharp(buffer, { failOnError: true });

        switch (targetFormat) {
            case "jpeg":
                pipeline = pipeline.jpeg({ quality, progressive: true });
                break;
            case "png":
                pipeline = pipeline.png({ quality });
                break;
            case "webp":
                pipeline = pipeline.webp({ quality });
                break;
        }

        return await pipeline.toBuffer();
    } catch (error) {
        logger.error("Image conversion failed", { targetFormat, error });
        throw new StorageError(`Failed to convert image to ${targetFormat}`);
    }
}