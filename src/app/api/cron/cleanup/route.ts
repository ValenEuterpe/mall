import { NextRequest } from "next/server";
import { runAllCleanupTasks } from "@/lib/cron/cleanup-sessions";
import { successResponse, methodNotAllowed } from "@/lib/api/response";
import { AuthenticationError } from "@/lib/errors/custom-errors";
import { handleError } from "@/lib/errors/error-handler";
import { logger } from "@/lib/utils/logger";

interface CleanupResponse {
  sessions: { success: boolean; count: number; error?: unknown };
  tokens: { success: boolean; count: number; error?: unknown };
  auditLogs: { success: boolean; count: number; error?: unknown };
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isDev = process.env.NODE_ENV === "development";
    const skipAuth = isDev && !cronSecret;

    if (!skipAuth) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn("Unauthorized cron access attempt", {
          ip: request.headers.get("x-forwarded-for"),
          userAgent: request.headers.get("user-agent"),
        });
        throw new AuthenticationError("Invalid cron secret");
      }
    }

    logger.info("Cron cleanup job started");

    const [sessionResult, tokenResult, auditResult] =
      await runAllCleanupTasks();

    const response: CleanupResponse = {
      sessions: sessionResult,
      tokens: tokenResult,
      auditLogs: auditResult,
      timestamp: new Date().toISOString(),
    };

    logger.info("Cron cleanup job completed", {
      sessionsCleaned: sessionResult.count,
      tokensCleaned: tokenResult.count,
      auditLogsCleaned: auditResult.count,
    });

    return successResponse<CleanupResponse>(response);
  } catch (error) {
    logger.error("Cron cleanup job failed", error);
    return handleError(error);
  }
}

export const POST = () => methodNotAllowed(["GET"]);
export const PUT = () => methodNotAllowed(["GET"]);
export const DELETE = () => methodNotAllowed(["GET"]);
export const PATCH = () => methodNotAllowed(["GET"]);
