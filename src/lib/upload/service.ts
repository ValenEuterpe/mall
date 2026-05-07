import {
    validateFile,
    validateFileSignature,
    generateSafeFilename,
} from "@/lib/upload/validator";
import { deleteFile } from "@/lib/upload/storage";
import { handleImageUpload } from "../utils/upload/handlers/image-upload";
import { handleGenericUpload } from "../utils/upload/handlers/generic-upload";
import { UploadOptions, UploadResponse } from "../utils/upload/types";

export async function uploadFile(
    file: File,
    userId: string,
    options: UploadOptions
): Promise<UploadResponse> {
    validateFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    validateFileSignature(buffer, file.type);

    const filename = generateSafeFilename(file.name, `user-${userId}`);

    let savedUrl: string | null = null;
    let savedThumbnail: string | null = null;

    try {
        const response = file.type.startsWith("image/")
            ? await handleImageUpload(buffer, file, filename, options)
            : await handleGenericUpload(buffer, file, filename);

        savedUrl = response.url;
        savedThumbnail = response.thumbnailUrl ?? null;

        return response;
    } catch (err) {
        if (savedUrl) await deleteFile(savedUrl).catch(() => { });
        if (savedThumbnail) await deleteFile(savedThumbnail).catch(() => { });
        throw err;
    }
}
