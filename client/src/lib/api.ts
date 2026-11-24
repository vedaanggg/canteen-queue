const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export interface HealthResponse { status: 'ok'; service: 'salon-api' }
export interface SalonService { id: number; nameEn: string; nameGu: string; durationMinutes: number; price: number }
export interface Barber { id: number; name: string; avatar: string; status: 'free' | 'busy' | 'on_break' }
export interface SalonStatus {
  isOpen: boolean; status: 'open' | 'closed'; openingTime: string; closingTime: string;
  onlineJoiningOpen: boolean; onlineJoiningEnabled: boolean; waitingCount: number;
  estimatedWaitMinutes: number; currentTime: string; timezone: string; override: 'open' | 'closed' | null;
}
export interface QueueEstimate { serviceIds: number[]; barber: string; totalMinutes: number; totalPrice: number; waitingCount: number; expectedWaitMinutes: number }
export type QueueSpotStatus = 'Waiting' | 'Called' | 'In chair' | 'Done' | 'No-show' | 'Cancelled';
export interface QueueSpot {
  id: string; token: string; tokenNumber: number; tokenDay: string; name: string; phone: string; barber: string;
  assignedBarber?: string | null; statusUpdatedAt?: string;
  status: QueueSpotStatus; services: Array<{ sourceServiceId: number; nameEn: string; nameGu: string; durationMinutes: number; price: number }>;
  totalMinutes: number; totalPrice: number; createdAt: string; previousDay: boolean; readOnly: boolean;
  position: number | null; waitingCount: number; expectedWaitMinutes: number | null; isBarberOnBreak: boolean;
}
export interface QueueSpotResponse { spot: QueueSpot; existing?: boolean; message?: string }
export interface ReceptionEntry extends QueueSpot {
  preferredBarber: string; waitingMinutes: number | null; minutesWaited: number; statusMinutes: number; canMarkNoShow: boolean;
  services: Array<QueueSpot['services'][number] & { quantity: number }>;
}
export interface ReceptionBarber {
  id: number; name: string; avatar: string; status: 'free' | 'busy' | 'on_break';
  currentCustomer: null | { id: number; token: string; name: string; status: string; totalMinutes: number; elapsedMinutes: number; assignedAt?: string };
}
export interface ReceptionData { date: string; barbers: ReceptionBarber[]; waitingList: ReceptionEntry[]; called: ReceptionEntry[]; inChair: ReceptionEntry[] }
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson('/api/health', signal);
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}${path}`, { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? `The salon server returned ${response.status}.`, response.status, payload.code);
  return payload as T;
}

async function requestJsonWithInit<T>(path: string, init: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error ?? `The salon server returned ${response.status}.`, response.status, payload.code);
  return payload as T;
}

async function staffRequest<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJsonWithInit<T>(path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

export const fetchSalonServices = (signal?: AbortSignal) => requestJson<{ services: SalonService[] }>('/api/services', signal);
export const fetchBarbers = (signal?: AbortSignal) => requestJson<{ barbers: Barber[] }>('/api/barbers', signal);
export const fetchSalonStatus = (signal?: AbortSignal) => requestJson<SalonStatus>('/api/status', signal);
export const fetchQueueEstimate = (serviceIds: number[], barber: string, signal?: AbortSignal) => {
  const query = new URLSearchParams({ serviceIds: serviceIds.join(','), barber });
  return requestJson<QueueEstimate>(`/api/queue/estimate?${query}`, signal);
};
export const createQueueSpot = (body: { name: string; phone: string; serviceIds: number[]; barber: string; requestId: string }) => requestJsonWithInit<QueueSpotResponse>('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const fetchQueueSpot = (id: string, signal?: AbortSignal) => requestJson<QueueSpotResponse>(`/api/queue/${encodeURIComponent(id)}`, signal);
export const cancelQueueSpot = (id: string) => requestJsonWithInit<QueueSpotResponse>(`/api/queue/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
export const staffLogin = (pin: string) => requestJsonWithInit<{ token: string }>('/api/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
export const staffLogout = (token: string) => staffRequest<{ loggedOut: boolean }>('/api/staff/logout', token, 'POST');
export const fetchReception = (token: string) => staffRequest<ReceptionData>('/api/reception', token);
export const createWalkIn = (token: string, body: { name: string; phone: string; serviceIds: number[]; barber: string; requestId: string }) => staffRequest<QueueSpotResponse>('/api/reception/walk-in', token, 'POST', body);
export const callNextCustomer = (token: string, barberId: number) => staffRequest<QueueSpotResponse>('/api/reception/call-next', token, 'POST', { barberId });
export const cancelWaitingCustomer = (token: string, id: string) => staffRequest<QueueSpotResponse>(`/api/reception/${encodeURIComponent(id)}/cancel`, token, 'POST');
export const markCustomerNoShow = (token: string, id: string) => staffRequest<QueueSpotResponse>(`/api/reception/${encodeURIComponent(id)}/no-show`, token, 'POST');
