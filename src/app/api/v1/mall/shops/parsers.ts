import { ShopFilters } from "./types";

export function parseShopFilters(searchParams: URLSearchParams): ShopFilters {
    return {
        venue: searchParams.get("venue") || undefined,
        building: searchParams.get("building") || undefined,
        floor: searchParams.get("floor") || undefined,
        shopType: searchParams.get("shopType") || undefined,
        vacant: (searchParams.get("vacant") as "true" | "false") || undefined,
        verified: (searchParams.get("verified") as "true" | "false") || undefined,
        hasProducts:
            (searchParams.get("hasProducts") as "true" | "false") || undefined,
        active: (searchParams.get("active") as "true" | "false") || undefined,
    };
}