import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";

import { withMiddleware } from "@/lib/api/middleware";
import { requireProductOwnership } from "@/lib/auth/ownership";
import { validateBody } from "@/lib/validation/request";
import {
  discountCreateSchema,
  type DiscountCreateInput,
} from "@/lib/validation/schemas/product";
import { successResponse, methodNotAllowed } from "@/lib/api/response";

async function getHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await requireProductOwnership(request, id);

  const discounts = await prisma.productDiscount.findMany({
    where: { productId: id },
    orderBy: { id: "desc" },
  });

  const mapped = discounts.map((d) => ({
    id: d.id,
    name: d.name,
    name_en: d.name_en,
    name_ru: d.name_ru,
    name_am: d.name_am,
    discountType: d.discountType,
    discountValue: d.discountValue.toNumber(),
    startDate: d.startDate?.toISOString() ?? null,
    endDate: d.endDate?.toISOString() ?? null,
    isActive: d.isActive,
  }));

  return successResponse(mapped);
}

async function postHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await requireProductOwnership(request, id);

  const input: DiscountCreateInput = await validateBody(
    request,
    discountCreateSchema
  );

  let nameEn = input.name_en;
  let nameRu = input.name_ru;
  let nameAm = input.name_am;

  if (
    input.autoTranslate &&
    (input.name || input.name_en || input.name_ru || input.name_am)
  ) {
    const sourceText =
      input.name || input.name_en || input.name_ru || input.name_am;
    try {
      const translateRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sourceText,
            targetLanguages: ["en", "ru", "am"],
          }),
        }
      );
      if (translateRes.ok) {
        const translateData = await translateRes.json();
        if (translateData.translations) {
          nameEn = nameEn || translateData.translations.en;
          nameRu = nameRu || translateData.translations.ru;
          nameAm = nameAm || translateData.translations.am;
        }
      }
    } catch {
      // Translation failed, continue without it
    }
  }

  const fallbackName = nameEn || nameRu || nameAm || input.name || "Discount";

  const discount = await prisma.productDiscount.create({
    data: {
      productId: id,
      name: fallbackName,
      name_en: nameEn,
      name_ru: nameRu,
      name_am: nameAm,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: input.isActive,
    },
  });

  return successResponse(
    {
      id: discount.id,
      name: discount.name,
      name_en: discount.name_en,
      name_ru: discount.name_ru,
      name_am: discount.name_am,
      discountType: discount.discountType,
      discountValue: discount.discountValue.toNumber(),
      startDate: discount.startDate?.toISOString() ?? null,
      endDate: discount.endDate?.toISOString() ?? null,
      isActive: discount.isActive,
    },
    { status: 201, message: "Discount created successfully" }
  );
}

export const GET = withMiddleware(getHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 60,
});

export const POST = withMiddleware(postHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: true,
  skipRateLimitForRoles: ["SELLER", "MALL_OWNER"],
  rateLimitMax: 20,
});

export const PUT = () => methodNotAllowed(["GET", "POST"]);
export const DELETE = () => methodNotAllowed(["GET", "POST"]);
