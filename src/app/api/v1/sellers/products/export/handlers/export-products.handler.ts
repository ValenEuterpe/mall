import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { generateExcelFile } from "@/lib/excel/generate";
import { ValidationError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { Prisma, ProductStatus } from "@/prisma/generated/client";
import { MAX_EXPORT_LIMIT } from "../constants";
import { EXPORT_SELECT } from "../selects";
import { parseExportOptions } from "../parsers";
import { transformProductForExport } from "../transforms";
import { getSellerShop } from "../../queries/get-seller-shop";
import { fetchProductsInBatches } from "../services/fetch-products-in-batches";
import { generateImportTemplate } from "../utils/generate-import-template";

function isProductStatus(value: string): value is ProductStatus {
    return (Object.values(ProductStatus) as string[]).includes(value);
}

export async function exportProductsHandler(request: NextRequest): Promise<NextResponse> {
    const user = requireAuth(request, ["SELLER"]);
    const { searchParams } = new URL(request.url);

    // Get seller's shop
    const shop = await getSellerShop(user.userId);

    // Parse export options
    const options = parseExportOptions(searchParams);

    // Check for template request
    if (searchParams.get("template") === "true") {
        return generateImportTemplate(shop.shopName ?? shop.fullCode);
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = {
        shopId: shop.id,
    };

    if (!options.includeInactive) {
        where.isActive = true;
    }

    if (options.status && isProductStatus(options.status)) {
        where.status = options.status;
    }

    // Get product count first
    const count = await prisma.product.count({ where });

    if (count === 0) {
        throw new ValidationError("No products found to export");
    }

    if (count > MAX_EXPORT_LIMIT) {
        throw new ValidationError(
            `Too many products to export (${count}). Maximum is ${MAX_EXPORT_LIMIT}. Please use filters to reduce the selection.`
        );
    }

    // Fetch products in batches for memory efficiency
    const products = await fetchProductsInBatches(where, EXPORT_SELECT);

    // Transform to export format
    const exportData = products.map((product) =>
        transformProductForExport(product, options)
    ) as unknown as Record<string, unknown>[];

    // Generate file
    const buffer = generateExcelFile(exportData, {
        sheetName: "Products",
        columnWidths: {
            Name: 30,
            Description: 50,
            Price: 12,
            "Sale Price": 12,
            Stock: 10,
            SKU: 15,
            Barcode: 20,
            Brand: 20,
            Category: 20,
            Subcategory: 20,
            Status: 12,
            Images: 100,
        },
    });

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const safeShopName = (shop.shopName ?? shop.fullCode)
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()
        .slice(0, 30);
    const filename = `products-${safeShopName}-${timestamp}.xlsx`;

    // Log export
    logger.info("Products exported", {
        sellerId: user.userId,
        shopId: shop.id,
        count: exportData.length,
        filename,
    });

    // Return file response
    return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}