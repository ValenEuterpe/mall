import prisma from "@/lib/db/prisma";

export async function getCategoryMap(): Promise<Map<string, string>> {
  const categories = await prisma.category.findMany({
    select: { id: true, key: true, name_en: true, name_ru: true },
  });

  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.key.toLowerCase(), cat.id);
    map.set(cat.name_en.toLowerCase(), cat.id);
    map.set(cat.name_ru.toLowerCase(), cat.id);
  }

  return map;
}
