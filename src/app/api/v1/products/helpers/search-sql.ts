import { isValidId } from "./ids";

export const MIN_LEN_FOR_TRIGRAM = 4;

export function shouldUseTrigram(query: string): boolean {
  return query.trim().toLowerCase().length >= MIN_LEN_FOR_TRIGRAM;
}

/** Placeholder indices for raw search SQL ($1 = tokens, optional $q, $prefix, then filters). */
export type SearchSqlPlaceholders = {
  token: string;
  q: string | null;
  prefix: string;
  filterStartIdx: number;
};

export function getSearchSqlPlaceholders(useTrigram: boolean): SearchSqlPlaceholders {
  if (useTrigram) {
    return { token: "$1", q: "$2", prefix: "$3", filterStartIdx: 4 };
  }
  // Short queries skip the trigram query string — do not bind an unused $2.
  return { token: "$1", q: null, prefix: "$2", filterStartIdx: 3 };
}

/** Values bound before filter params: [tokenizedQ, (q?), prefix]. */
export function buildSearchBaseParams(
  tokenizedQ: string[],
  q: string,
  prefix: string,
  useTrigram: boolean
): unknown[] {
  return useTrigram ? [tokenizedQ, q, prefix] : [tokenizedQ, prefix];
}

/** LEFT JOINs for category/subcategory name matching in text search. */
export function buildSearchJoinSql(): string {
  return `
         LEFT JOIN categories c ON c.id = p."categoryId"
         LEFT JOIN subcategories sc ON sc.id = p."subcategoryId"`;
}

export function buildFilterSqlAndParams(
  filters: {
    categoryId?: string;
    subcategoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    brand?: string;
    tagIds?: string;
  },
  startIdx: number = 1
): { sql: string; params: unknown[] } {
  const parts: string[] = [`p.status = 'PUBLISHED'`, `p."isActive" = true`];
  const params: unknown[] = [];
  let idx = startIdx;

  const ph = () => `$${idx++}`;

  if (filters.categoryId) {
    parts.push(`p."categoryId" = ${ph()}`);
    params.push(filters.categoryId);
  }
  if (filters.subcategoryId) {
    parts.push(`p."subcategoryId" = ${ph()}`);
    params.push(filters.subcategoryId);
  }
  if (filters.brand) {
    parts.push(`p.brand = ${ph()}`);
    params.push(filters.brand);
  }
  const minP = filters.minPrice !== undefined ? Number(filters.minPrice) : NaN;
  if (Number.isFinite(minP)) {
    parts.push(`p."basePrice" >= ${ph()}`);
    params.push(minP);
  }
  const maxP = filters.maxPrice !== undefined ? Number(filters.maxPrice) : NaN;
  if (Number.isFinite(maxP)) {
    parts.push(`p."basePrice" <= ${ph()}`);
    params.push(maxP);
  }
  if (filters.inStock === "true") {
    parts.push(`p."stockQuantity" > 0`);
  } else if (filters.inStock === "false") {
    parts.push(`p."stockQuantity" = 0`);
  }
  if (filters.tagIds) {
    const tagIdArray = filters.tagIds.split(",").filter((id) => isValidId(id));
    if (tagIdArray.length > 0) {
      parts.push(
        `EXISTS (SELECT 1 FROM "product_tags" pt WHERE pt."productId" = p.id AND pt."tagId" = ANY(${ph()}))`
      );
      params.push(tagIdArray);
    }
  }

  return { sql: parts.join(" AND "), params };
}

function categoryPrefixMatch(prefixPh: string): string {
  return `
                OR c.name_en ILIKE ${prefixPh}
                OR c.name_ru ILIKE ${prefixPh}
                OR c.name_am ILIKE ${prefixPh}
                OR sc.name_en ILIKE ${prefixPh}
                OR sc.name_ru ILIKE ${prefixPh}
                OR sc.name_am ILIKE ${prefixPh}`;
}

