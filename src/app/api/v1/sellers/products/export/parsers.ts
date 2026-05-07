import { ExportOptions } from "./types";
import { DEFAULT_EXPORT_FIELDS } from "./constants";

export function parseExportOptions(searchParams: URLSearchParams): ExportOptions {
    return {
        format: (searchParams.get("format") as "xlsx" | "csv") || "xlsx",
        includeImages: searchParams.get("includeImages") === "true",
        includeInactive: searchParams.get("includeInactive") === "true",
        fields: searchParams.get("fields")?.split(",") || DEFAULT_EXPORT_FIELDS,
        status: searchParams.get("status") || undefined,
    };
}