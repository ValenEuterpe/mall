import { NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { methodNotAllowed, successResponse } from "@/lib/api/response";
import prisma from "@/lib/db/prisma";

async function getPublicAboutHandler(): Promise<NextResponse> {
  const mall = await prisma.mall.findFirst({
    select: {
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
    },
  });

  if (!mall) {
    return successResponse(null, { message: "No mall information available" });
  }

  return successResponse(mall);
}

export const GET = withMiddleware(getPublicAboutHandler, {
  rateLimit: true,
});

export const POST = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET"]);

export const DELETE = (): ReturnType<typeof methodNotAllowed> =>
  methodNotAllowed(["GET"]);
