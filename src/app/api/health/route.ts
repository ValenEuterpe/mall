import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getEmailServiceHealth } from "@/lib/email/send";
import { healthResponse, methodNotAllowed } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

type HealthStatus = "healthy" | "unhealthy" | "degraded" | "unknown";

interface HealthChecks {
  database: HealthStatus;
  email: HealthStatus;
}

interface HealthResponseData {
  checks: HealthChecks;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  env: string | undefined;
}

export async function GET() {
  try {
    const checks: HealthChecks = {
      database: "unknown",
      email: "unknown",
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "healthy";
    } catch (error) {
      logger.error("Health check - Database failed", error);
      checks.database = "unhealthy";
    }

    try {
      const emailHealth = await getEmailServiceHealth();
      checks.email = emailHealth.status as HealthStatus;
    } catch (error) {
      logger.error("Health check - Email failed", error);
      checks.email = "unhealthy";
    }

    const isHealthy = Object.values(checks).every((s) => s === "healthy");
    const isDegraded =
      !isHealthy &&
      Object.values(checks).some((s) => s !== "healthy") &&
      checks.database === "healthy";

    const status: HealthStatus = isHealthy
      ? "healthy"
      : isDegraded
        ? "degraded"
        : "unhealthy";

    const data: HealthResponseData = {
      checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
    };

    return healthResponse(status, data as unknown as Record<string, unknown>);
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

export const POST = () => methodNotAllowed(["GET"]);
export const PUT = () => methodNotAllowed(["GET"]);
export const DELETE = () => methodNotAllowed(["GET"]);
export const PATCH = () => methodNotAllowed(["GET"]);
