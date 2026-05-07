// src/app/api/v1/auth/check-email/response-builder.ts

import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type {
  AccountType,
  AccountInfo,
  AccountLookupResult,
  EmailExistsResponse,
  EmailNotExistsResponse,
  EmailCheckMinimalResponse,
} from "@/types/auth";

const config = AUTH_CONFIG.emailCheck;

type EmailCheckSuccessResponse =
  | EmailExistsResponse
  | EmailNotExistsResponse
  | EmailCheckMinimalResponse;

/**
 * Build email check success response based on configuration
 */
export function buildEmailCheckResponse(
  email: string,
  lookupResult: AccountLookupResult
): NextResponse<EmailCheckSuccessResponse> {
  // Minimal response mode (for high-security environments)
  if (!config.revealAccountDetails) {
    return NextResponse.json({
      success: true,
      data: {
        exists: lookupResult.found,
        email,
      },
    });
  }

  // Email not found
  if (!lookupResult.found) {
    return NextResponse.json({
      success: true,
      data: {
        exists: false,
        email,
      },
    });
  }

  // Email found - check what details to reveal
  if (!config.revealAccountType) {
    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        email,
        account: {
          type: "ACCOUNT" as AccountType,
        } as AccountInfo,
      },
    });
  }

  if (!config.revealAccountStatus) {
    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        email,
        account: { type: lookupResult.info!.type } as AccountInfo,
      },
    });
  }

  // Full response
  return NextResponse.json({
    success: true,
    data: {
      exists: true,
      email,
      account: lookupResult.info!,
    },
  });
}
