import { ValidationError } from "@/lib/errors/custom-errors";

export function validateSellerId(id: string): void {
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]{20,36}$/.test(id)) {
        throw new ValidationError("Invalid seller ID format");
    }
}