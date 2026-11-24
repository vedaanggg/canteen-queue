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

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new Error(`The canteen server returned ${response.status}. Please try again.`);
  return response.json() as Promise<T>;
}

export function fetchMenu() {
  return getJson<{ categories: string[]; items: MenuItem[] }>('/api/menu');
}

export function fetchOrderingStatus() {
  return getJson<OrderingStatus>('/api/status');
}
