// src/lib/auth/cookies.ts
// Edge-safe cookie option helpers. Pure functions over AUTH_CONFIG — no DB,
// no Node-only modules — so middleware can import these without dragging
// Prisma into the edge bundle.

import { AUTH_CONFIG } from "@/lib/config/auth.config";

const cookieConfig = AUTH_CONFIG.cookies;

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
};

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    ...cookieConfig.base,
    maxAge: 60 * 60, // 1 hour (increased from 15 min)
  };
}

export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    ...cookieConfig.base,
    maxAge: 30 * 24 * 60 * 60, // 30 days (increased from 7 days)
  };
}

export function getClearCookieOptions(): CookieOptions {
  return cookieConfig.clear;
}
