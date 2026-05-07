import * as XLSX from "xlsx";
import { ValidationError } from "@/lib/errors/custom-errors";

import { GenerateOptions } from "./types";
import { DEFAULT_GENERATE_OPTIONS } from "./constants";

/**
 * Generates an Excel file from data.
 *
 * @param data - Array of objects to convert
 * @param options - Generation options
 * @returns Excel file as Buffer
 */
export function generateExcelFile(
    data: Record<string, unknown>[],
    options: GenerateOptions = {}
): Buffer {
    const opts = { ...DEFAULT_GENERATE_OPTIONS, ...options };

    if (!Array.isArray(data)) {
        throw new ValidationError("Data must be an array");
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
        dateNF: opts.dateFormat,
    });

    // Apply column widths
    if (Object.keys(opts.columnWidths).length > 0 || opts.styleHeaders) {
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        worksheet["!cols"] = headers.map((header) => ({
            wch: opts.columnWidths[header] || Math.max(header.length, 12),
        }));
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, opts.sheetName);

    // Generate buffer
    return Buffer.from(
        XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
            compression: true,
        })
    );
}

/**
 * Generates an Excel file with multiple sheets.
 */
export function generateMultiSheetExcel(
    sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
    options: Omit<GenerateOptions, "sheetName"> = {}
): Buffer {
    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
        if (sheet.data.length === 0) continue;

        const worksheet = XLSX.utils.json_to_sheet(sheet.data, {
            dateNF: options.dateFormat || DEFAULT_GENERATE_OPTIONS.dateFormat,
        });

        // Ensure unique sheet name (Excel limit: 31 chars)
        const sheetName = sheet.name.slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    return Buffer.from(
        XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
            compression: true,
        })
    );
}

/**
 * Generates a template Excel file with headers only.
 */
export function generateTemplateFile(
    headers: string[],
    sheetName: string = "Template",
    sampleData?: Record<string, unknown>
): Buffer {
    const data = sampleData ? [sampleData] : [];

    // Create worksheet with headers
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

    // Set column widths
    worksheet["!cols"] = headers.map((header) => ({
        wch: Math.max(header.length + 2, 15),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    return Buffer.from(
        XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
            compression: true,
        })
    );
}