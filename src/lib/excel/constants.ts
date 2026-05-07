import { ParseOptions, GenerateOptions } from "./types";

export const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
    sheet: 0,
    requiredHeaders: [],
    columnMapping: {},
    skipEmptyRows: true,
    maxRows: 10000,
    parseDates: true,
    trimStrings: true,
    headerRow: 0,
};

export const DEFAULT_GENERATE_OPTIONS: Required<GenerateOptions> = {
    sheetName: "Sheet1",
    columnWidths: {},
    styleHeaders: true,
    dateFormat: "yyyy-mm-dd",
};

/** Maximum file size for parsing (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Common header name variations for normalization */
export const HEADER_ALIASES: Record<string, string[]> = {
    name: ["name", "productname", "product_name", "title", "item"],
    description: ["description", "desc", "details", "info"],
    price: ["price", "baseprice", "base_price", "cost", "amount"],
    stock: ["stock", "quantity", "qty", "stockquantity", "stock_quantity", "inventory"],
    sku: ["sku", "productcode", "product_code", "code", "itemcode"],
    barcode: ["barcode", "upc", "ean", "gtin"],
    brand: ["brand", "manufacturer", "make"],
    category: ["category", "categoryname", "category_name", "type"],
    status: ["status", "state", "active"],
};