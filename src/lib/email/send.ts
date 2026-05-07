// src/lib/email/send.ts

import { EMAIL_CONFIG } from "@/lib/config/email.config";
import { logger } from "@/lib/utils/logger";
import { getTransporter, getFromAddress, verifyEmailConnection, closeEmailConnection, getTransporterStatus } from "./transporter";
import { getEmailTemplate, stripHtml } from "./templates";
import type {
    SendEmailOptions,
    EmailResult,
    EmailError,
    EmailTemplateType,
    TemplateDataMap,
    EmailServiceHealth,
} from "@/types/email";

// Re-export for convenience
export { verifyEmailConnection, closeEmailConnection };

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate all recipient emails
 */
function validateRecipients(
    to: string | string[]
): { valid: true; emails: string[] } | { valid: false; invalid: string[] } {
    const emails = Array.isArray(to) ? to : [to];
    const invalid = emails.filter((email) => !isValidEmail(email.trim()));

    if (invalid.length > 0) {
        return { valid: false, invalid };
    }

    return { valid: true, emails: emails.map((e) => e.trim().toLowerCase()) };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
        "Invalid login",
        "authentication failed",
        "Invalid recipient",
        "Mailbox not found",
        "User unknown",
    ];

    return nonRetryablePatterns.some((pattern) =>
        error.message.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * Execute function with exponential backoff retry
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const { maxRetries, baseDelay } = EMAIL_CONFIG.retry;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (isNonRetryableError(lastError)) {
                throw lastError;
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                logger.warn("Email send attempt failed, retrying", {
                    attempt: attempt + 1,
                    delayMs: delay,
                    error: lastError.message,
                });
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Categorize error type
 */
function categorizeError(errorMessage: string): EmailError["error"] {
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT")) {
        return "CONNECTION_ERROR";
    }
    if (errorMessage.includes("rate") || errorMessage.includes("limit")) {
        return "RATE_LIMITED";
    }
    return "SEND_FAILED";
}

// ============================================================================
// CORE EMAIL SENDING
// ============================================================================

/**
 * Send an email with retry logic and proper error handling
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    // Validate recipients
    const validation = validateRecipients(options.to);
    if (!validation.valid) {
        return {
            success: false,
            error: "INVALID_EMAIL",
            message: `Invalid email address(es): ${validation.invalid.join(", ")}`,
        };
    }

    // Dev-only: console delivery mode (never enabled in production; enforced in EMAIL_CONFIG)
    if (EMAIL_CONFIG.deliveryMode === "console") {
        const text = options.text ?? stripHtml(options.html);

        // Best-effort link extraction (useful for magic-link / reset / verify flows)
        const urlMatch = options.html.match(/https?:\/\/[^\s"'<>]+/g);
        const urls = urlMatch ?? [];

        logger.debug("Email captured (console delivery mode)", {
            to: validation.emails,
            subject: options.subject,
            urls,
            bodyText: text,
        });

        return {
            success: true,
            messageId: "console",
            accepted: validation.emails,
            rejected: [],
        };
    }

    try {
        const transport = getTransporter();

        const result = await withRetry(async () => {
            return transport.sendMail({
                from: getFromAddress(),
                to: validation.emails.join(", "),
                cc: options.cc,
                bcc: options.bcc,
                replyTo: options.replyTo,
                subject: options.subject,
                html: options.html,
                text: options.text ?? stripHtml(options.html),
                attachments: options.attachments,
                priority: options.priority,
                headers: options.headers,
            });
        });

        logger.info("Email sent", { to: validation.emails });

        return {
            success: true,
            messageId: result.messageId,
            accepted: result.accepted as string[],
            rejected: result.rejected as string[],
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to send email", { to: validation.emails, error: errorMessage });

        return {
            success: false,
            error: categorizeError(errorMessage),
            message: `Failed to send email: ${errorMessage}`,
            details: error,
        };
    }
}

/**
 * Send a templated email
 */
export async function sendTemplatedEmail<T extends EmailTemplateType>(
    to: string | string[],
    templateType: T,
    data: TemplateDataMap[T],
    options?: Partial<Pick<SendEmailOptions, "cc" | "bcc" | "replyTo" | "priority">>
): Promise<EmailResult> {
    const template = getEmailTemplate(templateType, data);

    return sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        ...options,
    });
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send verification email
 */
export async function sendVerificationEmail(
    email: string,
    verifyUrl: string
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "verification", {
        verifyUrl,
        expiresIn: EMAIL_CONFIG.linkExpiry.verification,
    });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    resetUrl: string
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "password-reset", {
        resetUrl,
        expiresIn: EMAIL_CONFIG.linkExpiry.passwordReset,
    });
}

/**
 * Send magic link email for Mall Owner
 */
export async function sendMagicLinkEmail(
    email: string,
    magicUrl: string
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "magic-link", {
        magicUrl,
        expiresIn: EMAIL_CONFIG.linkExpiry.magicLink,
    });
}

/**
 * Send invitation email for Seller
 */
export async function sendInvitationEmail(
    email: string,
    setupUrl: string,
    inviterName?: string
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "invitation", {
        setupUrl,
        role: "seller",
        expiresIn: EMAIL_CONFIG.linkExpiry.invitation,
        inviterName,
    });
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
    email: string,
    userName: string,
    dashboardUrl: string
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "welcome", {
        userName,
        dashboardUrl,
    });
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
    email: string | string[],
    title: string,
    message: string,
    action?: { url: string; text: string }
): Promise<EmailResult> {
    return sendTemplatedEmail(email, "notification", {
        title,
        message,
        actionUrl: action?.url,
        actionText: action?.text,
    });
}

// ============================================================================
// FIRE-AND-FORGET DISPATCH
// ============================================================================

/**
 * Run an email send in the background. The response path returns immediately;
 * any rejection is routed to logger.error (and from there to Sentry).
 * Use this in handlers where the user shouldn't wait on SMTP latency and where
 * a missed email is recoverable (resend flows, welcome mails, etc.).
 */
export function dispatch(send: () => Promise<EmailResult>): void {
    void send()
        .then((result) => {
            if (!result.success) {
                logger.error("Detached email send failed", {
                    error: result.error,
                    message: result.message,
                });
            }
        })
        .catch((error) => {
            logger.error("Detached email send threw", error);
        });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Get email service health status
 */
export async function getEmailServiceHealth(): Promise<EmailServiceHealth> {
    const status = getTransporterStatus();

    if (!status.created) {
        return {
            status: "unhealthy",
            details: {
                transporterCreated: false,
                transporterVerified: false,
            },
        };
    }

    if (!status.verified) {
        const verification = await verifyEmailConnection();
        return {
            status: verification.connected ? "healthy" : "unhealthy",
            details: {
                transporterCreated: true,
                transporterVerified: verification.connected,
            },
        };
    }

    return {
        status: "healthy",
        details: {
            transporterCreated: true,
            transporterVerified: true,
            lastVerified: status.lastVerifiedAt ?? undefined,
        },
    };
}