import { productRowSchema } from "./schemas";

export function validateProductRow(
    row: Record<string, unknown>,
    _index: number
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate basic shape using Zod schema (lenient — allows nulls and extra cols)
    const result = productRowSchema.safeParse(row);
    if (!result.success) {
        errors.push(
            ...result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`)
        );
    }

    // Strict check: product name is required and must be a non-empty string
    const name = row.name;
    const nameStr = name !== null && name !== undefined ? String(name).trim() : "";
    if (nameStr.length === 0) {
        errors.push("Product name is required");
    } else if (nameStr.length > 255) {
        errors.push("Product name must be 255 characters or less");
    }

    const price = row.price ?? row.basePrice;
    if (price !== undefined && price !== null && String(price).trim() !== "") {
        const numPrice = parseFloat(String(price));
        if (isNaN(numPrice) || numPrice < 0) {
            errors.push("Price must be a valid positive number");
        }
    }

    const stock = row.stock ?? row.quantity ?? row.stockQuantity;
    if (stock !== undefined && stock !== null && String(stock).trim() !== "") {
        const numStock = parseInt(String(stock));
        if (isNaN(numStock) || numStock < 0) {
            errors.push("Stock quantity must be a valid non-negative integer");
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}