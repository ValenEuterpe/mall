"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import type { CartItem, CartProduct, CartState } from "@/lib/cart/types";
import { clearCartStorage, loadCartFromStorage, saveCartToStorage } from "@/lib/cart/storage";

interface CartContextValue {
  items: CartItem[];
  isHydrated: boolean;
  itemCount: number;
  totalQuantity: number;
  totalPrice: number;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItem: (productId: string) => CartItem | undefined;
  getItemsByShop: () => Map<string, CartItem[]>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
CartContext.displayName = "CartContext";

export interface CartProviderProps {
  children: ReactNode;
  /** Current authenticated user ID — cart is keyed per user */
  userId?: string;
}

export function CartProvider({ children, userId }: CartProviderProps): React.ReactElement {
  const [state, setState] = useState<CartState>({
    items: [],
    isHydrated: false,
  });

  // Track previous userId to detect login/logout transitions
  const prevUserIdRef = React.useRef<string | undefined>(userId);

  // Load cart from storage on mount and when userId changes
  useEffect(() => {
    const storedItems = loadCartFromStorage(userId);
    setState({
      items: storedItems,
      isHydrated: true,
    });
    prevUserIdRef.current = userId;
  }, [userId]);

  // Persist cart to storage when items change
  useEffect(() => {
    if (state.isHydrated) saveCartToStorage(state.items, userId);
  }, [state.items, state.isHydrated, userId]);

  const addItem = useCallback((product: CartProduct, quantity: number = 1): void => {
    if (quantity < 1) {
      console.warn("[Cart] Cannot add item with quantity less than 1");
      return;
    }

    setState((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.id === product.id);

      if (existingIndex !== -1) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity,
        };
        return { ...prev, items: updatedItems };
      }

      const newItem: CartItem = {
        ...product,
        quantity,
        addedAt: Date.now(),
      };

      return { ...prev, items: [...prev.items, newItem] };
    });
  }, []);

  const removeItem = useCallback((productId: string): void => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== productId),
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number): void => {
    if (quantity < 0) {
      console.warn("[Cart] Cannot set quantity less than 0");
      return;
    }

    setState((prev) => {
      if (quantity === 0) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== productId),
        };
      }

      return {
        ...prev,
        items: prev.items.map((item) => (item.id === productId ? { ...item, quantity } : item)),
      };
    });
  }, []);

  const incrementQuantity = useCallback((productId: string): void => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      ),
    }));
  }, []);

  const decrementQuantity = useCallback((productId: string): void => {
    setState((prev) => ({
      ...prev,
      items: prev.items
        .map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    }));
  }, []);

  const clearCart = useCallback((): void => {
    setState((prev) => ({ ...prev, items: [] }));
    clearCartStorage(userId);
  }, [userId]);

  const isInCart = useCallback(
    (productId: string): boolean => state.items.some((item) => item.id === productId),
    [state.items]
  );

  const getItem = useCallback(
    (productId: string): CartItem | undefined => state.items.find((item) => item.id === productId),
    [state.items]
  );

  const getItemsByShop = useCallback((): Map<string, CartItem[]> => {
    const shopMap = new Map<string, CartItem[]>();

    state.items.forEach((item) => {
      const shopItems = shopMap.get(item.shopId) ?? [];
      shopItems.push(item);
      shopMap.set(item.shopId, shopItems);
    });

    return shopMap;
  }, [state.items]);

  const itemCount = useMemo(() => state.items.length, [state.items]);

  const totalQuantity = useMemo(
    () => state.items.reduce((total, item) => total + item.quantity, 0),
    [state.items]
  );

  const totalPrice = useMemo(
    () => state.items.reduce((total, item) => total + item.price * item.quantity, 0),
    [state.items]
  );

  const contextValue = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      isHydrated: state.isHydrated,
      itemCount,
      totalQuantity,
      totalPrice,
      addItem,
      removeItem,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      clearCart,
      isInCart,
      getItem,
      getItemsByShop,
    }),
    [
      state.items,
      state.isHydrated,
      itemCount,
      totalQuantity,
      totalPrice,
      addItem,
      removeItem,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      clearCart,
      isInCart,
      getItem,
      getItemsByShop,
    ]
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}

export function useIsInCart(productId: string): boolean {
  return useCart().isInCart(productId);
}

export function useCartTotals(): { itemCount: number; totalQuantity: number; totalPrice: number } {
  const { itemCount, totalQuantity, totalPrice } = useCart();
  return { itemCount, totalQuantity, totalPrice };
}

/**
 * Cart provider that reads the current user ID from AuthProvider.
 * Must be rendered inside AuthProvider.
 */
export function AuthAwareCartProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user } = useAuth();
  return <CartProvider userId={user?.id}>{children}</CartProvider>;
}
