export type SupportedLocale = "en" | "ru" | "am";

export const SUPPORTED_LOCALES = new Set<SupportedLocale>(["en", "ru", "am"]);

export const DEFAULT_LOCALE: SupportedLocale = "en";

export function parseLocale(value: string | null): SupportedLocale {
  if (value && SUPPORTED_LOCALES.has(value as SupportedLocale)) {
    return value as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolves a localized string with a fallback chain. Use when a missing
 * translation should silently fall back to any other available value
 * (target → en → ru → am → legacy).
 */
export function getLocalizedText(
  locale: SupportedLocale,
  values: {
    legacy: string | null;
    en: string | null;
    ru: string | null;
    am: string | null;
  }
): string | null {
  if (locale === "ru") {
    return values.ru ?? values.en ?? values.am ?? values.legacy;
  }
  if (locale === "am") {
    return values.am ?? values.en ?? values.ru ?? values.legacy;
  }
  return values.en ?? values.ru ?? values.am ?? values.legacy;
}

/**
 * Strict-locale variant used by categories where en/ru are always populated
 * and only am may be null.
 */
export function getLocalizedName(
  nameEn: string,
  nameRu: string,
  nameAm: string | null,
  locale: SupportedLocale
): string {
  if (locale === "ru") return nameRu;
  if (locale === "am") return nameAm || nameEn;
  return nameEn;
}
