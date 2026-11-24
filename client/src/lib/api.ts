export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  emoji: string;
  isVegetarian: boolean;
  isAvailable: boolean;
}

export interface OrderingStatus {
  isOpen: boolean;
  status: 'open' | 'closed';
  openingTime: string;
  orderingCutoff: string;
  canteenClosingTime: string;
  currentTime: string;
  timezone: string;
  override: 'open' | 'closed' | null;
}

export interface OrderItem { menuItemId: number | null; itemName: string; unitPrice: number; quantity: number; lineTotal: number }
export interface Order {
  id: string; requestId: string; tokenNumber: number; serviceDay: string; studentName: string; rollNumber: string;
  status: 'Placed' | 'Preparing' | 'Ready' | 'Collected' | 'Cancelled'; total: number; createdAt: string; updatedAt: string;
  items: OrderItem[]; ordersAhead: number | null; isPreviousDay: boolean; readOnly: boolean;
}
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? `The canteen server returned ${response.status}. Please try again.`, response.status, payload.code);
  return payload as T;
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? `The canteen server returned ${response.status}. Please try again.`, response.status, payload.code);
  return payload as T;
}

export const submitOrder = (body: { requestId: string; studentName: string; rollNumber: string; items: { id: number; quantity: number }[] }) => sendJson<{ order: Order; duplicate: boolean }>('/api/orders', 'POST', body);
export const fetchOrder = (id: string) => getJson<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`);
export const cancelOrder = (id: string) => sendJson<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/cancel`, 'POST');
export const fetchKitchenOrders = () => getJson<{ orders: Order[] }>('/api/kitchen');
export const updateOrderStatus = (id: string, status: 'Preparing' | 'Ready' | 'Collected') => sendJson<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/status`, 'POST', { status });

export function fetchMenu() {
  return getJson<{ categories: string[]; items: MenuItem[] }>('/api/menu');
}

export function fetchOrderingStatus() {
  return getJson<OrderingStatus>('/api/status');
}
