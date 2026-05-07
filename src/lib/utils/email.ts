// src/lib/utils/email.ts

/**
 * Normalize email address for consistent storage and comparison
 *
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Mask email for logging (privacy protection)
 *
 * @param email - Email address to mask
 * @returns Masked email (e.g., "j***n@example.com")
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!domain) {
    return email.length > 2
      ? `${email[0]}***${email[email.length - 1]}`
      : "***";
  }

  const maskedLocal =
    localPart.length > 2
      ? `${localPart[0]}***${localPart[localPart.length - 1]}`
      : `${localPart[0]}***`;

  return `${maskedLocal}@${domain}`;
}

/**
 * Extract domain from email address
 *
 * @param email - Email address
 * @returns Domain part of the email
 */
export function getEmailDomain(email: string): string {
  const parts = email.split("@");
  return parts[1] || "";
}

/**
 * Check if email is from a disposable email provider
 * (Basic implementation - extend with actual disposable domain list)
 *
 * @param email - Email address to check
 * @returns True if email appears to be from a disposable provider
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    "tempmail.com",
    "throwaway.com",
    "guerrillamail.com",
    "10minutemail.com",
    // Add more as needed
  ];

  const domain = getEmailDomain(email.toLowerCase());
  return disposableDomains.includes(domain);
}
