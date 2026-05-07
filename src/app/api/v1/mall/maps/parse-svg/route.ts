import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import { z } from "zod";
import { parseSvgForShopIds, validateSvgContent } from "@/lib/map/svg-parser";

// ============================================================================
// SCHEMAS
// ============================================================================

const parseSvgSchema = z.object({
  svgContent: z.string().min(1),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/v1/mall/maps/parse-svg
 * Parse SVG content and extract shop element IDs
 */
async function parseSvgHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const validated = parseSvgSchema.parse(body);

  // Validate SVG structure
  const validation = validateSvgContent(validated.svgContent);
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SVG",
          message: validation.error,
        },
      },
      { status: 400 }
    );
  }

  // Parse for shop IDs
  const result = parseSvgForShopIds(validated.svgContent);

  return successResponse({
    shopIds: result.shopIds,
    totalElementsWithIds: result.totalElementsWithIds,
    matchedCount: result.shopIds.length,
    unmatchedCount: result.unmatchedIds.length,
    unmatchedIds: result.unmatchedIds.slice(0, 50), // Limit to first 50 for response size
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const POST = withMiddleware(parseSvgHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});
