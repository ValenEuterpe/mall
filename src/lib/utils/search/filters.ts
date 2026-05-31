import { FilterConfig, FilterDefinition } from "./types";
import { sanitizeSearchQuery } from "./sanitize";

export function parseFilters<T extends Record<string, unknown>>(
  searchParams: URLSearchParams,
  filterDefinition: FilterDefinition
): Partial<T> {
  const filters: Record<string, unknown> = {};

  for (const [paramName, config] of Object.entries(filterDefinition)) {
    const value = searchParams.get(paramName);

    if (value === null || value === "") continue;

    try {
      const parsedValue = parseFilterValue(value, config);
      if (parsedValue !== undefined) {
        filters[config.field] = parsedValue;
      }
    } catch {
      continue;
    }
  }

  return filters as Partial<T>;
}

function parseFilterValue(
  value: string,
  config: FilterConfig
): unknown | undefined {
  if (config.transform) {
    return config.transform(value);
  }

  switch (config.type) {
    case "exact":
      return value;
    case "contains":
      return {
        contains: sanitizeSearchQuery(value),
        mode: "insensitive" as const,
      };
    case "number": {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    case "boolean":
      return value === "true" || value === "1";
    case "date": {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    case "array":
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    default:
      return value;
  }
}

export function buildPriceRangeFilter(
  minPrice?: string | number | null,
  maxPrice?: string | number | null,
  field: string = "basePrice"
): Record<string, { gte?: number; lte?: number }> | Record<string, never> {
  const min = typeof minPrice === "string" ? parseFloat(minPrice) : minPrice;
  const max = typeof maxPrice === "string" ? parseFloat(maxPrice) : maxPrice;

  const hasMin = min !== null && min !== undefined && !isNaN(min) && min >= 0;
  const hasMax = max !== null && max !== undefined && !isNaN(max) && max >= 0;

  if (!hasMin && !hasMax) return {};

  const condition: { gte?: number; lte?: number } = {};

  if (hasMin) condition.gte = min;
  if (hasMax) condition.lte = max;

  return { [field]: condition };
}

export function buildDateRangeFilter(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  field: string = "createdAt"
): Record<string, { gte?: Date; lte?: Date }> | Record<string, never> {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const hasStart = start && !isNaN(start.getTime());
  const hasEnd = end && !isNaN(end.getTime());

  if (!hasStart && !hasEnd) return {};

  const condition: { gte?: Date; lte?: Date } = {};

  if (hasStart) condition.gte = start!;
  if (hasEnd) {
    end!.setHours(23, 59, 59, 999);
    condition.lte = end!;
  }

  return { [field]: condition };
}

export function combineFilters<T extends Record<string, unknown>>(
  ...conditions: Array<T | Record<string, never>>
): T {
  return conditions.reduce((acc, condition) => {
    if (Object.keys(condition).length > 0) {
      return { ...acc, ...condition };
    }
    return acc;
  }, {} as T) as T;
}
