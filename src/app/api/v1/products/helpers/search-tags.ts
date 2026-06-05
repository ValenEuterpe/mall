import prisma from "@/lib/db/prisma";

export const MAX_SYNONYM_HOPS = 3;

/** Expand tagIds across canonical synonym chains (up to MAX_SYNONYM_HOPS). */
export async function expandTagIdsWithSynonyms(
  tagIdsCsv: string | undefined
): Promise<string | undefined> {
  if (!tagIdsCsv) return tagIdsCsv;

  const requested = tagIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) return tagIdsCsv;

  const expanded = new Set<string>(requested);
  let frontier: string[] = requested;

  for (let hop = 0; hop < MAX_SYNONYM_HOPS && frontier.length > 0; hop++) {
    const synonymRows = await prisma.tag.findMany({
      where: {
        OR: [{ canonicalTagId: { in: frontier } }, { id: { in: frontier } }],
      },
      select: { id: true, canonicalTagId: true },
    });

    const nextFrontier: string[] = [];
    for (const row of synonymRows) {
      if (!expanded.has(row.id)) {
        expanded.add(row.id);
        nextFrontier.push(row.id);
      }
      if (row.canonicalTagId && !expanded.has(row.canonicalTagId)) {
        expanded.add(row.canonicalTagId);
        nextFrontier.push(row.canonicalTagId);
      }
    }
    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
  }

  return [...expanded].join(",");
}
