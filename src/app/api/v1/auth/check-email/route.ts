import { NextRequest } from "next/server";
import { Prisma } from "@/prisma/generated/client";

import { AUTH_CONFIG } from "@/lib/config/auth.config";
import { normalizeEmail } from "@/lib/utils/email";
import { getClientIp } from "@/lib/http/request";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { validateBody } from "@/lib/validation/request";

import { emailObjectSchema } from "@/lib/validation/schemas/common";
import { findAccountByEmail, logEmailCheck } from "@/services";

import { buildEmailCheckResponse } from "./response-builder";

/**
 * POST /api/v1/auth/check-email
 *
 * Checks whether an email exists across account tables.
 * Response is configurable to avoid account enumeration (see AUTH_CONFIG.emailCheck).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const data = await validateBody(request, emailObjectSchema);
    const email = normalizeEmail(data.email);
    const ip = getClientIp(request);

    const lookupResult = await findAccountByEmail(email);

    // Log (dev-only currently)
    logEmailCheck(email, ip, lookupResult.found, lookupResult.type);

    return buildEmailCheckResponse(email, lookupResult);
  } catch (error) {
    // If this is a known Prisma error, normalize it to a safe response
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return buildEmailCheckResponse("", { found: false, type: null, info: null });
    }

    // Fail closed: do not reveal details
    return buildEmailCheckResponse("", { found: false, type: null, info: null });
  } finally {
    await ensureMinResponseTime(startTime, AUTH_CONFIG.emailCheck.minResponseTime);
  }
}
