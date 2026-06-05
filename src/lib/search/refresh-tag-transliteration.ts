import prisma from "@/lib/db/prisma";
import { computeTagTransliteration } from "./tag-transliteration";

export { computeTagTransliteration } from "./tag-transliteration";

/** Recompute and persist Tag.transliteration from current name_ru / name_am. */
export async function refreshTagTransliteration(tagId: string): Promise<void> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { name_ru: true, name_am: true },
  });
  if (!tag) return;

  await prisma.tag.update({
    where: { id: tagId },
    data: { transliteration: computeTagTransliteration(tag) },
  });
}
