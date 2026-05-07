import { ValidationError } from "@/lib/errors/custom-errors";
import { MIN_SHOP_NUMBER, MAX_SHOP_NUMBER, MAX_SHOPS_PER_REQUEST } from "../constants";

export function validateGenerationParams(
    startNumber: number,
    count: number
): void {
    if (startNumber < MIN_SHOP_NUMBER) {
        throw new ValidationError(
            `Start number must be at least ${MIN_SHOP_NUMBER}`
        );
    }

    if (startNumber + count - 1 > MAX_SHOP_NUMBER) {
        throw new ValidationError(
            `Shop numbers cannot exceed ${MAX_SHOP_NUMBER}`
        );
    }

    if (count > MAX_SHOPS_PER_REQUEST) {
        throw new ValidationError(
            `Cannot generate more than ${MAX_SHOPS_PER_REQUEST} shops at once`
        );
    }
}