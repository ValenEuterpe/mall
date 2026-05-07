import { SupportedLocale } from "../types";

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
