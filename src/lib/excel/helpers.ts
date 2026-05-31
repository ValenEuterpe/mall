import * as XLSX from "xlsx";
import { CellValue, ExcelRow } from "./types";
import { HEADER_ALIASES } from "./constants";
import { ParseOptions } from "./types";

/**
 * Gets sheet name from workbook by index or name.
 */
export function getSheetName(
  workbook: XLSX.WorkBook,
  sheet: number | string
): string | null {
  if (typeof sheet === "number") {
    return workbook.SheetNames[sheet] || null;
  }
  return workbook.SheetNames.includes(sheet) ? sheet : null;
}

/**
 * Normalizes headers using column mapping and aliases.
 */
export function normalizeHeaders(
  headers: string[],
  customMapping: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

    // Check custom mapping first
    if (customMapping[header]) {
      mapping[header] = customMapping[header];
      continue;
    }

    if (customMapping[normalized]) {
      mapping[header] = customMapping[normalized];
      continue;
    }

    // Check aliases
    let matched = false;
    for (const [standardName, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized)) {
        mapping[header] = standardName;
        matched = true;
        break;
      }
    }

    // Use original if no mapping found
    if (!matched) {
      mapping[header] = header;
    }
  }

  return mapping;
}

/**
 * Checks if two headers match (considering aliases).
 */
export function headersMatch(actual: string, required: string): boolean {
  if (actual === required) return true;

  const aliases = HEADER_ALIASES[required];
  if (aliases) {
    const normalizedActual = actual.toLowerCase().replace(/[\s_-]+/g, "");
    return aliases.includes(normalizedActual);
  }

  return false;
}

/**
 * Checks if a row is empty (all values null or empty string).
 */
export function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every(
    (value) => value === null || value === undefined || value === ""
  );
}

/**
 * Processes a single row with normalization.
 */
export function processRow(
  rawRow: Record<string, unknown>,
  headerMapping: Record<string, string>,
  options: Required<ParseOptions>
): ExcelRow {
  const processed: ExcelRow = {};

  for (const [originalHeader, value] of Object.entries(rawRow)) {
    const normalizedHeader = headerMapping[originalHeader] || originalHeader;
    processed[normalizedHeader] = processValue(value, options);
  }

  return processed;
}

/**
 * Processes a single cell value.
 */
export function processValue(
  value: unknown,
  options: Required<ParseOptions>
): CellValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const processed = options.trimStrings ? value.trim() : value;
    return processed === "" ? null : processed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return options.parseDates ? value : value.toISOString();
  }

  return String(value);
}

/**
 * Formats bytes for display.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
