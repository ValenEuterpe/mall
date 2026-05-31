import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { methodNotAllowed, successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@/prisma/generated/client";
import { updateMallAboutSchema } from "./schemas";

const ABOUT_SELECT = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  description_en: true,
  description_ru: true,
  description_am: true,
  workingHours: true,
  contactPhone: true,
  contactEmail: true,
  logoUrl: true,
  socialLinks: true,
  policies_en: true,
  policies_ru: true,
  policies_am: true,
} as const;

async function getAboutHandler(): Promise<NextResponse> {
  const mall = await prisma.mall.findFirst({
    select: ABOUT_SELECT,
  });

  if (!mall) {
    return successResponse(null, { message: "No mall configured yet" });
  }

  return successResponse(mall);
}

async function updateAboutHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const parsed = updateMallAboutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const existing = await prisma.mall.findFirst();
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MALL_NOT_FOUND",
          message: "No mall exists. Create one first via mall setup.",
        },
      },
      { status: 404 }
    );
  }

  // Clean empty strings to null
  const cleaned = { ...parsed.data };
  if (cleaned.contactEmail === "") cleaned.contactEmail = null;
  if (cleaned.logoUrl === "") cleaned.logoUrl = null;

  // Build socialLinks for Prisma Json field
  let socialLinksValue: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    Prisma.JsonNull;
  if (cleaned.socialLinks) {
    const links = cleaned.socialLinks;
    const instagram = links.instagram || undefined;
    const facebook = links.facebook || undefined;
    const telegram = links.telegram || undefined;
    if (instagram || facebook || telegram) {
      socialLinksValue = { instagram, facebook, telegram };
    }
  }

  const mall = await prisma.mall.update({
    where: { id: existing.id },
    data: {
      description_en: cleaned.description_en,
      description_ru: cleaned.description_ru,
      description_am: cleaned.description_am,
      workingHours: cleaned.workingHours,
      contactPhone: cleaned.contactPhone,
      contactEmail: cleaned.contactEmail,
      logoUrl: cleaned.logoUrl,
      socialLinks: socialLinksValue,
      policies_en: cleaned.policies_en,
      policies_ru: cleaned.policies_ru,
      policies_am: cleaned.policies_am,
    },
    select: ABOUT_SELECT,
  });

  return successResponse(mall, { message: "About info updated successfully" });
}

export const GET = withMiddleware(getAboutHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const PUT = withMiddleware(updateAboutHandler, {
  requireAuth: true,
  allowedRoles: ["MALL_OWNER"],
  rateLimit: true,
});

export const POST = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET", "PUT"]);

export const DELETE = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET", "PUT"]);
