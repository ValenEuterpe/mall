import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { getProductDetailSelect } from "../../helpers/selects";
import { isValidProductId } from "../../helpers/utils";
import { transformProductForDetail } from "../../helpers/transform";
import { incrementViewCount } from "../../helpers/utils";

type SupportedLocale = "en" | "ru" | "am";

function parseLocale(value: string | null): SupportedLocale {
    if (value === "ru" || value === "am" || value === "en") return value;
    return "en";
}


export async function getProductDetailHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;
    const user = optionalAuth(request);
    const { searchParams } = new URL(request.url);
    const locale = parseLocale(searchParams.get("locale"));

    // Validate ID format
    if (!isValidProductId(id)) {
        throw new ValidationError("Invalid product ID format");
    }

    // Fetch product with all related data
    const product = await prisma.product.findUnique({
        where: {
            id,
            status: "PUBLISHED",
            isActive: true,
        },
        select: getProductDetailSelect(),
    });

    if (!product) {
        throw new NotFoundError("Product not found");
    }

    // Increment view count (non-blocking)
    incrementViewCount(id).catch((error) => {
        logger.warn("Failed to increment view count", { productId: id, error });
    });

    // Transform for response
    const transformedProduct = transformProductForDetail(product, locale);

    // Log view for analytics
    logger.debug("Product viewed", {
        productId: id,
        userId: user?.userId,
        shopId: product.shop.id,
    });

    return successResponse(transformedProduct);
}