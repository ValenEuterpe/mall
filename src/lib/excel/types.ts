export type CellValue = string | number | boolean | Date | null;

export interface ExcelRow {
  [key: string]: CellValue;
}

export interface ParseOptions {
  /** Sheet index or name to parse (default: first sheet) */
  sheet?: number | string;
  /** Expected headers for validation */
  requiredHeaders?: string[];
  /** Map column names to standardized keys */
  columnMapping?: Record<string, string>;
  /** Skip empty rows */
  skipEmptyRows?: boolean;
  /** Maximum rows to parse (for safety) */
  maxRows?: number;
  /** Parse dates as Date objects */
  parseDates?: boolean;
  /** Trim string values */
  trimStrings?: boolean;
  /** Headers row index (0-based, default: 0) */
  headerRow?: number;
}

export interface ParseResult<T = ExcelRow> {
  data: T[];
  headers: string[];
  totalRows: number;
  skippedRows: number;
  warnings: string[];
  sheetName: string;
}

export interface GenerateOptions {
  /** Sheet name */
  sheetName?: string;
  /** Column widths */
  columnWidths?: Record<string, number>;
  /** Include header row styling */
  styleHeaders?: boolean;
  /** Date format string */
  dateFormat?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingHeaders: string[];
  extraHeaders: string[];
  errors: string[];
}