function categoryTrigramMatch(qPh: string): string {
  return `
                OR c.name_en % ${qPh}
                OR c.name_ru % ${qPh}
                OR c.name_am % ${qPh}
                OR sc.name_en % ${qPh}
                OR sc.name_ru % ${qPh}
                OR sc.name_am % ${qPh}`;
}

export function buildSearchMatchSql(ph: SearchSqlPlaceholders): string {
  const trigramNameMatch =
    ph.q !== null
      ? `
                OR p.name_en % ${ph.q}
                OR p.name_ru % ${ph.q}
                OR p.name_am % ${ph.q}
                OR p."searchText" % ${ph.q}
                ${categoryTrigramMatch(ph.q)}
                OR EXISTS (
                    SELECT 1 FROM "product_tags" pt
                    JOIN "tags" t ON t.id = pt."tagId"
                    WHERE pt."productId" = p.id
                      AND (t.name_en % ${ph.q} OR t.name_ru % ${ph.q} OR t.name_am % ${ph.q} OR t.transliteration % ${ph.q})
                )`
      : "";

  return `
                p."searchTokens" && ${ph.token}::text[]
                OR p.name_en ILIKE ${ph.prefix}
                OR p.name_ru ILIKE ${ph.prefix}
                OR p.name_am ILIKE ${ph.prefix}
                OR p."searchText" ILIKE ${ph.prefix}
                ${categoryPrefixMatch(ph.prefix)}${trigramNameMatch}
            `;
}

function categoryPrefixScore(prefixPh: string): string {
  return `
                                CASE WHEN c.name_en ILIKE ${prefixPh} THEN 1 ELSE 0 END,
                                CASE WHEN c.name_ru ILIKE ${prefixPh} THEN 1 ELSE 0 END,
                                CASE WHEN c.name_am ILIKE ${prefixPh} THEN 1 ELSE 0 END,
                                CASE WHEN sc.name_en ILIKE ${prefixPh} THEN 1 ELSE 0 END,
                                CASE WHEN sc.name_ru ILIKE ${prefixPh} THEN 1 ELSE 0 END,
                                CASE WHEN sc.name_am ILIKE ${prefixPh} THEN 1 ELSE 0 END`;
}

function categoryTrigramScore(qPh: string): string {
  return `
                              similarity(COALESCE(c.name_en, ''), ${qPh}),
                              similarity(COALESCE(c.name_ru, ''), ${qPh}),
                              similarity(COALESCE(c.name_am, ''), ${qPh}),
                              similarity(COALESCE(sc.name_en, ''), ${qPh}),
                              similarity(COALESCE(sc.name_ru, ''), ${qPh}),
                              similarity(COALESCE(sc.name_am, ''), ${qPh})`;
}

export function buildSearchScoreSql(ph: SearchSqlPlaceholders): string {
  const trigramScoreTerms =
    ph.q !== null
      ? `,
                              similarity(p.name_en, ${ph.q}),
                              similarity(p.name_ru, ${ph.q}),
                              similarity(p.name_am, ${ph.q}),
                              similarity(COALESCE(p."searchText", ''), ${ph.q}),
                              ${categoryTrigramScore(ph.q)},
                              COALESCE((
                                SELECT MAX(similarity(t.transliteration, ${ph.q}))
                                FROM "product_tags" pt
                                JOIN "tags" t ON t.id = pt."tagId"
                                WHERE pt."productId" = p.id
                              ), 0)`
      : "";

  return `
                              GREATEST(
                                CASE WHEN p.name_en ILIKE ${ph.prefix} THEN 1 ELSE 0 END,
                                CASE WHEN p.name_ru ILIKE ${ph.prefix} THEN 1 ELSE 0 END,
                                CASE WHEN p.name_am ILIKE ${ph.prefix} THEN 1 ELSE 0 END,
                                CASE WHEN p."searchText" ILIKE ${ph.prefix} THEN 1 ELSE 0 END,
                                ${categoryPrefixScore(ph.prefix)}${trigramScoreTerms}
                              )
                              + CASE WHEN p."stockQuantity" > 0 THEN 0.5 ELSE 0 END
                              + CASE WHEN p."isFeatured" THEN 0.3 ELSE 0 END
                            `;
}
