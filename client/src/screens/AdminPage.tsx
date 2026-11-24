import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, createAdminService, fetchAdminSettings, setAdminBarberDuty, setAdminQueueOpen, staffLogin, staffLogout, toggleAdminService, updateAdminService, type AdminServiceInput, type AdminSettings } from '../lib/api';
import { socket } from '../lib/socket';
import { useLanguage } from '../i18n/LanguageContext';

const tokenKey = 'salon-staff-token';
type Draft = { id?: number; nameEn: string; nameGu: string; durationMinutes: string; price: string; isOn: boolean };
const blankDraft = (): Draft => ({ nameEn: '', nameGu: '', durationMinutes: '30', price: '150', isOn: true });

export default function AdminPage() {
  const { t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) ?? '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket?.connected ?? false);
  const [busy, setBusy] = useState('');
  const [panel, setPanel] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (showLoader = false) => {
    if (!token) return;
    if (showLoader) setLoading(true);
    try { setData(await fetchAdminSettings(token)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('adminLoadError')); }
    finally { setLoading(false); }
  }, [t, token]);

  useEffect(() => { if (token) void refresh(true); }, [refresh, token]);
  useEffect(() => {
    if (!token) return;
    const live = socket; if (!live) { setConnected(false); return; }
    const update = () => void refresh();
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    live.on('salon:updated', update); live.on('connect', onConnect); live.on('disconnect', onDisconnect);
    setConnected(live.connected);
    return () => { live.off('salon:updated', update); live.off('connect', onConnect); live.off('disconnect', onDisconnect); };
  }, [refresh, token]);
  useEffect(() => {
    if (!token || connected) return;
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(poll);
  }, [connected, refresh, token]);

  const apiMessage = (cause: unknown) => {
    if (!(cause instanceof ApiError)) return cause instanceof Error ? cause.message : t('actionError');
    const key = ({ INVALID_SERVICE_NAME_EN: 'serviceNameRequired', INVALID_SERVICE_NAME_GU: 'serviceNameRequired', SERVICE_NAME_TOO_LONG: 'serviceNameTooLong', INVALID_SERVICE_DURATION: 'serviceDurationRange', INVALID_SERVICE_PRICE: 'servicePriceRange', DUPLICATE_SERVICE_NAME: 'duplicateServiceName', BARBER_HAS_ACTIVE_CUSTOMER: 'barberBusyOffDuty' } as Record<string, keyof typeof import('../i18n/translations').translations.en>)[cause.code ?? ''];
    return key ? t(key) : cause.message;
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoginError('');
    try { const result = await staffLogin(pin); sessionStorage.setItem(tokenKey, result.token); setToken(result.token); setPin(''); }
    catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      if (apiError?.code === 'INVALID_STAFF_PIN') setLoginError(t('invalidPin'));
      else if (apiError?.code === 'STAFF_PIN_NOT_CONFIGURED') setLoginError(t('staffPinMissing'));
      else if (apiError?.code === 'API_URL_NOT_CONFIGURED') setLoginError(t('apiUrlMissing'));
      else setLoginError(apiError?.message ?? t('staffLoginNetworkError'));
    }
  };
  const logout = async () => { try { if (token) await staffLogout(token); } catch { /* Clear this tab's session even while offline. */ } sessionStorage.removeItem(tokenKey); setToken(''); setData(null); };
  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key); setError(''); setNotice('');
    try { await action(); await refresh(); }
    catch (cause) { setError(apiMessage(cause)); await refresh(); }
    finally { setBusy(''); }
  };
  const openAdd = () => { setDraft(blankDraft()); setFormError(''); setPanel(true); };
  const openEdit = (service: AdminSettings['services'][number]) => { setDraft({ id: service.id, nameEn: service.nameEn, nameGu: service.nameGu, durationMinutes: String(service.durationMinutes), price: String(service.price), isOn: service.isOn }); setFormError(''); setPanel(true); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');
    if (!draft.nameEn.trim() || !draft.nameGu.trim()) { setFormError(t('serviceNameRequired')); return; }
    if (draft.nameEn.trim().length > 50 || draft.nameGu.trim().length > 50) { setFormError(t('serviceNameTooLong')); return; }
    const minutes = Number(draft.durationMinutes); const price = Number(draft.price);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 180) { setFormError(t('serviceDurationRange')); return; }
    if (!Number.isInteger(price) || price < 1 || price > 9999) { setFormError(t('servicePriceRange')); return; }
    const input: AdminServiceInput = { nameEn: draft.nameEn.trim(), nameGu: draft.nameGu.trim(), durationMinutes: minutes, price, isOn: draft.isOn };
    setBusy('save-service');
    try {
      if (draft.id) await updateAdminService(token, draft.id, input); else await createAdminService(token, input);
      setNotice(t(draft.id ? 'serviceSaved' : 'serviceAdded')); setPanel(false); await refresh();
    } catch (cause) { setFormError(apiMessage(cause)); }
    finally { setBusy(''); }
  };

  if (!token) return <main className="mx-auto flex min-h-[65vh] max-w-md items-center justify-center px-4 py-10"><form onSubmit={login} className="w-full rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl"><h1 className="text-2xl font-black">{t('staffLogin')}</h1><p className="mt-2 text-sm text-slate-300">{t('adminLoginHint')}</p><label htmlFor="admin-pin" className="mt-6 block text-sm font-bold">{t('staffPin')}</label><input id="admin-pin" type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-4 text-white"/><button className="mt-4 min-h-12 w-full rounded-xl bg-gold font-black text-charcoal">{t('staffLogin')}</button>{loginError && <p role="alert" className="mt-4 break-words text-sm font-semibold text-rose-300">{loginError}</p>}</form></main>;

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-gold">{t('brand')}</p><h1 className="text-3xl font-black sm:text-4xl">{t('adminTitle')}</h1>{data && <p className="mt-1 text-sm text-slate-400">{data.date}</p>}</div><button type="button" onClick={() => void logout()} className="min-h-11 rounded-xl border border-white/15 px-4 font-bold">{t('staffLogout')}</button></header>
    {!connected && <p role="status" className="mb-4 rounded-xl bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-100">{t('reconnecting')}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-200/10 px-4 py-3 text-emerald-100">{notice}</p>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-950/60 px-4 py-3 text-rose-200"><span>{error}</span><button type="button" onClick={() => void refresh(true)} className="min-h-11 rounded-lg border border-rose-200/30 px-4 font-bold">{t('retry')}</button></div>}
    {loading && !data && <p role="status" className="animate-pulse text-slate-300">{t('adminLoading')}</p>}
    {data && <>
      <section aria-label={t('adminStats')} className="mb-6 grid gap-3 sm:grid-cols-3">{[[t('customersServed'), data.stats.served], [t('averageWaitToday'), `${data.stats.averageWaitMinutes} ${t('minutes')}`], [t('noShowsToday'), data.stats.noShows]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><h2 className="text-sm font-semibold text-slate-300">{label}</h2><p className="mt-2 text-3xl font-black text-gold">{value}</p></article>)}</section>
      <section className="mb-6 rounded-2xl border border-gold/30 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold">{t('adminQueue')}</h2><p className="mt-1 text-sm text-slate-300">{t('queueSwitch')}: {data.queueOpen ? t('queueOpen') : t('queueClosed')}</p></div><button type="button" aria-pressed={data.queueOpen} disabled={Boolean(busy)} onClick={() => void run('queue', async () => { await setAdminQueueOpen(token, !data.queueOpen); })} className={`min-h-12 min-w-32 rounded-xl px-5 font-black disabled:opacity-50 ${data.queueOpen ? 'bg-emerald-300 text-charcoal' : 'bg-slate-700 text-white'}`}>{data.queueOpen ? t('queueOpen') : t('queueClosed')}</button></div></section>
      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900 p-5"><h2 className="text-xl font-extrabold">{t('adminBarbers')}</h2>{data.barbers.length === 0 ? <p className="mt-4 text-slate-300">{t('noDutyBarbers')}</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.barbers.map(barber => <article key={barber.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-charcoal/60 p-4"><div className="min-w-0"><p className="break-words font-extrabold">{barber.avatar} {barber.name}</p><p className="mt-1 text-sm text-slate-300">{barber.isOnDuty ? t('barberAvailable') : t('offDuty')}</p></div><button type="button" aria-label={`${t('barberDutyToggle')}: ${barber.name}`} aria-pressed={barber.isOnDuty} disabled={Boolean(busy)} onClick={() => void run(`barber-${barber.id}`, async () => { await setAdminBarberDuty(token, barber.id, !barber.isOnDuty); })} className={`min-h-11 min-w-20 rounded-lg px-3 font-bold disabled:opacity-50 ${barber.isOnDuty ? 'bg-emerald-300 text-charcoal' : 'bg-slate-700 text-white'}`}>{barber.isOnDuty ? t('serviceEnabled') : t('serviceDisabled')}</button></article>)}</div>}</section>
      <section className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{t('adminServices')}</h2><button type="button" disabled={Boolean(busy)} onClick={openAdd} className="min-h-11 rounded-xl bg-gold px-4 font-extrabold text-charcoal disabled:opacity-50">+ {t('addService')}</button></div>{data.services.length === 0 ? <p className="py-10 text-center text-slate-300">{t('adminEmptyServices')}</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{data.services.map(service => <article key={service.id} className="rounded-xl border border-white/10 bg-charcoal/60 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-lg font-extrabold">{service.nameEn}</p><p className="mt-1 break-words text-slate-300">{service.nameGu}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${service.isOn ? 'bg-emerald-300/15 text-emerald-200' : 'bg-slate-700 text-slate-300'}`}>{service.isOn ? t('serviceEnabled') : t('serviceDisabled')}</span></div><p className="mt-3 text-sm text-slate-300">{service.durationMinutes} {t('minutes')} · ₹{service.price}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => void run(`service-${service.id}`, async () => { await toggleAdminService(token, service.id, !service.isOn); })} className="min-h-11 rounded-lg border border-white/15 px-4 font-bold disabled:opacity-50">{t('serviceToggle')}: {service.isOn ? t('serviceDisabled') : t('serviceEnabled')}</button><button type="button" disabled={Boolean(busy)} onClick={() => openEdit(service)} className="min-h-11 rounded-lg bg-gold px-4 font-extrabold text-charcoal disabled:opacity-50">{t('editService')}</button></div></article>)}</div>}</section>
    </>}
    {panel && <div className="fixed inset-0 z-50 flex justify-end bg-black/70"><aside role="dialog" aria-modal="true" aria-labelledby="service-panel-title" className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-charcoal p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between gap-3"><h2 id="service-panel-title" className="text-2xl font-black">{t(draft.id ? 'editService' : 'addService')}</h2><button type="button" disabled={busy === 'save-service'} onClick={() => setPanel(false)} className="min-h-11 rounded-lg border border-white/15 px-4 font-bold">{t('close')}</button></div><form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-bold">{t('serviceNameEn')}<input value={draft.nameEn} maxLength={60} onChange={event => setDraft({ ...draft, nameEn: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-900 px-4 text-base" /></label><label className="block text-sm font-bold">{t('serviceNameGu')}<input value={draft.nameGu} maxLength={60} onChange={event => setDraft({ ...draft, nameGu: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-900 px-4 text-base" /></label><label className="block text-sm font-bold">{t('serviceMinutes')}<input type="number" min="5" max="180" step="1" value={draft.durationMinutes} onChange={event => setDraft({ ...draft, durationMinutes: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-900 px-4 text-base" /></label><label className="block text-sm font-bold">{t('servicePrice')}<input type="number" min="1" max="9999" step="1" value={draft.price} onChange={event => setDraft({ ...draft, price: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-900 px-4 text-base" /></label><label className="flex min-h-11 items-center gap-3 font-bold"><input type="checkbox" checked={draft.isOn} onChange={event => setDraft({ ...draft, isOn: event.target.checked })} className="h-5 w-5 accent-gold" />{t('serviceEnabled')}</label>{formError && <p role="alert" className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-200">{formError}</p>}<button type="submit" disabled={busy === 'save-service'} className="min-h-12 w-full rounded-xl bg-gold font-black text-charcoal disabled:opacity-50">{busy === 'save-service' ? '…' : t('save')}</button></form></aside></div>}
  </main>;
}
