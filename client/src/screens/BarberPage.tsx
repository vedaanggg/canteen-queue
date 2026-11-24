import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, barberFinishCustomer, barberStartCustomer, fetchBarberView, setBarberBreak, staffLogin, staffLogout, type BarberView } from '../lib/api';
import { socket } from '../lib/socket';
import { useLanguage } from '../i18n/LanguageContext';

const tokenKey = 'salon-staff-token';

export default function BarberPage() {
  const { name = '' } = useParams();
  const { language, t } = useLanguage();
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) ?? '');
  const [data, setData] = useState<BarberView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(socket?.connected ?? false);
  const [loginError, setLoginError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setData(await fetchBarberView(token, name)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('actionError')); }
  }, [name, t, token]);

  useEffect(() => {
    void refresh();
    const liveSocket = socket; if (!liveSocket) return;
    const onUpdate = () => void refresh();
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    liveSocket.on('queue:updated', onUpdate); liveSocket.on('connect', onConnect); liveSocket.on('disconnect', onDisconnect);
    const timer = window.setInterval(() => { setNow(Date.now()); if (!liveSocket.connected) void refresh(); }, 5000);
    return () => { window.clearInterval(timer); liveSocket.off('queue:updated', onUpdate); liveSocket.off('connect', onConnect); liveSocket.off('disconnect', onDisconnect); };
  }, [refresh]);

  const current = data?.barber.currentCustomer ?? null;
  const elapsed = useMemo(() => {
    if (!current) return 0;
    const start = current.status === 'In chair' ? current.startedAt : current.statusUpdatedAt;
    return Math.max(0, Math.floor((now - new Date(start ?? Date.now()).getTime()) / 60000));
  }, [current, now]);
  const onUpdate = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('actionError')); await refresh(); }
    finally { setBusy(false); }
  };
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginError('');
    try { const result = await staffLogin(pin); sessionStorage.setItem(tokenKey, result.token); setToken(result.token); setPin(''); }
    catch (cause) {
      const code = cause instanceof ApiError ? cause.code : undefined;
      setLoginError(code === 'INVALID_STAFF_PIN' ? t('invalidPin') : code === 'STAFF_PIN_NOT_CONFIGURED' ? t('staffPinMissing') : code === 'API_URL_NOT_CONFIGURED' ? t('apiUrlMissing') : cause instanceof Error ? cause.message : t('staffLoginNetworkError'));
    }
  };
  const logout = async () => { try { if (token) await staffLogout(token); } catch { /* Local logout still clears this tab. */ } sessionStorage.removeItem(tokenKey); setToken(''); setData(null); };

  if (!token) return <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4"><form onSubmit={login} className="w-full rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl"><h1 className="text-2xl font-black">{t('barberTitle')}</h1><p className="mt-2 text-sm text-slate-300">{t('barberLoginHint')}</p><label className="mt-6 block text-sm font-bold" htmlFor="barber-pin">{t('staffPin')}</label><input id="barber-pin" type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 px-4 text-white"/><button className="mt-4 min-h-12 w-full rounded-xl bg-gold font-black text-charcoal">{t('staffLogin')}</button>{loginError && <p role="alert" className="mt-4 break-words text-sm font-semibold text-rose-300">{loginError}</p>}</form></main>;

  const unknown = Boolean(error?.includes('roster'));
  return <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
    <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-gold">{data?.barber.avatar} {data?.barber.name ?? decodeURIComponent(name)}</p><h1 className="text-3xl font-black">{t('barberTitle')}</h1></div><button onClick={() => void logout()} className="min-h-11 rounded-xl border border-white/15 px-4 font-bold">{t('staffLogout')}</button></div>
    {!connected && <p role="status" className="mb-4 text-sm font-semibold text-amber-200">{t('reconnecting')}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-950/60 p-4 text-rose-200">{unknown ? t('unknownBarber') : error}</p>}
    {!data && !error && <p role="status" className="animate-pulse text-slate-300">{t('loadingReception')}</p>}
    {data && <>
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{t('currentCustomerLabel')}</h2>
        {current ? <><p className="mt-3 text-5xl font-black text-gold">{current.token}</p><p className="mt-1 text-2xl font-extrabold">{current.name}</p><ul className="mt-3 space-y-1 text-slate-200">{current.services.map((service, index) => <li key={`${service.sourceServiceId}-${index}`}>{language === 'gu' ? service.nameGu : service.nameEn}</li>)}</ul>{current.status === 'In chair' && <p className="mt-4 text-lg font-bold text-slate-300">{t('serviceTimer')}: {elapsed} {t('minutes')}</p>}
          {current.status === 'Called' && <button disabled={busy} onClick={() => void onUpdate(() => barberStartCustomer(token, current.id, data.barber.id))} className="mt-6 min-h-16 w-full rounded-2xl bg-gold text-2xl font-black text-charcoal disabled:opacity-50">{t('startService')}</button>}
          {current.status === 'In chair' && <button disabled={busy} onClick={() => void onUpdate(() => barberFinishCustomer(token, current.id, data.barber.id))} className="mt-6 min-h-16 w-full rounded-2xl bg-gold text-2xl font-black text-charcoal disabled:opacity-50">{t('finishService')}</button>}
        </> : <p className="mt-4 text-lg text-slate-300">{t('noCurrentCustomer')}</p>}
      </section>
      <section className="mt-4 rounded-3xl border border-white/10 bg-slate-900 p-5"><h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{t('nextForYou')}</h2>{data.nextCustomer ? <p className="mt-3 text-lg font-bold"><span className="text-gold">{data.nextCustomer.token}</span> {data.nextCustomer.name} ({data.nextCustomer.services.map(service => language === 'gu' ? service.nameGu : service.nameEn).join(', ')})</p> : <p className="mt-3 text-slate-300">{t('noOneWaitingForYou')}</p>}</section>
      <button disabled={busy || Boolean(current)} onClick={() => void onUpdate(() => setBarberBreak(token, data.barber.id, data.barber.status !== 'on_break'))} className="mt-4 min-h-12 w-full rounded-xl border border-gold/60 bg-gold/10 font-extrabold text-gold disabled:opacity-50">{data.barber.status === 'on_break' ? t('available') : t('goOnBreak')}</button>
    </>}
  </main>;
}

