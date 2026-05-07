// src/types/email.ts

// ============================================================================
// EMAIL SENDING TYPES
// ============================================================================

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: EmailAttachment[];
    /** Priority level */
    priority?: "high" | "normal" | "low";
    /** Custom headers */
    headers?: Record<string, string>;
}

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
}

export interface EmailSuccess {
    success: true;
    messageId: string;
    accepted: string[];
    rejected: string[];
}

export type EmailErrorType =
    | "INVALID_EMAIL"
    | "SEND_FAILED"
    | "CONNECTION_ERROR"
    | "RATE_LIMITED"
    | "UNKNOWN";

export interface EmailError {
    success: false;
    error: EmailErrorType;
    message: string;
    details?: unknown;
}

export type EmailResult = EmailSuccess | EmailError;

// ============================================================================
// EMAIL TEMPLATE TYPES
// ============================================================================

export type EmailTemplateType =
    | "verification"
    | "password-reset"
    | "magic-link"
    | "invitation"
    | "welcome"
    | "notification";

export interface VerificationTemplateData {
    verifyUrl: string;
    expiresIn: string;
}

export interface PasswordResetTemplateData {
    resetUrl: string;
    expiresIn: string;
}

export interface MagicLinkTemplateData {
    magicUrl: string;
    expiresIn: string;
}

export interface InvitationTemplateData {
    setupUrl: string;
    role: "seller";
    expiresIn: string;
    inviterName?: string;
}

export interface WelcomeTemplateData {
    userName: string;
    dashboardUrl: string;
}

export interface NotificationTemplateData {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
}

export interface TemplateDataMap {
    verification: VerificationTemplateData;
    "password-reset": PasswordResetTemplateData;
    "magic-link": MagicLinkTemplateData;
    invitation: InvitationTemplateData;
    welcome: WelcomeTemplateData;
    notification: NotificationTemplateData;
}

export interface EmailTemplate {
    subject: string;
    html: string;
}

// ============================================================================
// EMAIL SERVICE TYPES
// ============================================================================

export interface EmailServiceHealth {
    status: "healthy" | "degraded" | "unhealthy";
    details: {
        transporterCreated: boolean;
        transporterVerified: boolean;
        lastVerified?: Date;
    };
}

export interface EmailConnectionResult {
    connected: boolean;
    error?: string;
}