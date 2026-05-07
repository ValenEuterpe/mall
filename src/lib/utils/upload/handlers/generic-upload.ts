import { saveFile } from "@/lib/upload/storage";
import { UploadResponse } from "../types";

export async function handleGenericUpload(
    buffer: Buffer,
    file: File,
    filename: string
): Promise<UploadResponse> {
    const result = await saveFile(buffer, filename, file.type);

    return {
        url: result.url,
        filename,
        originalName: file.name,
        size: result.size,
        type: file.type,
    };
}
