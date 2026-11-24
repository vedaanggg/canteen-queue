import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem } from '../lib/api';
import { useCanteenData } from './CanteenDataContext';

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

interface CartValue {
  lines: CartLine[];
  itemCount: number;
  total: number;
  notice: string | null;
  clearNotice: () => void;
  add: (item: MenuItem) => void;
  increment: (itemId: number) => void;
  decrement: (itemId: number) => void;
  remove: (itemId: number) => void;
  clear: () => void;
}

const storageKey = 'canteen-queue-cart-v1';
const CartContext = createContext<CartValue | null>(null);

function readSavedCart(): CartLine[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine => (
      typeof line?.item?.id === 'number'
      && typeof line?.item?.name === 'string'
      && typeof line?.item?.price === 'number'
      && Number.isInteger(line.quantity)
      && line.quantity > 0
      && line.quantity <= 10
    ));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { menuItems } = useCanteenData();
  const [lines, setLines] = useState<CartLine[]>(readSavedCart);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    if (!menuItems.length || !lines.length) return;
    const currentById = new Map(menuItems.map((item) => [item.id, item]));
    const removed: string[] = [];
    const refreshed = lines.flatMap((line) => {
      const current = currentById.get(line.item.id);
      if (!current || !current.isAvailable) {
        removed.push(line.item.name);
        return [];
      }
      return [{ item: current, quantity: line.quantity }];
    });
    if (removed.length) {
      setLines(refreshed);
      setNotice(`${removed.join(', ')} ${removed.length === 1 ? 'is' : 'are'} no longer available and ${removed.length === 1 ? 'was' : 'were'} removed from your cart.`);
    }
  }, [menuItems, lines]);

  const add = useCallback((item: MenuItem) => {
    setLines((current) => {
      const found = current.find((line) => line.item.id === item.id);
      if (found) return current.map((line) => line.item.id === item.id
        ? { item, quantity: Math.min(10, line.quantity + 1) }
        : line);
      return [...current, { item, quantity: 1 }];
    });
  }, []);

  const increment = useCallback((itemId: number) => {
    setLines((current) => current.map((line) => line.item.id === itemId
      ? { ...line, quantity: Math.min(10, line.quantity + 1) }
      : line));
  }, []);

  const decrement = useCallback((itemId: number) => {
    setLines((current) => current.flatMap((line) => {
      if (line.item.id !== itemId) return [line];
      return line.quantity <= 1 ? [] : [{ ...line, quantity: line.quantity - 1 }];
    }));
  }, []);

  const remove = useCallback((itemId: number) => {
    setLines((current) => current.filter((line) => line.item.id !== itemId));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const value = useMemo(() => ({
    lines, itemCount, total, notice,
    clearNotice: () => setNotice(null),
    add, increment, decrement, remove, clear,
  }), [lines, itemCount, total, notice, add, increment, decrement, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider.');
  return value;
}
