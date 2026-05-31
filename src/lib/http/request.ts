// src/lib/http/request.ts
import { NextRequest } from "next/server";

/**
 * Extracts the most accurate client IP address from request headers.
 * Supports standard proxies, X-Real-IP, and Cloudflare.
 */
export function getClientIp(request: NextRequest): string {
  // 1. Check Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // 2. Check X-Forwarded-For (standard for most load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // 3. Check X-Real-IP (Nginx/Apache proxy)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get("user-agent") ?? undefined;
}
