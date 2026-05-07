/**
 * SVG Parser Utility
 * 
 * Extracts shop element IDs from SVG content following the pattern:
 * V{venue}B{building}F{floor}S{shop}
 * 
 * Examples:
 * - V1B1F1S1 = Venue 1, Building 1, Floor 1, Shop 1
 * - V2S5 = Venue 2, Shop 5 (outdoor kiosk)
 * - B1F2S3 = Building 1, Floor 2, Shop 3 (no venue prefix)
 * - V1S1 = Venue 1, Shop 1 (outdoor area)
 */

// Pattern matches: V1B1F1S1, V2S5, B1F2S3, V1S1, etc.
// All parts except S (shop) are optional
const SHOP_ID_PATTERN = /^(V\d+)?(B\d+)?(F\d+)?(S\d+)$/i;

export interface ParsedShopId {
  /** Full ID as found in SVG */
  id: string;
  /** Venue number (e.g., "V1" -> 1) */
  venue?: number;
  /** Building number (e.g., "B1" -> 1) */
  building?: number;
  /** Floor number (e.g., "F1" -> 1) */
  floor?: number;
  /** Shop number (e.g., "S1" -> 1) */
  shop: number;
}

export interface SvgParseResult {
  /** All valid shop IDs found */
  shopIds: ParsedShopId[];
  /** Total elements with IDs found */
  totalElementsWithIds: number;
  /** IDs that didn't match the pattern */
  unmatchedIds: string[];
}

/**
 * Parse a shop ID string and extract its components
 */
export function parseShopId(id: string): ParsedShopId | null {
  const match = id.toUpperCase().match(SHOP_ID_PATTERN);
  if (!match) return null;

  const [, venueMatch, buildingMatch, floorMatch, shopMatch] = match;
  
  // Shop number is required
  if (!shopMatch) return null;

  return {
    id: id.toUpperCase(),
    venue: venueMatch ? parseInt(venueMatch.slice(1), 10) : undefined,
    building: buildingMatch ? parseInt(buildingMatch.slice(1), 10) : undefined,
    floor: floorMatch ? parseInt(floorMatch.slice(1), 10) : undefined,
    shop: parseInt(shopMatch.slice(1), 10),
  };
}

/**
 * Extract all element IDs from SVG content
 */
export function extractElementIds(svgContent: string): string[] {
  const ids: string[] = [];
  
  // Match id="..." or id='...' attributes
  const idPattern = /\bid=["']([^"']+)["']/gi;
  let match;
  
  while ((match = idPattern.exec(svgContent)) !== null) {
    ids.push(match[1]);
  }
  
  return ids;
}

/**
 * Parse SVG content and extract shop element IDs
 */
export function parseSvgForShopIds(svgContent: string): SvgParseResult {
  const allIds = extractElementIds(svgContent);
  const shopIds: ParsedShopId[] = [];
  const unmatchedIds: string[] = [];

  for (const id of allIds) {
    const parsed = parseShopId(id);
    if (parsed) {
      shopIds.push(parsed);
    } else {
      unmatchedIds.push(id);
    }
  }

  return {
    shopIds,
    totalElementsWithIds: allIds.length,
    unmatchedIds,
  };
}

/**
 * Filter shop IDs by building code
 */
export function filterByBuilding(shopIds: ParsedShopId[], buildingNumber: number): ParsedShopId[] {
  return shopIds.filter(s => s.building === buildingNumber);
}

/**
 * Filter shop IDs by floor
 */
export function filterByFloor(shopIds: ParsedShopId[], floorNumber: number): ParsedShopId[] {
  return shopIds.filter(s => s.floor === floorNumber);
}

/**
 * Filter shop IDs by venue code
 */
export function filterByVenue(shopIds: ParsedShopId[], venueNumber: number): ParsedShopId[] {
  return shopIds.filter(s => s.venue === venueNumber);
}

/**
 * Generate the expected SVG ID for a shop based on its location
 */
export function generateShopSvgId(params: {
  venue?: number;
  building?: number;
  floor?: number;
  shop: number;
}): string {
  let id = '';
  if (params.venue !== undefined) id += `V${params.venue}`;
  if (params.building !== undefined) id += `B${params.building}`;
  if (params.floor !== undefined) id += `F${params.floor}`;
  id += `S${params.shop}`;
  return id;
}

/**
 * Validate that an SVG string is well-formed
 */
export function validateSvgContent(svgContent: string): { valid: boolean; error?: string } {
  // Check for SVG root element
  if (!/<svg[^>]*>/i.test(svgContent)) {
    return { valid: false, error: 'Missing <svg> root element' };
  }

  // Check for closing tag
  if (!/<\/svg>/i.test(svgContent)) {
    return { valid: false, error: 'Missing closing </svg> tag' };
  }

  // Basic XSS prevention - disallow script tags
  if (/<script/i.test(svgContent)) {
    return { valid: false, error: 'Script tags are not allowed in SVG' };
  }

  // Disallow event handlers
  if (/\bon\w+\s*=/i.test(svgContent)) {
    return { valid: false, error: 'Event handlers are not allowed in SVG' };
  }

  return { valid: true };
}
