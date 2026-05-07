import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/api/auth-helper";
import { successResponse } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { ensureMinResponseTime } from "@/lib/security/timing";
import { withCsrfProtection } from "@/lib/security/csrf";
import { methodNotAllowed } from "@/app/response";
import prisma from "@/lib/db/prisma";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import {
  checkMallOwnerLockStatus,
  handleMallOwnerFailedAttempt,
} from "@/services";

const MIN_WAIT = 500;

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/verify-password
 *
 * Verifies the current mall owner's password.
 * Used for confirming destructive actions.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  const csrfError = await withCsrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const user = requireAuth(request, ["MALL_OWNER"]);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      await ensureMinResponseTime(startTime, MIN_WAIT);
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const result = verifyPasswordSchema.safeParse(body);
    if (!result.success) {
      await ensureMinResponseTime(startTime, MIN_WAIT);
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Password is required" } },
        { status: 400 }
      );
    }

    const mallOwner = await prisma.mallOwner.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        password: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!mallOwner) {
      await ensureMinResponseTime(startTime, MIN_WAIT);
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Verification failed" } },
        { status: 401 }
      );
    }

    const lockStatus = checkMallOwnerLockStatus(mallOwner);
    if (lockStatus) {
      await ensureMinResponseTime(startTime, MIN_WAIT);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Account has been locked due to too many failed attempts. Please try again later.",
          },
          retryAfter: lockStatus.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(lockStatus.retryAfterSeconds) },
        }
      );
    }

    const isValid = await verifyPassword(result.data.password, mallOwner.password);

    if (!isValid) {
      const { shouldLock } = await handleMallOwnerFailedAttempt(mallOwner);
      await ensureMinResponseTime(startTime, MIN_WAIT);
      if (shouldLock) {
        const retryAfter = AUTH_CONFIG.login.lockoutDurationMinutes * 60;
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Account has been locked due to too many failed attempts. Please try again later.",
            },
            retryAfter,
          },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          }
        );
      }
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Incorrect password" } },
        { status: 401 }
      );
    }

    if (mallOwner.failedLoginAttempts > 0 || mallOwner.lockedUntil) {
      await prisma.mallOwner.update({
        where: { id: mallOwner.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    await ensureMinResponseTime(startTime, MIN_WAIT);
    return successResponse({ verified: true });
  } catch (error) {
    await ensureMinResponseTime(startTime, MIN_WAIT);
    // Re-throw auth errors so the middleware handles them
    throw error;
  }
}

export const GET = (): NextResponse => methodNotAllowed(["POST"]);
export const PUT = (): NextResponse => methodNotAllowed(["POST"]);
export const DELETE = (): NextResponse => methodNotAllowed(["POST"]);
export const PATCH = (): NextResponse => methodNotAllowed(["POST"]);
