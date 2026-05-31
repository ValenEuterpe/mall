/**
 * One-shot backfill for Tag.transliteration after the seller_tag_creation migration.
 * Idempotent: only updates rows where transliteration IS NULL.
 *
 * Run:  npx tsx prisma/backfill-tag-transliteration.ts
 */
import { PrismaClient } from "./generated/client";
import { buildTransliterations } from "../src/lib/search/transliterate";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.tag.findMany({
    where: { transliteration: null },
    select: { id: true, name_ru: true, name_am: true },
  });

  console.log(`Backfilling transliteration for ${rows.length} tag(s)...`);

  let updated = 0;
  for (const tag of rows) {
    const transliteration =
      buildTransliterations([tag.name_ru, tag.name_am]).join(" ") || null;
    await prisma.tag.update({
      where: { id: tag.id },
      data: { transliteration },
    });
    updated++;
  }

  console.log(`Done. Updated ${updated} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
