import { ExcelRow } from "./types";
import { z } from "zod";

export * from "./types";
export * from "./constants";
export * from "./helpers";
export * from "./validate";
export * from "./parse";
export * from "./generate";

/**
 * Creates a typed row parser with Zod schema validation.
 */
export function createRowParser<T>(schema: z.ZodSchema<T>) {
    return (row: ExcelRow, rowIndex: number): { data: T | null; errors: string[] } => {
        const result = schema.safeParse(row);

        if (result.success) {
            return { data: result.data, errors: [] };
        }

        const errors = result.error.issues.map(
            (e) => `Row ${rowIndex + 2}: ${e.path.join(".")} - ${e.message}`
        );

        return { data: null, errors };
    };
}