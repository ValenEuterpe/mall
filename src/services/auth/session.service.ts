import { cookies } from "next/headers";

//Cookie configuration for authentication tokens
export const COOKIE_CONFIG = {
  accessToken: {
    name: "access_token",
    maxAge: 15 * 60, // 15 minutes
  },
  refreshToken: {
    name: "refresh_token",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
} as const;

//Set authentication cookies
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_CONFIG.accessToken.name, accessToken, {
    ...COOKIE_CONFIG.options,
    maxAge: COOKIE_CONFIG.accessToken.maxAge,
  });

  cookieStore.set(COOKIE_CONFIG.refreshToken.name, refreshToken, {
    ...COOKIE_CONFIG.options,
    maxAge: COOKIE_CONFIG.refreshToken.maxAge,
  });
}
