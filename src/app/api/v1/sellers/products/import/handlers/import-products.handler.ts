import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import { parseExcelFileWithErrors } from "@/lib/excel/parse";  // Adjusted to decoupled location
import { successResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";

import { ImportResult } from "../types";
import {
    REQUIRED_HEADERS,
    MAX_IMPORT_ROWS,
    MAX_FILE_SIZE,
    BATCH_SIZE
} from "../constants";
import { validateProductRow } from "../validators";
import { transformRowToProduct } from "../transforms";
import { getSellerShop } from "../../queries/get-seller-shop";
import { getCategoryMap } from "../queries/get-category-map";
import { processBatch } from "../services/process-batch";
import { generateResultMessage } from "../utils/generate-result-message";

export async function importProductsHandler(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const user = requireAuth(request, ["SELLER"]);

    // Get seller's shop
    const shop = await getSellerShop(user.userId);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const updateExisting = formData.get("updateExisting") === "true";
    const skipErrors = formData.get("skipErrors") === "true";
    const dryRun = formData.get("dryRun") === "true";

    // Parse user-provided column mapping (from mapping UI step)
    let columnMapping: Record<string, string> = {};
    const mappingRaw = formData.get("columnMapping");
    if (mappingRaw && typeof mappingRaw === "string") {
        try {
            columnMapping = JSON.parse(mappingRaw);
        } catch {
            throw new ValidationError("Invalid column mapping format");
        }
    }

    // Validate file presence
    if (!file) {
        throw new ValidationError("No file provided");
    }

    // Validate file type
    const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ];
    const isValidType =
        validTypes.includes(file.type) ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

    if (!isValidType) {
        throw new ValidationError(
            "Invalid file type. Please upload an Excel file (.xlsx or .xls)"
        );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError(
            `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseResult = parseExcelFileWithErrors(
        buffer,
        {
            requiredHeaders: REQUIRED_HEADERS,
            maxRows: MAX_IMPORT_ROWS,
            skipEmptyRows: true,
            trimStrings: true,
            columnMapping,
        },
        (row, index) => validateProductRow(row, index)
    );

    // Check for parsing errors
    if (parseResult.data.length === 0 && parseResult.errors.length === 0) {
        throw new ValidationError("Excel file contains no valid data rows");
    }

    // Initialize result tracking
    const result: ImportResult = {
        success: true,
        message: "",
        stats: {
            total: parseResult.meta.totalRows,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: parseResult.errors.length,
        },
        errors: parseResult.errors.map((e) => ({
            row: e.row,
            message: e.errors.join("; "),
        })),
        warnings: parseResult.meta.warnings,
        duration: 0,
    };

    // If dry run, return validation results without importing
    if (dryRun) {
        result.duration = Date.now() - startTime;
        result.message = `Dry run completed. ${parseResult.data.length} rows would be processed.`;
        return successResponse(result);
    }

    // Stop if too many errors and not skipping
    if (!skipErrors && result.errors.length > 0) {
        result.success = false;
        result.message = `Import aborted due to ${result.errors.length} validation errors. Fix errors or enable 'skipErrors' option.`;
        result.duration = Date.now() - startTime;
        return successResponse(result, { status: 400 });
    }

    // Prefetch categories for mapping
    const categoryMap = await getCategoryMap();

    // Process products in batches with transaction
    const processedRows = parseResult.data.map((row) =>
        transformRowToProduct(row, categoryMap)
    );

    try {
        // Track identifiers across batches to detect duplicates within the same import
        const seenIdentifiers = new Set<string>();

        // Process in batches
        for (let i = 0; i < processedRows.length; i += BATCH_SIZE) {
            const batch = processedRows.slice(i, i + BATCH_SIZE);
            const batchResults = await processBatch(
                batch,
                shop.id,
                updateExisting,
                i,
                seenIdentifiers
            );

            result.stats.created += batchResults.created;
            result.stats.updated += batchResults.updated;
            result.stats.skipped += batchResults.skipped;
            result.stats.failed += batchResults.failed;
            result.errors.push(...batchResults.errors);
        }

        result.duration = Date.now() - startTime;
        result.success = result.stats.failed === 0;
        result.message = generateResultMessage(result.stats);

        // Log import
        logger.info("Product import completed", {
            sellerId: user.userId,
            shopId: shop.id,
            stats: result.stats,
            duration: result.duration,
        });

        return successResponse(result);
    } catch (error) {
        logger.error("Product import failed", {
            sellerId: user.userId,
            shopId: shop.id,
            error,
        });

        result.success = false;
        result.message = "Import failed due to an unexpected error";
        result.duration = Date.now() - startTime;

        throw error;
    }
}