import { NextRequest } from "next/server";
import { transliterate } from "transliteration";
import { withMiddleware } from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";

/**
 * GET /api/v1/translate/transliterate?text=...
 *
 * Thin wrapper around the `transliteration` library so the seller's create-tag
 * dialog can show a live Latin-form preview without bundling the library
 * into the client (small but unnecessary).
 *
 * Returns: { text: string }  — the lowercased Latin form, or "" if input is already Latin.
 */
async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").trim();

  if (!text) {
    return successResponse({ text: "" });
  }

  const latin = transliterate(text).toLowerCase().trim();
  // If the input is already Latin, the result equals the input (lowercased) — return empty
  // so the client can hide the preview.
  const result = latin && latin !== text.toLowerCase() ? latin : "";
  return successResponse({ text: result });
}

export const GET = withMiddleware(handler, {
  requireAuth: false,
  rateLimit: true,
});
