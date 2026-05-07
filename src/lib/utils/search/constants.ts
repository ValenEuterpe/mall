export const SEARCH_DEFAULTS = {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
} as const;


export const SORT_DEFAULTS = {
    FIELD: "createdAt",
    ORDER: "desc" as const,
} as const;


export const UNSAFE_SEARCH_PATTERN = /[%_\\'";\[\]{}()]/g;