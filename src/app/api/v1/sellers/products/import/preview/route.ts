import { withMiddleware } from "@/lib/api/middleware";
import { previewImportHandler } from "./handlers/preview-import.handler";

export const POST = withMiddleware(previewImportHandler, {
  requireAuth: true,
  allowedRoles: ["SELLER"],
  rateLimit: false,
});
