import { headersMatch } from "./helpers";
import { ExcelRow, ValidationResult } from "./types";

/**
 * Validates Excel headers against required fields.
 */
export function validateHeaders(
    actualHeaders: string[],
    requiredHeaders: string[]
): ValidationResult {
    const normalizedActual = actualHeaders.map((h) => h.toLowerCase().trim());
    const normalizedRequired = requiredHeaders.map((h) => h.toLowerCase().trim());

    const missingHeaders = normalizedRequired.filter(
        (required) => !normalizedActual.some((actual) => headersMatch(actual, required))
    );

    const extraHeaders = normalizedActual.filter(
        (actual) => !normalizedRequired.some((required) => headersMatch(actual, required))
    );

    return {
        isValid: missingHeaders.length === 0,
        missingHeaders,
        extraHeaders,
        errors: missingHeaders.map((h) => `Missing required column: ${h}`),
    };
}

/**
 * Validates that data array is not empty and has expected structure.
 */
export function validateExcelData(
    data: ExcelRow[],
    requiredHeaders: string[]
): ValidationResult {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            isValid: false,
            missingHeaders: [],
            extraHeaders: [],
            errors: ["Excel file contains no data rows"],
        };
    }

    const headers = Object.keys(data[0]);
    return validateHeaders(headers, requiredHeaders);
}