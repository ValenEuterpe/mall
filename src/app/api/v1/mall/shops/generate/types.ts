export interface GeneratedShop {
    venue: string;
    building: string | null;
    floor: string | null;
    floorId: string | null;
    shopTypeId: string | null;
    shopNumber: string;
    fullCode: string;
    svgId: string;
    isActive: boolean;
}

export interface GenerationResult {
    success: boolean;
    message: string;
    stats: {
        requested: number;
        created: number;
        skipped: number;
        existing: string[];
    };
    shops: Array<{
        fullCode: string;
        status: "created" | "skipped";
    }>;
}