import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-helper";
import prisma from "@/lib/db/prisma";
import { shopGenerateSchema } from "@/lib/validation/schemas/shop";
import { validateBody } from "@/lib/validation/request";
import { successResponse } from "@/lib/api/response";
import { ConflictError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";
import { Prisma } from "@/prisma/generated/client";

import { GeneratedShop, GenerationResult } from "../types";
import { validateGenerationParams } from "../utils/validate-generation-params";
import { generateShopCode } from "../utils/generate-shop-code";
import { generateSvgId } from "../utils/generate-svg-id";
import { formatShopNumber } from "../utils/format-shop-number";

export async function generateShopsHandler(
  request: NextRequest
): Promise<NextResponse> {
  const user = requireAuth(request, ["MALL_OWNER"]);
  const data = await validateBody(request, shopGenerateSchema);

  const {
    venue,
    building,
    floor,
    floorId,
    shopTypeId,
    startNumber,
    count,
    numberDigits = 2,
  } = data;

  // Validate parameters
  validateGenerationParams(startNumber, count);

  // Generate shop data
  const shopsToCreate: GeneratedShop[] = [];
  const generatedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const currentNum = startNumber + i;
    const shopNumber = formatShopNumber(currentNum, numberDigits);
    const fullCode = generateShopCode(
      venue,
      building ?? null,
      floor ?? null,
      shopNumber
    );
    const svgId = generateSvgId(
      venue,
      building ?? null,
      floor ?? null,
      shopNumber
    );

    generatedCodes.push(fullCode);

    shopsToCreate.push({
      venue: venue.trim(),
      building: building?.trim() || null,
      floor: floor?.trim() || null,
      floorId: floorId || null,
      shopTypeId: shopTypeId || null,
      shopNumber,
      fullCode,
      svgId,
      isActive: true,
    });
  }

  // Check for existing shops with these codes
  const existingShops = await prisma.shop.findMany({
    where: {
      fullCode: { in: generatedCodes },
    },
    select: { fullCode: true },
  });

  const existingCodes = new Set(existingShops.map((s) => s.fullCode));

  // Filter out existing shops
  const newShops = shopsToCreate.filter(
    (shop) => !existingCodes.has(shop.fullCode)
  );

  // Prepare result tracking
  const result: GenerationResult = {
    success: true,
    message: "",
    stats: {
      requested: count,
      created: 0,
      skipped: existingCodes.size,
      existing: Array.from(existingCodes),
    },
    shops: shopsToCreate.map((shop) => ({
      fullCode: shop.fullCode,
      status: existingCodes.has(shop.fullCode) ? "skipped" : "created",
    })),
  };

  // Create new shops if any
  if (newShops.length > 0) {
    try {
      const createResult = await prisma.$transaction(async (tx) => {
        // Use createMany for efficiency
        const created = await tx.shop.createMany({
          data: newShops,
          skipDuplicates: true, // Extra safety
        });

        return created;
      });

      result.stats.created = createResult.count;
    } catch (error) {
      // Handle unique constraint violations
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError(
          "Some shop codes already exist. Please try with different parameters."
        );
      }
      throw error;
    }
  }

  // Generate result message
  if (result.stats.created === 0) {
    result.success = false;
    result.message = `No shops created. All ${count} shop codes already exist.`;
  } else if (result.stats.skipped > 0) {
    result.message = `Created ${result.stats.created} shops. Skipped ${result.stats.skipped} existing shops.`;
  } else {
    result.message = `Successfully created ${result.stats.created} shops.`;
  }

  // Log the operation
  logger.info("Shops generated", {
    userId: user.userId,
    venue,
    building,
    floor,
    startNumber,
    count,
    created: result.stats.created,
    skipped: result.stats.skipped,
  });

  return successResponse(result);
}
