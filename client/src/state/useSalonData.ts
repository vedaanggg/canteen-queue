import { useCallback, useEffect, useState } from 'react';
import { fetchBarbers, fetchSalonServices, fetchSalonStatus, type Barber, type SalonService, type SalonStatus } from '../lib/api';
import { socket } from '../lib/socket';

export function useSalonData() {
  const [services, setServices] = useState<SalonService[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [status, setStatus] = useState<SalonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket?.connected ?? false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const [serviceResult, barberResult, statusResult] = await Promise.all([
        fetchSalonServices(signal), fetchBarbers(signal), fetchSalonStatus(signal),
      ]);
      setServices(serviceResult.services); setBarbers(barberResult.barbers); setStatus(statusResult);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'Could not load salon information.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController(); void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { void fetchSalonStatus().then(setStatus).catch(() => undefined); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const live = socket; if (!live) { setConnected(false); return; }
    const refreshCatalog = () => void refresh();
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    live.on('salon:updated', refreshCatalog); live.on('connect', onConnect); live.on('disconnect', onDisconnect);
    setConnected(live.connected);
    return () => { live.off('salon:updated', refreshCatalog); live.off('connect', onConnect); live.off('disconnect', onDisconnect); };
  }, [refresh]);
  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);

  return { services, barbers, status, loading, error, connected, refresh };
}
