import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/api/auth-helper";
import {
  uploadRateLimiter,
  getRateLimitIdentifier,
} from "@/lib/utils/rate-limit";
import { successResponse } from "@/lib/api/response";
import { parseUploadOptions } from "@/lib/utils/upload/options";
import { uploadFile } from "@/lib/upload/service";
import { ValidationError } from "@/lib/errors/custom-errors";
import { logger } from "@/lib/utils/logger";

async function postHandler(request: NextRequest) {
  const user = requireAuth(request);
  const start = Date.now();

  const identifier = getRateLimitIdentifier(request, user.userId);
  await uploadRateLimiter.check(identifier);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new ValidationError("No file provided");
  }

  const options = parseUploadOptions(formData);
  const result = await uploadFile(file, user.userId, options);

  logger.info("File uploaded", {
    userId: user.userId,
    filename: result.filename,
    duration: Date.now() - start,
  });

  return successResponse(result, { status: 201 });
}

export const POST = withMiddleware(postHandler, {
  requireAuth: true,
  rateLimit: false,
  auditAction: "FILE_UPLOADED",
});
