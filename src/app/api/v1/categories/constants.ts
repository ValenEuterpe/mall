import { SupportedLocale } from "./types";

/** Supported locales */
export const SUPPORTED_LOCALES = new Set<SupportedLocale>(["en", "ru", "am"]);

/** Default locale */
export const DEFAULT_LOCALE: SupportedLocale = "en";

/** Cache duration in seconds */
export const CACHE_MAX_AGE = 300; // 5 minutes
export const CACHE_STALE_WHILE_REVALIDATE = 60;
