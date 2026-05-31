import * as XLSX from "xlsx";
import { ValidationError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";

import { ExcelRow, ParseOptions, ParseResult } from "./types";
import { DEFAULT_PARSE_OPTIONS, MAX_FILE_SIZE } from "./constants";
import {
  getSheetName,
  normalizeHeaders,
  isEmptyRow,
  processRow,
  formatBytes,
} from "./helpers";
import { validateHeaders } from "./validate";

/**
 * Parses an Excel file buffer into structured data.
 *
 * @param buffer - Excel file content as Buffer
 * @param options - Parsing options
 * @returns Parsed data with metadata
 * @throws {ValidationError} If file is invalid or too large
 */
export function parseExcelFile<T extends ExcelRow = ExcelRow>(
  buffer: Buffer,
  options: ParseOptions = {}
): ParseResult<T> {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const warnings: string[] = [];
  let skippedRows = 0;

  // Validate buffer size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size (${formatBytes(buffer.length)}) exceeds maximum allowed (${formatBytes(MAX_FILE_SIZE)})`
    );
  }

  if (buffer.length === 0) {
    throw new ValidationError("Excel file is empty");
  }

  // Parse workbook
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: opts.parseDates,
      cellNF: true,
      cellText: true,
    });
  } catch (error) {
    logger.error("Failed to parse Excel file", { error });
    throw new ValidationError(
      "Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file."
    );
  }

  // Get sheet
  const sheetName = getSheetName(workbook, opts.sheet);
  if (!sheetName) {
    throw new ValidationError("Specified sheet not found in workbook");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ValidationError("Sheet is empty or invalid");
  }

  // Convert to JSON with options
  // Note: header: 0 in xlsx means "generate numeric keys" which breaks column detection.
  // Only pass header option when explicitly set to a non-default value.
  const sheetToJsonOpts: XLSX.Sheet2JSONOpts = {
    raw: true,
    defval: null,
    blankrows: false,
  };
  if (opts.headerRow && opts.headerRow !== 0) {
    sheetToJsonOpts.header = opts.headerRow;
  }
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    sheet,
    sheetToJsonOpts
  );

  if (rawData.length === 0) {
    return {
      data: [],
      headers: [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ["Sheet contains no data rows"],
      sheetName,
    };
  }

  // Extract and normalize headers
  const originalHeaders = Object.keys(rawData[0] || {});
  const normalizedHeaders = normalizeHeaders(
    originalHeaders,
    opts.columnMapping
  );

  // Validate required headers
  if (opts.requiredHeaders.length > 0) {
    const validation = validateHeaders(
      Object.values(normalizedHeaders),
      opts.requiredHeaders
    );

    if (!validation.isValid) {
      throw new ValidationError(
        `Missing required columns: ${validation.missingHeaders.join(", ")}`
      );
    }

    if (validation.extraHeaders.length > 0) {
      warnings.push(
        `Extra columns will be ignored: ${validation.extraHeaders.join(", ")}`
      );
    }
  }

  // Process rows
  const processedData: T[] = [];
  const rowLimit = Math.min(rawData.length, opts.maxRows);

  for (let i = 0; i < rowLimit; i++) {
    const rawRow = rawData[i];

    // Check for empty row
    if (opts.skipEmptyRows && isEmptyRow(rawRow)) {
      skippedRows++;
      continue;
    }

    // Transform row with normalized headers
    const processedRow = processRow(rawRow, normalizedHeaders, opts);
    processedData.push(processedRow as T);
  }

  if (rawData.length > opts.maxRows) {
    warnings.push(
      `File contains ${rawData.length} rows but only first ${opts.maxRows} were processed`
    );
  }

  return {
    data: processedData,
    headers: Object.values(normalizedHeaders),
    totalRows: rawData.length,
    skippedRows,
    warnings,
    sheetName,
  };
}

/**
 * Parses Excel file with row-level error handling.
 * Returns both successful rows and errors.
 */
export function parseExcelFileWithErrors<T extends ExcelRow = ExcelRow>(
  buffer: Buffer,
  options: ParseOptions = {},
  rowValidator?: (
    row: ExcelRow,
    index: number
  ) => { valid: boolean; errors: string[] }
): {
  data: T[];
  errors: Array<{ row: number; errors: string[] }>;
  meta: Omit<ParseResult<T>, "data">;
} {
  const result = parseExcelFile<T>(buffer, options);
  const validData: T[] = [];
  const rowErrors: Array<{ row: number; errors: string[] }> = [];

  result.data.forEach((row, index) => {
    if (rowValidator) {
      const validation = rowValidator(row, index);
      if (!validation.valid) {
        rowErrors.push({ row: index + 2, errors: validation.errors }); // +2 for header + 1-indexing
        return;
      }
    }
    validData.push(row);
  });

  return {
    data: validData,
    errors: rowErrors,
    meta: {
      headers: result.headers,
      totalRows: result.totalRows,
      skippedRows: result.skippedRows + rowErrors.length,
      warnings: result.warnings,
      sheetName: result.sheetName,
    },
  };
}
