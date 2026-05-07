// src/lib/auth/tokens-edge.ts
// Edge-runtime JWT verification using `jose` (Web Crypto). The Node-runtime
// counterpart in @/lib/auth/tokens uses `jsonwebtoken` and stays the source
// of truth for token *generation* and Node-side verification.

import { jwtVerify } from "jose";
import { env } from "@/env";
import { AUTH_CONFIG } from "@/lib/config/auth.config";
import type { AccessTokenPayload } from "@/types/auth";

const jwtConfig = AUTH_CONFIG.jwt;

let cachedAccessSecret: Uint8Array | undefined;

function getAccessSecret(): Uint8Array {
  if (!cachedAccessSecret) {
    cachedAccessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }
  return cachedAccessSecret;
}

export async function verifyAccessTokenEdge(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.accessAudience,
    });
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}
