/** Searchable fields for sellers */
export const SEARCHABLE_FIELDS = [
    "email",
    "businessName",
    "contactPerson",
    "phone",
] as const;

/** Sortable fields for sellers */
export const SORTABLE_FIELDS = [
    "createdAt",
    "invitedAt",
    "lastLoginAt",
    "businessName",
    "email",
    "isVerified",
] as const;

/** Default sort configuration */
export const DEFAULT_SORT = {
    field: "invitedAt",
    order: "desc" as const,
};