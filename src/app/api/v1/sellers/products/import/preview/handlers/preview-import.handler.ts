import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/api/auth-helper";
import { normalizeHeaders } from "@/lib/excel/helpers";
import { successResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors/custom-errors";
import { MAX_FILE_SIZE } from "../../constants";

const KNOWN_FIELDS = [
    "name",
    "description",
    "price",
    "stock",
    "sku",
    "barcode",
    "brand",
    "category",
    "status",
];

export async function previewImportHandler(
    request: NextRequest
): Promise<NextResponse> {
    requireAuth(request, ["SELLER"]);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        throw new ValidationError("No file provided");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError("File size exceeds maximum allowed");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse workbook to get raw headers
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new ValidationError("Excel file has no sheets");
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: false,
        defval: null,
        blankrows: false,
    });

    if (rawData.length === 0) {
        throw new ValidationError("Excel file contains no data rows");
    }

    // Get raw headers (original column names from Excel)
    const rawHeaders = Object.keys(rawData[0]);

    // Build auto-mapping using existing alias system
    const normalizedMap = normalizeHeaders(rawHeaders, {});
    const autoMapping: Record<string, string | null> = {};

    for (const rawHeader of rawHeaders) {
        const normalized = normalizedMap[rawHeader];
        if (normalized && KNOWN_FIELDS.includes(normalized)) {
            autoMapping[rawHeader] = normalized;
        } else {
            autoMapping[rawHeader] = null;
        }
    }

    // Sample data: first 3 rows with original header keys
    const sampleData = rawData.slice(0, 3).map((row) => {
        const sample: Record<string, string> = {};
        for (const header of rawHeaders) {
            const val = row[header];
            sample[header] = val !== null && val !== undefined ? String(val) : "";
        }
        return sample;
    });

    return successResponse({
        headers: rawHeaders,
        sampleData,
        autoMapping,
        totalRows: rawData.length,
    });
}
