import { sanitizeCodePart } from "./sanitize-code-part";

export function generateShopCode(
  venue: string,
  building: string | null,
  floor: string | null,
  shopNumber: string
): string {
  const parts: string[] = [sanitizeCodePart(venue)];

  if (building) {
    parts.push(sanitizeCodePart(building));
  }

  if (floor) {
    parts.push(`F${sanitizeCodePart(floor)}`);
  }

  parts.push(`S${shopNumber}`);

  return parts.join("");
}
