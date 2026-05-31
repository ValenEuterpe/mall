import type { CartItem } from "./types";

const CART_STORAGE_PREFIX = "shopping_cart_" as const;
const CART_VERSION = 1 as const;

interface StoredCart {
  version: number;
  items: CartItem[];
  updatedAt: number;
}

const isClient = typeof window !== "undefined";

function getStorageKey(userId: string | undefined): string | null {
  return userId ? `${CART_STORAGE_PREFIX}${userId}` : null;
}

export function loadCartFromStorage(userId: string | undefined): CartItem[] {
  if (!isClient) return [];

  const key = getStorageKey(userId);
  if (!key) return [];

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const parsed: StoredCart = JSON.parse(stored) as StoredCart;

    if (parsed.version !== CART_VERSION) {
      console.warn("[Cart] Storage version mismatch, clearing cart");
      localStorage.removeItem(key);
      return [];
    }

    if (!Array.isArray(parsed.items)) {
      console.warn("[Cart] Invalid cart structure, clearing cart");
      localStorage.removeItem(key);
      return [];
    }

    return parsed.items;
  } catch (error) {
    console.error("[Cart] Failed to load cart from storage:", error);
    localStorage.removeItem(key);
    return [];
  }
}

export function saveCartToStorage(
  items: CartItem[],
  userId: string | undefined
): void {
  if (!isClient) return;

  const key = getStorageKey(userId);
  if (!key) return;

  try {
    const data: StoredCart = {
      version: CART_VERSION,
      items,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("[Cart] Failed to save cart to storage:", error);
  }
}

export function clearCartStorage(userId: string | undefined): void {
  if (!isClient) return;

  const key = getStorageKey(userId);
  if (!key) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("[Cart] Failed to clear cart storage:", error);
  }
}
