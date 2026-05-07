import { ProductStatus } from "@/prisma/generated/client";

export interface ImportResult {
    success: boolean;
    message: string;
    stats: {
        total: number;
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    };
    errors: ImportError[];
    warnings: string[];
    duration: number;
}

export interface ImportError {
    row: number;
    field?: string;
    value?: string;
    message: string;
}

export interface ProcessedProduct {
    name: string;
    description: string | null;
    basePrice: number;
    stockQuantity: number;
    brand: string | null;
    barcode: string | null;
    sku: string | null;
    categoryKey: string | null;
    status: ProductStatus;
}