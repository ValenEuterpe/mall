export function sanitizeCodePart(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10); // Limit length
}
