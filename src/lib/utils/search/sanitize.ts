import { SEARCH_DEFAULTS, UNSAFE_SEARCH_PATTERN } from "./constants";

export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  return query
    .trim()
    .replace(UNSAFE_SEARCH_PATTERN, "")
    .slice(0, SEARCH_DEFAULTS.MAX_LENGTH);
}
