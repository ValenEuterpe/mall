import { NextResponse } from "next/server";
import { handleGetCsrfToken } from "@/lib/security/csrf";
import { methodNotAllowed } from "@/app/response";

/**
 * GET /api/v1/csrf
 *
 * Issues a CSRF token. The cookie (httpOnly, SameSite=Strict) holds one half;
 * the body returns the same token so the client can echo it via x-csrf-token
 * on subsequent unsafe requests (double-submit pattern).
 */
export async function GET(): Promise<NextResponse> {
  return handleGetCsrfToken();
}

export const POST = (): NextResponse => methodNotAllowed(["GET"]);
export const PUT = (): NextResponse => methodNotAllowed(["GET"]);
export const DELETE = (): NextResponse => methodNotAllowed(["GET"]);
export const PATCH = (): NextResponse => methodNotAllowed(["GET"]);
