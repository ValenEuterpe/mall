/**
 * Parses an internal shop code (e.g. "V1B1FF2S01") and returns a
 * human-readable location string using the provided translation function.
 *
 * Pattern: V{venue}B{building}F{floor}S{shop}
 * - "FF2" means floor 2 (the code prefix is "F" + floor digit(s))
 * - "S01" means shop 1
 *
 * @param code  Internal shop code, e.g. "V1B1FF2S01"
 * @param t     Translation function that accepts keys under "common.shopLocation"
 * @returns     Localized string like "Shop 1, Floor 2"
 */
export function formatShopLocation(
  code: string | null | undefined,
  t: (key: string, params?: any) => string
): string {
  if (!code) return "";

  // Extract shop number: last S followed by digits
  const shopMatch = code.match(/S0*(\d+)/i);
  // Extract floor number: F followed by digits (take the last match for "FF2" patterns)
  const floorMatches = code.match(/F(\d+)/gi);
  const lastFloorMatch = floorMatches?.[floorMatches.length - 1];
  const floorNum = lastFloorMatch?.match(/F(\d+)/i)?.[1];

  const shop = shopMatch ? parseInt(shopMatch[1], 10) : null;
  const floor = floorNum ? parseInt(floorNum, 10) : null;

  if (shop !== null && floor !== null) {
    return t("shopLocationFull", { shop, floor });
  }
  if (shop !== null) {
    return t("shopLocationShort", { shop });
  }

  // Can't parse — return original code
  return code;
}
