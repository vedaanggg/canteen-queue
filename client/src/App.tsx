import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import CartPage from './screens/CartPage';
import MenuPage from './screens/MenuPage';
import OrderStatusPage from './screens/OrderStatusPage';
import { CartProvider } from './state/CartContext';
import { CanteenDataProvider } from './state/CanteenDataContext';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">Canteen Queue · Step 1</span>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-lg text-slate-600">This is a placeholder for the {title.toLowerCase()} page. Its real screen will be built in a later step.</p>
    </main>
  );
}

function HealthStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    socket?.connect();
    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!apiUrl) {
      setStatus('offline');
      return;
    }
    const controller = new AbortController();
    fetch(`${apiUrl}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
      })
      .then(() => setStatus('online'))
      .catch(() => {
        if (!controller.signal.aborted) setStatus('offline');
      });
    return () => controller.abort();
  }, []);

  const label = status === 'checking' ? 'Checking server…' : status === 'online' ? 'Backend connected' : 'Backend unavailable';
  return <span className={`text-xs font-medium ${status === 'online' ? 'text-emerald-700' : status === 'offline' ? 'text-red-600' : 'text-slate-500'}`}>{label}</span>;
}

export default function App() {
  return (
    <CanteenDataProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </CanteenDataProvider>
  );
}

function AppShell() {
  const location = useLocation();
  const isDisplay = location.pathname === '/display';
  const lastOrderId = localStorage.getItem('canteen-queue-last-order-id');
  const pages = [
    { path: '/', label: 'Menu' }, { path: '/cart', label: 'Cart' },
    { path: lastOrderId ? `/order/${lastOrderId}` : '/order/placeholder', label: 'Order status' },
    { path: '/kitchen', label: 'Kitchen' }, { path: '/display', label: 'Display' }, { path: '/admin', label: 'Owner' },
  ];

  return (
    <div className="min-h-screen bg-orange-50/50">
      {!isDisplay && (
        <header className="border-b border-orange-100 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link className="text-lg font-extrabold text-slate-900" to="/">🍽️ Canteen Queue</Link>
            <nav aria-label="Temporary navigation" className="flex flex-wrap gap-2">
              {pages.map((page) => (
                <Link key={page.path} to={page.path} className="rounded-full border border-orange-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-canteen hover:text-orange-700">
                  {page.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/:id" element={<OrderStatusPage />} />
        <Route path="/kitchen" element={<PlaceholderPage title="Kitchen board" />} />
        <Route path="/display" element={<PlaceholderPage title="Now serving" />} />
        <Route path="/admin" element={<PlaceholderPage title="Menu manager" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
      {!isDisplay && <footer className="mx-auto flex max-w-6xl justify-center px-4 pb-6"><HealthStatus /></footer>}
    </div>
  );
}
