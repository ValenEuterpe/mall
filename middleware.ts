// middleware.ts (root of project)
//
// Edge-runtime middleware. Stays free of Prisma/Node-only modules so the
// bundle fits Vercel's ~1 MB compressed limit. Token refresh is delegated to
// the Node-runtime route /api/auth/refresh.

import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { processAuth, addUserContextHeaders } from "./src/lib/middleware/auth";

const intlMiddleware = createMiddleware(routing);

const SKIP_PATTERNS = [
  /^\/api\//,
  /^\/_next\//,
  /\.(ico|png|jpg|jpeg|gif|svg|webp|mp4|webm|mp3|wav|pdf|doc|docx|xls|xlsx|zip|rar)$/i,
  /^\/uploads\//,
  /^\/images\//,
  /^\/fonts\//,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/manifest\.json$/,
  /^\/browserconfig\.xml$/,
  /^\/favicon/,
];

function shouldSkipMiddleware(pathname: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  const authResult = await processAuth(request);

  if (authResult.shouldRedirect && authResult.redirectUrl) {
    return NextResponse.redirect(authResult.redirectUrl);
  }

  const response = intlMiddleware(request);

  if (authResult.user) {
    addUserContextHeaders(response, authResult.user);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all request paths except api, _next assets, favicon, and any
    // file-extension URL.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
