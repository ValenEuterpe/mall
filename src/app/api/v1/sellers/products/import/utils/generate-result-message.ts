import { ImportResult } from "../types";

export function generateResultMessage(stats: ImportResult["stats"]): string {
    const parts: string[] = [];

    if (stats.created > 0) {
        parts.push(`${stats.created} products created`);
    }
    if (stats.updated > 0) {
        parts.push(`${stats.updated} products updated`);
    }
    if (stats.skipped > 0) {
        parts.push(`${stats.skipped} rows skipped`);
    }
    if (stats.failed > 0) {
        parts.push(`${stats.failed} rows failed`);
    }

    if (parts.length === 0) {
        return "No changes made";
    }

    return `Import completed: ${parts.join(", ")}`;
}