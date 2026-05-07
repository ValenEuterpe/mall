// src/lib/email/templates.ts

import { BRAND_CONFIG } from "@/lib/config/email.config";
import type {
    EmailTemplate,
    TemplateDataMap,
    EmailTemplateType,
} from "@/types/email";

// ============================================================================
// HTML UTILITIES
// ============================================================================

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip HTML tags to create plain text version
 */
export function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================================
// BASE TEMPLATE
// ============================================================================

/**
 * Base email template wrapper
 */
function baseTemplate(content: string, preheader?: string): string {
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND_CONFIG.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #f4f4f5;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_CONFIG.backgroundColor};
    }
    .email-header {
      background-color: ${BRAND_CONFIG.primaryColor};
      padding: 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      color: ${BRAND_CONFIG.textColor};
      font-size: 24px;
      font-weight: 700;
    }
    .email-body {
      padding: 32px 24px;
    }
    .email-footer {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${BRAND_CONFIG.primaryColor};
      color: ${BRAND_CONFIG.textColor} !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .text-muted {
      color: #6b7280;
      font-size: 14px;
    }
    .security-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 14px;
    }
    h2 {
      color: #111827;
      font-size: 20px;
      margin-bottom: 16px;
    }
    p {
      color: #374151;
      line-height: 1.6;
      margin: 12px 0;
    }
    a {
      color: ${BRAND_CONFIG.primaryColor};
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <div class="email-container">
          <div class="email-header">
            <h1>${BRAND_CONFIG.name}</h1>
          </div>
          <div class="email-body">
            ${content}
          </div>
          <div class="email-footer">
            <p style="margin: 0 0 8px 0;">
              © ${year} ${BRAND_CONFIG.name}. All rights reserved.
            </p>
            <p style="margin: 0;">
              Questions? Contact us at <a href="mailto:${BRAND_CONFIG.supportEmail}">${BRAND_CONFIG.supportEmail}</a>
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Create link fallback text
 */
function linkFallback(url: string): string {
    return `
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p class="text-muted" style="font-size: 12px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${escapeHtml(url)}" style="word-break: break-all;">${escapeHtml(url)}</a>
      </p>
    `;
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const templates: {
    [K in EmailTemplateType]: (data: TemplateDataMap[K]) => EmailTemplate;
} = {
    verification: (data) => ({
        subject: "Verify your email address",
        html: baseTemplate(
            `
            <h2>Welcome! Let's verify your email</h2>
            <p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${escapeHtml(data.verifyUrl)}" class="button">Verify Email Address</a>
            </div>
            
            <p class="text-muted">This link will expire in ${escapeHtml(data.expiresIn)}.</p>
            <p class="text-muted">If you didn't create an account with us, you can safely ignore this email.</p>
            ${linkFallback(data.verifyUrl)}
            `,
            "Please verify your email address to complete your registration"
        ),
    }),

    "password-reset": (data) => ({
        subject: "Reset your password",
        html: baseTemplate(
            `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset the password for your account. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${escapeHtml(data.resetUrl)}" class="button">Reset Password</a>
            </div>
            
            <p class="text-muted">This link will expire in ${escapeHtml(data.expiresIn)}.</p>
            
            <div class="security-notice">
              <strong>Didn't request this?</strong><br>
              If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.
            </div>
            ${linkFallback(data.resetUrl)}
            `,
            "Reset your password - link expires in " + data.expiresIn
        ),
    }),

    "magic-link": (data) => ({
        subject: "Your secure login link",
        html: baseTemplate(
            `
            <h2>Mall Owner Login</h2>
            <p>Click the button below to securely access your dashboard:</p>
            
            <div style="text-align: center;">
              <a href="${escapeHtml(data.magicUrl)}" class="button">Access Dashboard</a>
            </div>
            
            <p class="text-muted">This link will expire in ${escapeHtml(data.expiresIn)}.</p>
            
            <div class="security-notice">
              <strong>Security Notice</strong><br>
              This is a one-time login link. Only use it if you initiated the login request. Never share this link with anyone.
            </div>
            ${linkFallback(data.magicUrl)}
            `,
            "Your secure login link - expires in " + data.expiresIn
        ),
    }),

    invitation: (data) => {
        const inviterText = data.inviterName
            ? `<strong>${escapeHtml(data.inviterName)}</strong> has invited you`
            : "You've been invited";

        return {
            subject: `You've been invited to join as a Seller`,
            html: baseTemplate(
                `
                <h2>You're Invited!</h2>
                <p>
                  ${inviterText} to join ${BRAND_CONFIG.name} as a <strong>Seller</strong>.
                </p>

                <p>Click the button below to set up your account and get started:</p>

                <div style="text-align: center;">
                  <a href="${escapeHtml(data.setupUrl)}" class="button">Set Up Your Account</a>
                </div>

                <p class="text-muted">This invitation will expire in ${escapeHtml(data.expiresIn)}.</p>

                <h3 style="margin-top: 32px;">What's next?</h3>
                <ul style="color: #374151; line-height: 1.8;">
                  <li>Click the button above to create your account</li>
                  <li>Complete your profile setup</li>
                  <li>Start listing your products</li>
                </ul>
                ${linkFallback(data.setupUrl)}
                `,
                `You're invited to join ${BRAND_CONFIG.name} as a Seller`
            ),
        };
    },

    welcome: (data) => ({
        subject: `Welcome to ${BRAND_CONFIG.name}!`,
        html: baseTemplate(
            `
            <h2>Welcome aboard, ${escapeHtml(data.userName)}! 🎉</h2>
            <p>Your account has been successfully verified. We're excited to have you!</p>
            
            <div style="text-align: center;">
              <a href="${escapeHtml(data.dashboardUrl)}" class="button">Go to Dashboard</a>
            </div>
            
            <h3 style="margin-top: 32px;">Getting Started</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>Explore available features</li>
              <li>Connect with our community</li>
            </ul>
            
            <p>If you have any questions, our support team is here to help!</p>
            `,
            `Welcome to ${BRAND_CONFIG.name}! Your account is ready.`
        ),
    }),

    notification: (data) => ({
        subject: data.title,
        html: baseTemplate(
            `
            <h2>${escapeHtml(data.title)}</h2>
            <p>${escapeHtml(data.message)}</p>
            
            ${data.actionUrl && data.actionText
                ? `
            <div style="text-align: center;">
              <a href="${escapeHtml(data.actionUrl)}" class="button">${escapeHtml(data.actionText)}</a>
            </div>
            `
                : ""
            }
            `,
            data.message.substring(0, 100)
        ),
    }),
};

/**
 * Get email template by type
 */
export function getEmailTemplate<T extends EmailTemplateType>(
    templateType: T,
    data: TemplateDataMap[T]
): EmailTemplate {
    const templateFn = templates[templateType] as (
        d: TemplateDataMap[T]
    ) => EmailTemplate;
    return templateFn(data);
}