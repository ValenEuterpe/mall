import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

type SupportedLocale = (typeof routing.locales)[number];

async function loadMessages(
  locale: SupportedLocale
): Promise<Record<string, any>> {
  // Dynamic import keeps bundles split per locale.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (await import(`../messages/${locale}.json`)).default as Record<
    string,
    any
  >;
}

/**
 * next-intl request configuration.
 *
 * This is required by `next-intl/plugin()` during `next build`.
 *
 * Current behavior:
 * - Loads message bundles from `src/messages/{locale}.json`
 * - Falls back to `routing.defaultLocale` if locale is unsupported or missing
 */
export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale: SupportedLocale = routing.locales.includes(
    locale as SupportedLocale
  )
    ? (locale as SupportedLocale)
    : routing.defaultLocale;

  let messages: Record<string, any>;

  try {
    messages = await loadMessages(resolvedLocale);
  } catch (error) {
    console.error(
      `Failed to load messages for locale ${resolvedLocale}:`,
      error
    );
    // Hard fallback to default locale bundle if a specific locale bundle fails to load.
    messages = await loadMessages(routing.defaultLocale);
  }

  return {
    locale: resolvedLocale,
    messages,
  };
});
