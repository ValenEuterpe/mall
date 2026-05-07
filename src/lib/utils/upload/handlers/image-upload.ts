import {
    saveFile,
    saveFileWithThumbnail,
} from "@/lib/upload/storage";
import { processImage, processSvg, getImageMetadata } from "../image-processor";
import { THUMBNAIL_TYPES } from "../constants";
import { UploadOptions, UploadResponse } from "../types";


export async function handleImageUpload(
    buffer: Buffer,
    file: File,
    filename: string,
    options: UploadOptions
): Promise<UploadResponse> {
    if (file.type === "image/svg+xml") {
        const processed = await processSvg(buffer);
        const result = await saveFile(processed, filename, file.type);

        return {
            url: result.url,
            filename,
            originalName: file.name,
            size: result.size,
            type: file.type,
        };
    }

    // Preserve original format instead of converting everything to JPEG
    const formatMap: Record<string, "jpeg" | "png" | "webp"> = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const format = formatMap[file.type] || "webp";

    const processed = await processImage(buffer, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
        format,
    });

    if (options.generateThumbnail && THUMBNAIL_TYPES.has(file.type)) {
        const result = await saveFileWithThumbnail(processed, filename, {
            size: 200,
            quality: 80,
        });

        return {
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            filename,
            originalName: file.name,
            size: processed.length,
            type: file.type,
            metadata: result.metadata,
        };
    }

    const metadata = await getImageMetadata(processed);
    const result = await saveFile(processed, filename, file.type);

    return {
        url: result.url,
        filename,
        originalName: file.name,
        size: result.size,
        type: file.type,
        metadata,
    };
}
