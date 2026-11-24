import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMenu, fetchOrderingStatus, type MenuItem, type OrderingStatus } from '../lib/api';
import { socket } from '../lib/socket';

interface CanteenDataValue {
  categories: string[];
  menuItems: MenuItem[];
  orderingStatus: OrderingStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CanteenDataContext = createContext<CanteenDataValue | null>(null);

export function CanteenDataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderingStatus, setOrderingStatus] = useState<OrderingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMenu = useCallback(async () => {
    const result = await fetchMenu();
    setCategories(result.categories);
    setMenuItems(result.items);
  }, []);

  const refreshStatus = useCallback(async () => {
    setOrderingStatus(await fetchOrderingStatus());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [menu, status] = await Promise.all([fetchMenu(), fetchOrderingStatus()]);
      setCategories(menu.categories);
      setMenuItems(menu.items);
      setOrderingStatus(status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load canteen information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const activeSocket = socket;
    if (!activeSocket) return;
    const onMenuUpdated = () => void refreshMenu().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Could not refresh the menu.');
    });
    activeSocket.on('menu:updated', onMenuUpdated);
    return () => {
      activeSocket.off('menu:updated', onMenuUpdated);
    };
  }, [refreshMenu]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  const value = useMemo(() => ({ categories, menuItems, orderingStatus, loading, error, refresh }), [
    categories, menuItems, orderingStatus, loading, error, refresh,
  ]);

  return <CanteenDataContext.Provider value={value}>{children}</CanteenDataContext.Provider>;
}

export function useCanteenData() {
  const value = useContext(CanteenDataContext);
  if (!value) throw new Error('useCanteenData must be used within CanteenDataProvider.');
  return value;
}
