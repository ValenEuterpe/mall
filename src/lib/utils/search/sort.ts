import { SortParams } from "./types";
import { SORT_DEFAULTS } from "./constants";


export function parseSortQuery(
    searchParams: URLSearchParams,
    allowedFields: readonly string[],
    defaults?: Partial<SortParams>
): SortParams {
    const sortBy = searchParams.get("sortBy") ?? searchParams.get("sort");
    const sortOrder = searchParams.get("sortOrder") ?? searchParams.get("order");


    const defaultField = defaults?.field ?? SORT_DEFAULTS.FIELD;
    const defaultOrder = defaults?.order ?? SORT_DEFAULTS.ORDER;


    const validField = sortBy && allowedFields.includes(sortBy) ? sortBy : defaultField;
    const validOrder: "asc" | "desc" = sortOrder === "asc" || sortOrder === "desc" ? sortOrder : defaultOrder;


    return { field: validField, order: validOrder };
}


export function buildOrderByClause(
    sort: SortParams,
    fieldMapping?: Record<string, string | Record<string, unknown>>
): Record<string, unknown> {
    const mappedField = fieldMapping?.[sort.field];
    // If it's an object (nested Prisma order, e.g., { category: { name: 'asc' } })
    if (mappedField !== null && typeof mappedField === "object") {
        return mappedField as Record<string, unknown>;
    }
    // If it's a string (renamed field) or the original field
    const field = typeof mappedField === "string" ? mappedField : sort.field;
    return { [field]: sort.order };
}


export function buildStableOrderBy(
    sort: SortParams
): Array<Record<string, "asc" | "desc">> {
    const orderBy: Array<Record<string, "asc" | "desc">> = [{ [sort.field]: sort.order }];


    if (sort.field !== "id") {
        orderBy.push({ id: "asc" });
    }


    return orderBy;
}
