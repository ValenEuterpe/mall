// src/lib/email/transporter.ts

import nodemailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import { EMAIL_CONFIG } from "@/lib/config/email.config";
import { logger } from "@/lib/utils/logger";
import type { EmailConnectionResult } from "@/types/email";

// ============================================================================
// TRANSPORTER STATE
// ============================================================================

let transporter: nodemailer.Transporter<SMTPPool.SentMessageInfo> | null = null;
let isVerified = false;
let lastVerifiedAt: Date | null = null;

// ============================================================================
// TRANSPORTER MANAGEMENT
// ============================================================================

/**
 * Create or get the email transporter
 */
export function getTransporter(): nodemailer.Transporter<SMTPPool.SentMessageInfo> {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            pool: true,
            host: EMAIL_CONFIG.smtp.host,
            port: EMAIL_CONFIG.smtp.port,
            secure: EMAIL_CONFIG.smtp.secure,
            auth: {
                user: EMAIL_CONFIG.smtp.user,
                pass: EMAIL_CONFIG.smtp.password,
            },
            maxConnections: EMAIL_CONFIG.pool.maxConnections,
            maxMessages: EMAIL_CONFIG.pool.maxMessages,
        });
    }

    return transporter;
}

/**
 * Verify the email transporter connection
 */
export async function verifyEmailConnection(): Promise<EmailConnectionResult> {
    try {
        const transport = getTransporter();
        await transport.verify();
        isVerified = true;
        lastVerifiedAt = new Date();
        logger.info("Email service connected");
        return { connected: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error("Email service connection failed", { error: message });
        isVerified = false;
        return { connected: false, error: message };
    }
}

/**
 * Close the email transporter connection
 */
export async function closeEmailConnection(): Promise<void> {
    if (transporter) {
        transporter.close();
        transporter = null;
        isVerified = false;
        lastVerifiedAt = null;
        logger.info("Email service connection closed");
    }
}

/**
 * Get transporter status
 */
export function getTransporterStatus(): {
    created: boolean;
    verified: boolean;
    lastVerifiedAt: Date | null;
} {
    return {
        created: transporter !== null,
        verified: isVerified,
        lastVerifiedAt,
    };
}

/**
 * Get the from address
 */
export function getFromAddress(): string {
    return EMAIL_CONFIG.smtp.from;
}