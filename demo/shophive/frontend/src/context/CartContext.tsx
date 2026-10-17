/**
 * CartContext
 *
 * React Context providing shopping cart state management for the ShopHive demo.
 * Provides add, remove, update quantity, clear, and computed totals.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

/** A single item in the shopping cart. */
export interface CartItem {
  id?: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  size?: number;
  selectedSize: number;
  quantity: number;
  /** CSS gradient or image URL */
  image?: string;
  gradient?: string;
  emoji?: string;
}


/** Shape of the cart context value. */
interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, size: number) => void;
  updateQuantity: (productId: string, size: number, quantity: number) => void;
  clearCart: () => void;
  /** Total number of items in the cart */
  cartCount: number;
  /** Sum of (price × quantity) for all items */
  cartTotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

/** Provider component that wraps the app and supplies cart state. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    const pId = newItem.productId || newItem.id || '';
    const sz = newItem.selectedSize ?? newItem.size ?? 10;
    const itemToAdd: CartItem = {
      ...newItem,
      id: pId,
      productId: pId,
      selectedSize: sz,
      size: sz,
      quantity: 1,
      gradient: newItem.gradient || newItem.image,
    };

    setItems((prev) => {
      const existing = prev.find(
        (i) => (i.productId === pId || i.id === pId) && (i.selectedSize === sz || i.size === sz),
      );
      if (existing) {
        // Increment quantity, max 5 per item
        return prev.map((i) =>
          (i.productId === pId || i.id === pId) && (i.selectedSize === sz || i.size === sz)
            ? { ...i, quantity: Math.min(i.quantity + 1, 5) }
            : i,
        );
      }
      return [...prev, itemToAdd];
    });
  }, []);

  const removeItem = useCallback((productId: string, size: number) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          !((i.productId === productId || i.id === productId) &&
            (i.selectedSize === size || i.size === size)),
      ),
    );
  }, []);

  const updateQuantity = useCallback((productId: string, size: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter(
          (i) =>
            !((i.productId === productId || i.id === productId) &&
              (i.selectedSize === size || i.size === size)),
        ),
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        (i.productId === productId || i.id === productId) &&
        (i.selectedSize === size || i.size === size)
          ? { ...i, quantity: Math.min(quantity, 5) }
          : i,
      ),
    );
  }, []);


  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const cartTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, cartCount, cartTotal }),
    [items, addItem, removeItem, updateQuantity, clearCart, cartCount, cartTotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Hook to access cart state from any component.
 * Must be used within a CartProvider.
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a <CartProvider>');
  }
  return ctx;
}
