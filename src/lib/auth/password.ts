//src\lib\auth\password.ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Hash password with bcrypt

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

//Verify password against hash
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Check if password meets requirements

export function isPasswordStrong(password: string): boolean {
  const minLength = 8;
  const requirements = {
    length: password.length >= minLength,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  return Object.values(requirements).every(Boolean);
}
