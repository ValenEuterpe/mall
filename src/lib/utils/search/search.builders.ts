import { Prisma } from "@/prisma/generated/client";
import { SearchOptions } from "./types";
import { SEARCH_DEFAULTS } from "./constants";
import { sanitizeSearchQuery } from "./sanitize";
import { InsensitiveStringFilter, OrSearchCondition } from "./types";

export function buildSearchCondition<TFields extends string>(
  query: string,
  fields: readonly TFields[],
  options: SearchOptions = {}
): OrSearchCondition<TFields> | undefined {
  const {
    minLength = SEARCH_DEFAULTS.MIN_LENGTH,
    maxLength = SEARCH_DEFAULTS.MAX_LENGTH,
    startsWith = false,
  } = options;

  const sanitizedQuery = sanitizeSearchQuery(query);

  if (
    !sanitizedQuery ||
    sanitizedQuery.length < minLength ||
    sanitizedQuery.length > maxLength
  ) {
    return undefined;
  }

  const validFields = fields.filter((field): field is TFields =>
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)
  );

  if (validFields.length === 0) {
    return undefined;
  }

  const filterValue: InsensitiveStringFilter = startsWith
    ? { startsWith: sanitizedQuery, mode: "insensitive" as const }
    : { contains: sanitizedQuery, mode: "insensitive" as const };

  return {
    OR: validFields.map(
      (field) =>
        ({
          [field]: filterValue,
        }) as Partial<Record<TFields, InsensitiveStringFilter>>
    ),
  };
}

/**
 * Builds a PostgreSQL full-text search condition using a tsvector column.
 * Intended for use with Prisma.sql in raw queries.
 */
export function buildFullTextSearchCondition(
  query: string,
  searchField = "searchVector"
): Prisma.Sql | null {
  const sanitizedQuery = sanitizeSearchQuery(query);

  if (!sanitizedQuery) {
    return null;
  }

  const tsQuery = sanitizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}:*`)
    .join(" & ");

  return Prisma.sql`${Prisma.raw(searchField)} @@ to_tsquery('english', ${tsQuery})`;
}

/**
 * Prefix-only search helper (startsWith).
 * Kept separate for clarity and explicit intent.
 */
export function buildPrefixSearchCondition<TFields extends string>(
  query: string,
  fields: readonly TFields[]
): OrSearchCondition<TFields> | undefined {
  const sanitizedQuery = sanitizeSearchQuery(query);

  if (!sanitizedQuery || sanitizedQuery.length < 1) {
    return undefined;
  }

  const validFields = fields.filter((field): field is TFields =>
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)
  );

  if (validFields.length === 0) {
    return undefined;
  }

  const filterValue: InsensitiveStringFilter = {
    startsWith: sanitizedQuery,
    mode: "insensitive" as const,
  };

  return {
    OR: validFields.map(
      (field) =>
        ({
          [field]: filterValue,
        }) as Partial<Record<TFields, InsensitiveStringFilter>>
    ),
  };
}
