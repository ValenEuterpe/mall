import { Prisma } from "@/prisma/generated/client";

export const CATEGORY_SELECT = {
  id: true,
  key: true,
  name_en: true,
  name_ru: true,
  name_am: true,
  icon: true,
  subcategories: {
    select: {
      id: true,
      key: true,
      name_en: true,
      name_ru: true,
      name_am: true,
      _count: {
        select: {
          products: {
            where: {
              status: "PUBLISHED",
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { key: "asc" as const },
  },
  _count: {
    select: {
      products: {
        where: {
          status: "PUBLISHED",
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.CategorySelect;
