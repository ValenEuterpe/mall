import { NextRequest } from "next/server";

import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { isLocale, routing } from "@/i18n/routing";
import { env } from "@/env";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp, getUserAgent } from "@/lib/http/request";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { validateBody } from "@/lib/validation/request";

import { emailObjectSchema } from "@/lib/validation/schemas/common";
import { createMagicLinkToken } from "@/lib/auth/email";
import { sendMagicLinkEmail, dispatch } from "@/lib/email/send";
import {
  findMallOwnerByEmail,
  updateMagicLinkRequestMetadata,
  logMagicLinkEvent,
} from "@/services";

import {
  createMagicLinkErrorResponse,
  createGenericMagicLinkSuccessResponse,
  getMagicLinkMessage,
} from "./response-builder";

/**
 * POST /api/v1/auth/mall-owner/request-link
 *
 * Sends a magic-link login email to a mall owner.
 * Always returns a generic success response to prevent email enumeration.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request) ?? "unknown";

  try {
    const body = await validateBody(request, emailObjectSchema);
    const email = normalizeEmail(body.email);

    // Determine locale for the email link. API routes are not locale-prefixed, so we infer
    // from the Referer (e.g. /en/auth/mall-owner/login). Fallback to default locale.
    const referer = request.headers.get("referer");
    const localeFromReferer = (() => {
      if (!referer) return null;
      try {
        const url = new URL(referer);
        const firstSegment = url.pathname.split("/").filter(Boolean)[0];
        return firstSegment && isLocale(firstSegment) ? firstSegment : null;
      } catch {
        return null;
      }
    })();
    const locale = localeFromReferer ?? routing.defaultLocale;

    // Always respond success (anti-enumeration)
    const genericSuccess = createGenericMagicLinkSuccessResponse();

    const mallOwner = await findMallOwnerByEmail(email);

    console.log("[EMAIL-DEBUG] request-link: mallOwner lookup result", {
      email,
      found: !!mallOwner,
    });

    // If not found, just log a safe event and return generic success
    if (!mallOwner) {
      console.log(
        "[EMAIL-DEBUG] request-link: mallOwner NOT found — returning generic success (no email sent)"
      );
      logMagicLinkEvent("magic_link_requested", null, ip, userAgent, {
        reason: "not_found",
      });
      return genericSuccess;
    }

    // Optionally rate-limit (basic) using mallOwner metadata if enabled.
    // (Service updates last requested time; detailed throttling can be added later.)
    await updateMagicLinkRequestMetadata(mallOwner.id, ip);

    // Create token
    const tokenResult = await createMagicLinkToken(email);
    console.log("[EMAIL-DEBUG] request-link: token creation result", {
      success: tokenResult.success,
      error: tokenResult.success ? undefined : tokenResult.error,
    });

    if (!tokenResult.success) {
      console.log(
        "[EMAIL-DEBUG] request-link: token creation FAILED — returning generic success (no email sent)"
      );
      logMagicLinkEvent("magic_link_failed", email, ip, userAgent, {
        error: tokenResult.error,
      });
      return genericSuccess;
    }

    // Send email (fire-and-forget failure handling: we still return generic success)
    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const loginUrl = `${baseUrl}/${locale}${AUTH_CONFIG.mallOwner.verify.redirectUrl}?token=${encodeURIComponent(tokenResult.token)}`;
    console.log("[EMAIL-DEBUG] request-link: dispatching email", {
      email,
      loginUrl,
      deliveryMode: process.env.EMAIL_DELIVERY_MODE,
    });
    dispatch(() => sendMagicLinkEmail(email, loginUrl));
    logMagicLinkEvent("magic_link_sent", email, ip, userAgent);
    return genericSuccess;
  } catch (error) {
    // On validation or unexpected errors, still avoid revealing details.
    // If configured to show errors in development, use the response-builder.
    if (process.env.NODE_ENV === "development") {
      return createMagicLinkErrorResponse(
        "INTERNAL_ERROR",
        getMagicLinkMessage("internalError"),
        500,
        { details: error }
      );
    }

    return createGenericMagicLinkSuccessResponse();
  } finally {
    await ensureMinResponseTime(
      startTime,
      AUTH_CONFIG.mallOwner.minResponseTime
    );
  }
}
