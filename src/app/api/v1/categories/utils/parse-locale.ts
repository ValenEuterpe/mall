import { SupportedLocale } from "../types";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "../constants";

export function parseLocale(value: string | null): SupportedLocale {
    if (value && SUPPORTED_LOCALES.has(value as SupportedLocale)) {
        return value as SupportedLocale;
    }
    return DEFAULT_LOCALE;
}