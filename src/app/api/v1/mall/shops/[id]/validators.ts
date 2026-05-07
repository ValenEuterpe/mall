import { ValidationError } from "@/lib/errors/custom-errors";

export function validateShopId(id: string): void {
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]{20,36}$/.test(id)) {
        throw new ValidationError("Invalid shop ID format");
    }
}