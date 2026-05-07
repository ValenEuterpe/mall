import { sanitizeCodePart } from "./sanitize-code-part";

export function generateSvgId(
    venue: string,
    building: string | null,
    floor: string | null,
    shopNumber: string
): string {
    const parts = ["shop", sanitizeCodePart(venue).toLowerCase()];

    if (building) {
        parts.push(sanitizeCodePart(building).toLowerCase());
    }

    if (floor) {
        parts.push(`f${sanitizeCodePart(floor).toLowerCase()}`);
    }

    parts.push(shopNumber);

    return parts.join("-");
}