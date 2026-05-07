export interface ShopFilters {
    venue?: string;
    building?: string;
    floor?: string;
    shopType?: string;
    vacant?: "true" | "false";
    verified?: "true" | "false";
    hasProducts?: "true" | "false";
    active?: "true" | "false";
}

export interface ShopSummary {
    total: number;
    vacant: number;
    occupied: number;
    byVenue: Record<string, number>;
    byFloor: Record<string, number>;
    withProducts: number;
}