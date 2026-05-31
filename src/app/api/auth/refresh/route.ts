// src/app/api/auth/refresh/route.ts
//
// Redirect-style refresh endpoint used by edge middleware. When the access
// token is expired but a refresh cookie exists, middleware sends the user
// here. We perform the DB-backed refresh in Node runtime, set new cookies,
// and 307 back to the originally requested URL via `callbackUrl`.

import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/services/auth/refresh-session.service";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from "@/lib/auth/cookies";
import { AUTH_CONFIG } from "@/lib/config/auth.config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieNames = AUTH_CONFIG.cookies.names;

/**
 * Validate `callbackUrl` is same-origin. Anything else (cross-origin,
 * protocol-relative, malformed) is rejected and we fall back to "/".
 */
function safeCallbackUrl(
  rawCallback: string | null,
  requestUrl: string
): string {
  if (!rawCallback) return "/";
  try {
    const candidate = new URL(rawCallback, requestUrl);
    const origin = new URL(requestUrl).origin;
    if (candidate.origin !== origin) return "/";
    return `${candidate.pathname}${candidate.search}`;
  } catch {
    return "/";
  }
}

function loginRedirect(
  request: NextRequest,
  callbackUrl: string
): NextResponse {
  const loginUrl = new URL(AUTH_CONFIG.routes.loginPath, request.url);
  if (callbackUrl && callbackUrl !== "/") {
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
  }
  const response = NextResponse.redirect(loginUrl);
  const clearOptions = getClearCookieOptions();
  response.cookies.set(cookieNames.accessToken, "", clearOptions);
  response.cookies.set(cookieNames.refreshToken, "", clearOptions);
  return response;
}

export async function GET(request: NextRequest) {
  const callbackUrl = safeCallbackUrl(
    request.nextUrl.searchParams.get("callbackUrl"),
    request.url
  );

  const refreshToken = request.cookies.get(cookieNames.refreshToken)?.value;

  if (!refreshToken) {
    return loginRedirect(request, callbackUrl);
  }

  let result;
  try {
    result = await refreshSession(refreshToken);
  } catch (error) {
    console.error("Token refresh error:", error);
    return loginRedirect(request, callbackUrl);
  }

  if (!result.success) {
    return loginRedirect(request, callbackUrl);
  }

  const target = new URL(callbackUrl, request.url);
  const response = NextResponse.redirect(target);

  response.cookies.set(
    cookieNames.accessToken,
    result.accessToken,
    getAccessTokenCookieOptions()
  );
  if (result.refreshToken) {
    response.cookies.set(
      cookieNames.refreshToken,
      result.refreshToken,
      getRefreshTokenCookieOptions()
    );
  }

  return response;
}
