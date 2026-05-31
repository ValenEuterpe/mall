import { env } from "@/env";
import * as Sentry from "@sentry/nextjs";

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";

  const maskedLocal =
    local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : "***";

  return `${maskedLocal}@${domain}`;
}

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private isDevelopment = env.NODE_ENV === "development";

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry = this.formatMessage(level, message, data);

    // In development, use console with colors
    if (this.isDevelopment) {
      const colors = {
        info: "\x1b[36m", // Cyan
        warn: "\x1b[33m", // Yellow
        error: "\x1b[31m", // Red
        debug: "\x1b[35m", // Magenta
      };
      const reset = "\x1b[0m";

      console.log(
        `${colors[level]}[${entry.timestamp}] [${level.toUpperCase()}]${reset}`,
        message,
        data ? data : ""
      );
    } else {
      // In production, log as JSON
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, data?: unknown) {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown) {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown) {
    this.log("error", message, data);

    // Forward to Sentry. SDK is a no-op when DSN is unset, so this is safe in dev.
    if (data instanceof Error) {
      Sentry.captureException(data, { extra: { message } });
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        extra: data ? { data } : undefined,
      });
    }
  }

  debug(message: string, data?: unknown) {
    if (this.isDevelopment) {
      this.log("debug", message, data);
    }
  }
}

export const logger = new Logger();
