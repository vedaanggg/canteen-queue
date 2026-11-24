import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelQueueSpot, fetchQueueSpot, type QueueSpot } from '../lib/api';
import { socket } from '../lib/socket';
import { useLanguage } from '../i18n/LanguageContext';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
export default function MyStatusPage() {
  const { id = '' } = useParams();
  const { language, t } = useLanguage();
  const [spot, setSpot] = useState<QueueSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  const [cancelling, setCancelling] = useState(false);
  const calledVibrationSent = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchQueueSpot(id, signal);
      setSpot(result.spot); setError('');
      localStorage.setItem('salon-last-spot-id', result.spot.id);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : t('spotError'));
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [id, t]);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const liveSocket = socket;
    if (!liveSocket) { setConnected(false); return; }
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    // Any join/cancel can move this spot's position or estimate, even when its own id did not change.
    const onUpdate = () => { void refresh(); };
    liveSocket.on('connect', onConnect); liveSocket.on('disconnect', onDisconnect); liveSocket.on('queue:updated', onUpdate);
    setConnected(liveSocket.connected);
    if (liveSocket.connected) void refresh();
    return () => { liveSocket.off('connect', onConnect); liveSocket.off('disconnect', onDisconnect); liveSocket.off('queue:updated', onUpdate); };
  }, [id, refresh]);

  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);

  useEffect(() => {
    if (spot?.status === 'Called' && !calledVibrationSent.current) {
      calledVibrationSent.current = true;
      try { navigator.vibrate?.([180, 100, 180]); } catch { /* vibration is best-effort */ }
    }
  }, [spot?.status]);

  async function cancel() {
    if (!window.confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try { const result = await cancelQueueSpot(id); setSpot(result.spot); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('spotError')); await refresh(); }
    finally { setCancelling(false); }
  }

  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-4"><p role="status" className="animate-pulse text-lg font-semibold">{t('loadingSpot')}</p></main>;
  if (!spot) return <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><h1 className="text-3xl font-black">{error.includes('not found') || error.includes('મળી નથી') ? t('spotNotFound') : t('spotError')}</h1><p role="alert" className="mt-3 break-words text-slate-300">{error}</p><button onClick={() => void refresh()} className="mt-5 min-h-11 rounded-xl bg-gold px-5 font-bold text-charcoal">{t('retrySpot')}</button></main>;

  if (spot.status === 'Called') return <main className="relative flex min-h-[calc(100vh-130px)] flex-col items-center justify-center overflow-hidden bg-gold px-5 py-10 text-center text-charcoal"><div className="absolute inset-0 animate-pulse bg-amber-300/40"/>{!connected && <p role="status" className="absolute left-4 right-4 top-4 z-20 rounded-xl bg-charcoal/90 px-4 py-3 text-sm font-bold text-amber-100">{t('reconnecting')}</p>}{spot.previousDay && <p role="status" className="absolute left-4 right-4 top-16 z-20 rounded-xl bg-charcoal/90 px-4 py-3 text-sm font-bold text-amber-100">{t('previousDay')}</p>}<section className="relative z-10 max-w-xl"><p className="text-sm font-black uppercase tracking-[0.25em]">{spot.token}</p><h1 className="mt-5 break-words text-5xl font-black leading-tight sm:text-7xl">{t('called')}</h1><p className="mt-4 break-words text-2xl font-extrabold">{t('goToBarber')} {spot.assignedBarber ?? (spot.barber.toLowerCase() === 'any' ? t('anyBarberStatus') : spot.barber)}</p></section></main>;

  const wait = spot.expectedWaitMinutes ?? 0;
  const statusMessage = spot.status === 'In chair' ? <p className="text-lg font-bold">{t('inChair')} {spot.assignedBarber ?? (spot.barber.toLowerCase() === 'any' ? t('anyBarberStatus') : spot.barber)}</p>
    : spot.status === 'Done' ? <p className="text-lg font-bold">{t('done')}</p>
    : spot.status === 'No-show' ? <div><p className="text-lg font-bold">{t('noShow')}</p><Link to="/join" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gold px-5 font-extrabold text-charcoal">{t('joinAgain')}</Link></div>
    : spot.status === 'Cancelled' ? <p className="text-lg font-bold">{t('cancelled')}</p> : null;

  return <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-9">
    {spot.previousDay && <div role="status" className="mb-5 break-words rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3 font-semibold text-amber-100">{t('previousDay')}</div>}
    {!connected && <p role="status" className="mb-4 text-center text-sm font-semibold text-amber-200">{t('reconnecting')}</p>}
    {error && <p role="alert" className="mb-4 break-words rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    <section className={`rounded-[2rem] border ${spot.status === 'Waiting' ? 'border-gold/30' : 'border-white/10'} bg-slate-900 p-5 text-center shadow-2xl sm:p-8`}>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">{t('yourToken')}</p>
      <p className="mt-2 break-all text-6xl font-black tracking-tight text-gold sm:text-8xl">{spot.token}</p>
      {spot.status === 'Waiting' && <div className="mx-auto mt-7 flex h-44 w-44 items-center justify-center rounded-full border-[10px] border-gold/20 bg-gold/5 shadow-[inset_0_0_30px_rgba(212,160,23,0.08)]"><div><p className="text-4xl font-black text-white">{wait}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{t('minutes')}</p></div></div>}
      {spot.status === 'Waiting' && <div className="mt-5"><p className="text-xl font-extrabold">{spot.position ? `${spot.position}${language === 'en' ? ordinalSuffix(spot.position) : ''} ${t('position')}` : t('youreNext')}</p><p className="mt-2 text-slate-300">{wait === 0 ? t('youreNext') : `${t('estimatedWaitLabelStatus')}: ~${wait} ${t('minutes')}`}</p></div>}
      {spot.status === 'Waiting' && spot.position !== null && spot.position <= 2 && !spot.previousDay && <p className="mt-5 rounded-2xl bg-gold px-4 py-3 text-lg font-black text-charcoal">{t('startComing')}</p>}
      {statusMessage && <div className="mt-6">{statusMessage}</div>}
      {spot.isBarberOnBreak && <p className="mt-5 rounded-xl bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-100">{spot.barber} {t('barberOnBreak')}</p>}
      {spot.isBarberUnavailable && <p className="mt-5 rounded-xl bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-100">{spot.barber} {t('barberNotAvailableToday')}</p>}
      <div className="mt-7 border-t border-white/10 pt-5 text-left">
        <h2 className="text-lg font-extrabold">{t('yourDetails')}</h2><p className="mt-2 break-words text-slate-200">{spot.name}</p>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm"><span className="text-slate-400">{t('preferredBarber')}</span><span className="break-words font-bold">{spot.barber.toLowerCase() === 'any' ? t('anyBarberStatus') : spot.barber}</span></div>
        <div className="mt-3"><p className="text-sm text-slate-400">{t('chosenServices')}</p><ul className="mt-2 space-y-2">{spot.services.map((service) => <li key={`${service.sourceServiceId}-${service.nameEn}`} className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{language === 'gu' ? service.nameGu : service.nameEn}</span><span className="shrink-0 text-slate-300">{service.durationMinutes} {t('minutes')} · {money(service.price)}</span></li>)}</ul></div>
      </div>
      {spot.status === 'Waiting' && !spot.readOnly && <button type="button" disabled={cancelling} onClick={() => void cancel()} className="mt-6 min-h-12 w-full rounded-xl border border-rose-300/30 px-4 font-extrabold text-rose-200 disabled:opacity-50">{cancelling ? t('joining') : t('cancelSpot')}</button>}
      <p className="mt-4 text-xs text-slate-400">{spot.totalMinutes} {t('minutes')} · {money(spot.totalPrice)}</p>
    </section>
  </main>;
}

function ordinalSuffix(value: number) { const teen = value % 100; if (teen >= 11 && teen <= 13) return 'th'; return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'; }
