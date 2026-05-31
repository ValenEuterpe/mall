export interface SortParams {
  field: string;
  order: "asc" | "desc";
}

export interface SearchOptions {
  minLength?: number;
  maxLength?: number;
  startsWith?: boolean;
  fuzzy?: boolean;
}

export interface FilterConfig {
  field: string;
  type: "exact" | "contains" | "number" | "boolean" | "date" | "array";
  transform?: (value: string) => unknown;
}

export type FilterDefinition = Record<string, FilterConfig>;

export type InsensitiveStringFilter =
  | { contains: string; mode: "insensitive" }
  | { startsWith: string; mode: "insensitive" };

export type OrSearchCondition<TFields extends string> = {
  OR: Array<Partial<Record<TFields, InsensitiveStringFilter>>>;
};
