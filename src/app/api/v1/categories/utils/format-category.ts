import { Prisma } from "@/prisma/generated/client";

import type { FormattedCategory, SupportedLocale } from "../types";
import { CATEGORY_SELECT } from "../selects";
import { getLocalizedName } from "./get-localized-name";

export function formatCategory(
  category: Prisma.CategoryGetPayload<{ select: typeof CATEGORY_SELECT }>,
  locale: SupportedLocale,
  includeEmpty: boolean
): FormattedCategory | null {
  let subcategories = category.subcategories.map((sub) => ({
    id: sub.id,
    key: sub.key,
    name: getLocalizedName(sub.name_en, sub.name_ru, sub.name_am, locale),
    productCount: sub._count.products,
  }));

  if (!includeEmpty) {
    subcategories = subcategories.filter((sub) => sub.productCount > 0);
  }

  const totalProductCount =
    category._count.products +
    subcategories.reduce((sum, sub) => sum + sub.productCount, 0);

  if (!includeEmpty && totalProductCount === 0) {
    return null;
  }

  return {
    id: category.id,
    key: category.key,
    name: getLocalizedName(
      category.name_en,
      category.name_ru,
      category.name_am,
      locale
    ),
    icon: category.icon,
    productCount: category._count.products,
    subcategories,
  };
}
