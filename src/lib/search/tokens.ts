import { buildTransliterations } from "./transliterate";

export function buildSearchTokens(product: {
  name_en?: string | null;
  name_ru?: string | null;
  name_am?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  description_am?: string | null;
  brand?: string | null;
  productType?: string | null;
  keywords?: string[] | null;
  sku?: string | null;
}): string[] {
  const out = new Set<string>();

  const push = (v?: string | null) => {
    if (!v) return;
    for (const word of v.toLowerCase().split(/\s+/)) {
      if (word.length >= 2) out.add(word);
    }
  };

  push(product.name_en);
  push(product.name_ru);
  push(product.name_am);
  push(product.brand);
  push(product.productType);
  push(product.sku);
  for (const k of product.keywords ?? []) push(k);

  for (const t of buildTransliterations([
    product.name_ru,
    product.name_am,
    product.description_ru,
    product.description_am,
  ])) {
    push(t);
  }

  return [...out];
}

/** Space-joined tokens for indexed prefix/trigram search (avoids per-row unnest). */
export function buildSearchText(tokens: string[]): string {
  return tokens.join(" ");
}

export function buildSearchIndex(product: Parameters<typeof buildSearchTokens>[0]): {
  searchTokens: string[];
  searchText: string;
} {
  const searchTokens = buildSearchTokens(product);
  return { searchTokens, searchText: buildSearchText(searchTokens) };
}
