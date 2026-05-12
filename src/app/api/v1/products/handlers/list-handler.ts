import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import {
    parsePaginationQuery,
    getPaginationMeta,
    paginateQuery,
    PAGINATION_DEFAULTS,
} from "@/lib/utils/pagination";
import {
    buildSearchCondition,
    parseSortQuery,
    buildStableOrderBy,
    combineFilters,
} from "@/lib/utils/search";
import { paginatedResponse } from "@/lib/api/response";
import { Prisma } from "@/prisma/generated/client";
import { logger } from "@/lib/utils/logger";
import { SEARCHABLE_FIELDS, SORTABLE_FIELDS, DEFAULT_SORT } from "../helpers/constants";
import { getProductListSelect } from "../helpers/selects";
import { parseProductFilters, buildFilterConditions } from "../helpers/filters";
import { transformProductForList } from "../helpers/transform";
import { logProductSearch } from "../helpers/utils";

type SupportedLocale = "en" | "ru" | "am";

function parseLocale(value: string | null): SupportedLocale {
    if (value === "ru" || value === "am" || value === "en") return value;
    return "en";
}

export async function getProductsHandler(request: NextRequest): Promise<NextResponse> {
    const user = optionalAuth(request);
    const { searchParams } = new URL(request.url);
    const locale = parseLocale(searchParams.get("locale"));

    // Parse and validate pagination
    const pagination = parsePaginationQuery(searchParams, {
        limit: PAGINATION_DEFAULTS.LIMIT,
    });

    // Parse and validate search
    const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
    const searchCondition = buildSearchCondition(
        searchQuery,
        SEARCHABLE_FIELDS,
        { minLength: 2 }
    );

    // Parse and validate filters
    const filters = parseProductFilters(searchParams);

    // Parse and validate sort (with allowed fields validation)
    const sort = parseSortQuery(searchParams, SORTABLE_FIELDS, DEFAULT_SORT);

    // Build base where clause (always filter for published/active)
    const baseWhere: Prisma.ProductWhereInput = {
        status: "PUBLISHED",
        isActive: true,
    };

    // Build filter conditions
    const filterConditions = buildFilterConditions(filters);

    // Combine all conditions
    const where: Prisma.ProductWhereInput = combineFilters(
        baseWhere,
        searchCondition || {},
        filterConditions
    );

    // Build stable orderBy (includes secondary sort for consistency)
    const orderBy = buildStableOrderBy(sort);

    try {
        // Execute count and data queries in parallel
        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                ...paginateQuery(pagination),
                orderBy,
                select: getProductListSelect(),
            }),
        ]);

        // Transform products for response
        const transformedProducts = products.map((product) =>
            transformProductForList(product, locale)
        );

        // Generate pagination metadata
        const meta = getPaginationMeta(pagination.page, pagination.limit, total);

        // Add cache headers for public product listings
        const response = paginatedResponse(
            transformedProducts,
            {
                page: meta.page,
                limit: meta.limit,
                total: meta.total,
            }
        );

        // Log for analytics (non-blocking)
        logProductSearch(searchQuery, filters, total, user?.userId).catch(() => { });

        return response;
    } catch (error) {
        logger.error("Failed to fetch products", { error, where, pagination });
        throw error;
    }
}