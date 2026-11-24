const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export interface HealthResponse { status: 'ok'; service: 'salon-api' }

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  if (!apiUrl) throw new Error('The API URL is not configured. Set VITE_API_URL and restart the frontend.');
  const response = await fetch(`${apiUrl}/api/health`, { signal });
  if (!response.ok) throw new Error(`The salon server returned ${response.status}.`);
  return response.json() as Promise<HealthResponse>;
}
