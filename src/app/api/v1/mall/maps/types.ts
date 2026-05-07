export interface MapResponse {
    map: {
        id: string;
        venue: string | null;
        building: string | null;
        floor: string | number;
        svgUrl: string;
        updatedAt: Date;
        /** Building geo-positioning for map display */
        geo?: {
            latitude: number;
            longitude: number;
            rotation: number;
            scale: number;
        };
    } | null;
    shops: Array<{
        id: string;
        shopNumber: string;
        fullCode: string;
        svgId: string | null;
        shopName: string | null;
        isVacant: boolean;
        description: string | null;
        imageUrl: string | null;
        openingHours: Record<string, string> | null;
        contacts: Array<{
            type: string;
            value: string;
            label: string | null;
        }>;
        seller: {
            businessName: string | null;
            logoUrl: string | null;
            phone: string | null;
            socialLinks: Record<string, string> | null;
        } | null;
    }>;
    meta: {
        totalShops: number;
        vacantShops: number;
        occupiedShops: number;
    };
    floors?: Array<{
        floor: number;
        label: string | null;
        hasMap: boolean;
    }>;
}
