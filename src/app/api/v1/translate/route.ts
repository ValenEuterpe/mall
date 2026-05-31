/**
 * Translation API Endpoint
 *
 * POST /api/v1/translate
 *
 * Translates text or product fields to all supported languages using Gemini AI.
 * Requires SELLER or MALL_OWNER role.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import {
  translateText,
  translateBatch,
  isTranslationAvailable,
} from "@/lib/translation";
import {
  enforceRateLimit,
  translationRateLimiter,
} from "@/lib/utils/rate-limit";

// Error response helper
function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

// Schema for single text translation
const translateTextSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(5000),
});

// Schema for product fields translation (batch)
const translateProductSchema = z.object({
  type: z.literal("product"),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  detailDescription: z.string().max(10000).optional(),
});

const requestSchema = z.discriminatedUnion("type", [
  translateTextSchema,
  translateProductSchema,
]);

/**
 * POST /api/v1/translate
 *
 * Translate text or product fields to all supported languages.
 */
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const limited = enforceRateLimit(
      request,
      translationRateLimiter,
      user.userId
    );
    if (limited) return limited.response;

    // Check if translation is available
    if (!isTranslationAvailable()) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Translation service is not configured",
        503
      );
    }

    const body = await request.json();

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const data = parsed.data;

    try {
      if (data.type === "text") {
        // Simple text translation
        const result = await translateText(data.text);

        return successResponse({
          type: "text",
          translations: {
            en: result.en,
            ru: result.ru,
            am: result.am,
          },
          detectedLanguage: result.detectedLanguage,
        });
      } else {
        // Product fields translation (batch)
        const result = await translateBatch({
          name: data.name,
          description: data.description,
          detailDescription: data.detailDescription,
        });

        return successResponse({
          type: "product",
          name: result.name,
          description: result.description,
          detailDescription: result.detailDescription,
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      return errorResponse(
        "TRANSLATION_ERROR",
        error instanceof Error ? error.message : "Translation failed",
        500
      );
    }
  },
  {
    roles: ["SELLER", "MALL_OWNER"],
  }
);

// Only POST is allowed
export const GET = () => methodNotAllowed(["POST"]);
export const PUT = () => methodNotAllowed(["POST"]);
export const DELETE = () => methodNotAllowed(["POST"]);
