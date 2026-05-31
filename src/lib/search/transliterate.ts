import transliterate from "@sindresorhus/transliterate";

/**
 * Produce Latin search variants for non-Latin text. Returns [] for already-Latin input.
 */
export function buildTransliterations(
  values: (string | null | undefined)[]
): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const t = transliterate(v).toLowerCase().trim();
    if (t && t !== v.toLowerCase()) {
      out.add(t);
    }
  }
  return [...out];
}
