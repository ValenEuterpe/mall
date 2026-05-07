import { NextRequest, NextResponse } from "next/server";

import { requireAuth, AuthError } from "@/lib/api/auth-helper";
import { createSuccessResponse, methodNotAllowed } from "@/app/response";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);

    // `user` comes from the access token payload; keep response minimal.
    return createSuccessResponse({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return error.toResponse();
    }

    console.error("Unexpected error in /api/v1/auth/me:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}

export const POST = () => methodNotAllowed(["GET"]);
