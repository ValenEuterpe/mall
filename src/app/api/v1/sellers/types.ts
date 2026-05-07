export interface SellerFilters {
    isVerified?: "true" | "false";
    isActive?: "true" | "false";
    hasShop?: "true" | "false";
    registrationStatus?: "pending" | "completed";
}

export interface SellerSummary {
    total: number;
    verified: number;
    unverified: number;
    active: number;
    inactive: number;
    withShops: number;
    pendingRegistration: number;
}