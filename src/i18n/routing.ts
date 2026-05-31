// src/i18n/routing.ts
// next-intl routing configuration used by the root middleware.
//
// This module also provides locale-aware navigation helpers for the UI.
//
// IMPORTANT:
// - `routing` is used by `middleware.ts` (next-intl/middleware)
// - `Link`, `useRouter`, `usePathname` are created via `next-intl/navigation`

import { createNavigation } from "next-intl/navigation";

export const routing = {
  locales: ["en", "ru", "am"],
  defaultLocale: "en",

  // Ensure the locale is always visible in the URL (/en, /ru, /am).
  // This also makes language switching reliably change the locale segment.
  localePrefix: "always",
} as const;

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

/**
 * Locale-aware navigation exports.
 *
 * When we later introduce a `pathnames` map (localized URLs), switch to the
 * appropriate next-intl navigation factory for pathnames.
 */
export const { Link, usePathname, useRouter, redirect, permanentRedirect } =
  createNavigation({
    locales: routing.locales,
    defaultLocale: routing.defaultLocale,
    localePrefix: routing.localePrefix,
  });
