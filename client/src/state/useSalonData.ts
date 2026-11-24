import { useCallback, useEffect, useState } from 'react';
import { fetchBarbers, fetchSalonServices, fetchSalonStatus, type Barber, type SalonService, type SalonStatus } from '../lib/api';

export function useSalonData() {
  const [services, setServices] = useState<SalonService[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [status, setStatus] = useState<SalonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { services, barbers, status, loading, error, refresh };
}
