export function isValidId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  return /^[a-zA-Z0-9_-]{20,36}$/.test(id);
}

export function isValidProductId(id: string): boolean {
  return isValidId(id);
}
