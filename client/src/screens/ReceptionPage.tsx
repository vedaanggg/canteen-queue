import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, callNextCustomer, cancelWaitingCustomer, createWalkIn, fetchBarbers, fetchReception, fetchSalonServices, markCustomerNoShow, staffLogin, staffLogout, type ReceptionData, type SalonService } from '../lib/api';
import { socket } from '../lib/socket';
import { useLanguage } from '../i18n/LanguageContext';

const TOKEN_KEY = 'salon-staff-token';
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const minutesSince = (timestamp: string, now: number) => Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 60_000));

export default function ReceptionPage() {
  const { language, t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<ReceptionData | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [barbers, setBarbers] = useState<Array<{ id: number; name: string; avatar: string; status: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInServices, setWalkInServices] = useState<number[]>([]);
  const [walkInBarber, setWalkInBarber] = useState('any');
  const [walkInError, setWalkInError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(Boolean(socket?.connected));

  const refresh = useCallback(async (showLoader = false) => {
    if (!token) return;
    if (showLoader) setLoading(true);
    try {
      const latest = await fetchReception(token);
      setData(latest); setError('');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY); setToken(''); setData(null);
        setLoginError(t('staffAccessError'));
      } else setError(cause instanceof Error ? cause.message : t('receptionLoadError'));
    } finally { if (showLoader) setLoading(false); }
  }, [token, t]);

  useEffect(() => {
    if (!token) { setData(null); return; }
    const controller = new AbortController();
    void refresh(true);
    Promise.all([fetchSalonServices(controller.signal), fetchBarbers(controller.signal)]).then(([serviceResult, barberResult]) => {
      setServices(serviceResult.services); setBarbers(barberResult.barbers);
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : t('receptionLoadError')); });
    return () => controller.abort();
  }, [token, refresh, t]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const liveSocket = socket;
    if (!liveSocket) { setConnected(false); return; }
    const onUpdate = () => { void refresh(); };
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    liveSocket.on('queue:updated', onUpdate);
    liveSocket.on('connect', onConnect); liveSocket.on('disconnect', onDisconnect);
    setConnected(liveSocket.connected);
    return () => { liveSocket.off('queue:updated', onUpdate); liveSocket.off('connect', onConnect); liveSocket.off('disconnect', onDisconnect); };
  }, [token, refresh]);

  useEffect(() => {
    if (!token || connected) return;
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [token, connected, refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError('');
    try {
      const result = await staffLogin(pin);
      sessionStorage.setItem(TOKEN_KEY, result.token); setToken(result.token); setPin('');
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      if (apiError?.code === 'INVALID_STAFF_PIN') setLoginError(t('invalidPin'));
      else if (apiError?.code === 'STAFF_PIN_NOT_CONFIGURED') setLoginError(t('staffPinMissing'));
      else if (apiError?.code === 'API_URL_NOT_CONFIGURED') setLoginError(t('apiUrlMissing'));
      else setLoginError(apiError?.message ?? t('staffLoginNetworkError'));
    }
  }

  async function logout() {
    if (token) { try { await staffLogout(token); } catch { /* clear local access even if offline */ } }
    sessionStorage.removeItem(TOKEN_KEY); setToken(''); setData(null); setError(''); setLoginError('');
  }

  async function action(key: string, run: () => Promise<unknown>) {
    setBusyAction(key); setError(''); setNotice('');
    try { await run(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('actionError')); await refresh(); }
    finally { setBusyAction(''); }
  }

  function toggleWalkInService(id: number) {
    setWalkInError('');
    if (walkInServices.includes(id)) setWalkInServices((selected) => selected.filter((item) => item !== id));
    else if (walkInServices.length >= 3) setWalkInError(t('maxThreeServices'));
    else setWalkInServices((selected) => [...selected, id]);
  }

  async function submitWalkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWalkInError(''); setNotice('');
    if (!walkInName.trim()) { setWalkInError(t('requiredName')); return; }
    if (!/^\d{10}$/.test(walkInPhone.trim())) { setWalkInError(t('invalidPhone')); return; }
    if (!walkInServices.length) { setWalkInError(t('selectOneService')); return; }
    setBusyAction('walk-in');
    try {
      const requestId = globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.random() * 16 | 0; return (char === 'x' ? random : (random & 3 | 8)).toString(16); });
      const result = await createWalkIn(token, { name: walkInName.trim(), phone: walkInPhone.trim(), serviceIds: walkInServices, barber: walkInBarber, requestId });
      if (result.existing) setNotice(result.message ?? t('alreadyInQueue'));
      else { setNotice(t('walkInAdded')); setWalkInName(''); setWalkInPhone(''); setWalkInServices([]); setWalkInBarber('any'); setShowWalkIn(false); }
      await refresh();
    } catch (cause) { setWalkInError(cause instanceof Error ? cause.message : t('actionError')); }
    finally { setBusyAction(''); }
  }

  if (!token) return <main className="mx-auto flex min-h-[65vh] max-w-md items-center justify-center px-4 py-10">
    <form onSubmit={login} className="w-full rounded-3xl border border-gold/30 bg-slate-900 p-6 shadow-2xl sm:p-8">
      <p aria-hidden="true" className="text-center text-4xl">🔐</p><h1 className="mt-3 text-center text-2xl font-black">{t('staffLogin')}</h1>
      <label className="mt-6 block text-sm font-bold text-slate-200">{t('staffPin')}<input type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="current-password" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-4 text-base text-white outline-none focus:border-gold focus:ring-4 focus:ring-gold/15" placeholder={t('staffPinPlaceholder')} /></label>
      {loginError && <p role="alert" className="mt-4 break-words rounded-xl bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200">{loginError}</p>}
      <button type="submit" className="mt-5 min-h-12 w-full rounded-xl bg-gold px-5 font-extrabold text-charcoal">{t('staffLogin')}</button>
    </form>
  </main>;

  const calledEntries = data?.called ?? [];
  const waitingEntries = data?.waitingList ?? [];
  return <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="break-words text-3xl font-black sm:text-4xl">{t('receptionDashboard')}</h1><p className="mt-1 text-sm text-slate-300">{data?.date ?? t('today')}</p></div><div className="flex gap-2"><button type="button" onClick={() => void refresh(true)} className="min-h-11 rounded-xl border border-white/15 px-4 font-bold">{t('refresh')}</button><button type="button" onClick={() => void logout()} className="min-h-11 rounded-xl bg-gold px-4 font-extrabold text-charcoal">{t('staffLogout')}</button></div></div>
    {!connected && <p role="status" className="mb-4 text-center text-sm font-semibold text-amber-200">{t('reconnecting')}</p>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200"><span className="break-words">{error}</span><button className="min-h-11 rounded-lg border border-rose-200/20 px-3 font-bold" onClick={() => void refresh(true)}>{t('retry')}</button></div>}
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">{notice}</p>}
    {loading && !data ? <p role="status" className="rounded-2xl bg-white/5 p-8 text-center font-semibold">{t('loadingReception')}</p> : data && <>
      <section aria-label={t('barber')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.barbers.length === 0 ? <p className="rounded-2xl bg-white/5 p-5 text-slate-300">{t('noDutyBarbers')}</p> : data.barbers.map((barber) => {
        const current = barber.currentCustomer;
        const active = current ? minutesSince(current.assignedAt ?? new Date(now).toISOString(), now) : 0;
        const isAvailable = barber.status === 'free' && !current;
        return <article key={barber.id} className="rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="text-3xl" aria-hidden="true">{barber.avatar}</span><div className="min-w-0"><h2 className="break-words text-lg font-extrabold">{barber.name}</h2><p className={`text-sm font-bold ${barber.status === 'free' ? 'text-emerald-300' : barber.status === 'on_break' ? 'text-amber-200' : 'text-slate-300'}`}>{barber.status === 'free' ? t('barberAvailable') : barber.status === 'on_break' ? t('onBreak') : t('barberBusy')}</p></div></div><button type="button" disabled={!isAvailable || busyAction === `call-${barber.id}`} onClick={() => void action(`call-${barber.id}`, async () => { await callNextCustomer(token, barber.id); })} className="min-h-11 shrink-0 rounded-xl bg-gold px-3 text-sm font-extrabold text-charcoal disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{busyAction === `call-${barber.id}` ? '…' : t('callNext')}</button></div>
          <div className="mt-4 border-t border-white/10 pt-3 text-sm">{current ? <><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('currentCustomer')}</p><p className="mt-1 break-words font-bold">{current.token} · {current.name}</p><p className="mt-1 text-slate-300">{current.status === 'Called' ? t('calledFor') : t('inChair')} {active} {t('minutes')}</p></> : <p className="text-slate-400">{t('noCurrentCustomer')}</p>}</div>
        </article>;
      })}</section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{t('waitingList')} <span className="text-gold">({waitingEntries.length})</span></h2><p className="mt-1 text-sm text-slate-400">{t('calledCustomers')}: {calledEntries.length}</p></div><button type="button" onClick={() => { setShowWalkIn((open) => !open); setWalkInError(''); }} className="min-h-12 rounded-xl bg-gold px-5 font-extrabold text-charcoal">{showWalkIn ? t('cancel') : `+ ${t('addWalkIn')}`}</button></div>
        {showWalkIn && <form onSubmit={submitWalkIn} className="mt-5 grid gap-4 rounded-2xl border border-gold/20 bg-slate-900 p-4 sm:p-5 lg:grid-cols-2">
          <label className="block text-sm font-bold text-slate-200">{t('walkInName')}<input value={walkInName} onChange={(event) => setWalkInName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-3 text-base" autoComplete="name" /></label>
          <label className="block text-sm font-bold text-slate-200">{t('walkInPhone')}<input value={walkInPhone} onChange={(event) => setWalkInPhone(event.target.value)} inputMode="numeric" maxLength={10} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-3 text-base" autoComplete="tel-national" /></label>
          <fieldset className="lg:col-span-2"><legend className="text-sm font-bold text-slate-200">{t('chooseServices')} · {walkInServices.length}/3</legend><div className="mt-2 flex flex-wrap gap-2">{services.map((service) => <button key={service.id} type="button" aria-pressed={walkInServices.includes(service.id)} onClick={() => toggleWalkInService(service.id)} className={`min-h-11 max-w-full break-words rounded-xl border px-3 py-2 text-sm font-bold ${walkInServices.includes(service.id) ? 'border-gold bg-gold/10 text-gold' : 'border-white/15 text-slate-200'}`}>{language === 'gu' ? service.nameGu : service.nameEn} · {service.durationMinutes} {t('minutes')} · {money(service.price)}</button>)}</div></fieldset>
          <label className="block text-sm font-bold text-slate-200">{t('walkInBarber')}<select value={walkInBarber} onChange={(event) => setWalkInBarber(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-3 text-base"><option value="any">{t('anyBarber')}</option>{barbers.map((barber) => <option key={barber.id} value={barber.name}>{barber.avatar} {barber.name} · {barber.status === 'on_break' ? t('onBreak') : t(barber.status === 'free' ? 'barberAvailable' : 'barberBusy')}</option>)}</select></label>
          <div className="flex items-end"><button type="submit" disabled={busyAction === 'walk-in'} className="min-h-12 w-full rounded-xl bg-gold px-5 font-extrabold text-charcoal disabled:opacity-60">{busyAction === 'walk-in' ? '…' : t('saveWalkIn')}</button></div>
          {walkInError && <p role="alert" className="break-words rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-200 lg:col-span-2">{walkInError}</p>}
        </form>}

        {waitingEntries.length === 0 && calledEntries.length === 0 && (data.inChair.length === 0) ? <p className="mt-5 rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-slate-300">{t('noWaiting')}</p> : <div className="mt-4 space-y-3">
          {waitingEntries.map((entry) => <article key={entry.id} className={`grid gap-3 rounded-2xl border bg-slate-900 p-4 sm:grid-cols-[1fr_auto] sm:items-center ${minutesSince(entry.createdAt, now) > 60 ? 'border-amber-400/80' : 'border-white/10'}`}><EntryDetails entry={entry} language={language} now={now} t={t}/><div className="flex flex-wrap gap-2"><button type="button" disabled={busyAction === `cancel-${entry.id}`} onClick={() => { if (window.confirm(t('cancelCustomerConfirm'))) void action(`cancel-${entry.id}`, async () => { await cancelWaitingCustomer(token, entry.id); }); }} className="min-h-11 rounded-xl border border-rose-300/30 px-4 font-bold text-rose-200 disabled:opacity-50">{t('cancelCustomer')}</button></div></article>)}
          {calledEntries.map((entry) => { const calledMinutes = minutesSince(entry.statusUpdatedAt ?? entry.createdAt, now); return <article key={entry.id} className="grid gap-3 rounded-2xl border border-gold/30 bg-slate-900 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><EntryDetails entry={entry} language={language} now={now} t={t}/><button type="button" disabled={calledMinutes < 10 || busyAction === `no-show-${entry.id}`} onClick={() => { if (window.confirm(t('noShowConfirm'))) void action(`no-show-${entry.id}`, async () => { await markCustomerNoShow(token, entry.id); }); }} className="min-h-11 rounded-xl bg-amber-300 px-4 font-extrabold text-charcoal disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{t('noShowAction')} · {calledMinutes}/10</button></article>; })}
          {data.inChair.map((entry) => <article key={entry.id} className="rounded-2xl border border-emerald-300/20 bg-slate-900 p-4"><EntryDetails entry={entry} language={language} now={now} t={t}/></article>)}
        </div>}
      </section>
    </>}
  </main>;
}

function EntryDetails({ entry, language, now, t }: { entry: ReceptionData['waitingList'][number]; language: string; now: number; t: (key: any) => string }) {
  const minutes = minutesSince(entry.createdAt, now);
  return <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><strong className="text-xl text-gold">{entry.token}</strong><span className="break-words font-extrabold">{entry.name}</span><span className="text-sm text-slate-300">{entry.phone}</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold">{t(entry.status === 'Waiting' ? 'waiting' : entry.status === 'Called' ? 'calledStatus' : 'inChairStatus')}</span></div><p className="mt-2 break-words text-sm text-slate-200">{entry.services.map((service) => `${language === 'gu' ? service.nameGu : service.nameEn} ×${service.quantity}`).join(' · ')}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>{t('preferredBarber')}: {entry.preferredBarber.toLowerCase() === 'any' ? t('anyBarberStatus') : entry.preferredBarber}</span>{entry.status === 'Waiting' ? <span>{minutes} {t('minutesWaited')}</span> : <span>{minutesSince(entry.statusUpdatedAt ?? entry.createdAt, now)} {t('minutes')}</span>}<span>~{entry.expectedWaitMinutes ?? 0} {t('minutes')}</span></div></div>;
}
