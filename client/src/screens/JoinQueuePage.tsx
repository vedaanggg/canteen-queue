import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchQueueEstimate, type QueueEstimate } from '../lib/api';
import { useLanguage } from '../i18n/LanguageContext';
import { useSalonData } from '../state/useSalonData';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export default function JoinQueuePage() {
  const { language, t } = useLanguage();
  const { services, barbers, status, loading, error, refresh } = useSalonData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedBarber, setSelectedBarber] = useState('any');
  const [estimate, setEstimate] = useState<QueueEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const joinOpen = status?.onlineJoiningOpen ?? false;

  useEffect(() => {
    if (!selectedServices.length) { setEstimate(null); setEstimateError(null); setEstimateLoading(false); return; }
    const controller = new AbortController(); setEstimateLoading(true); setEstimateError(null);
    fetchQueueEstimate(selectedServices, selectedBarber, controller.signal)
      .then(setEstimate)
      .catch((cause) => { if (!controller.signal.aborted) { setEstimate(null); setEstimateError(cause instanceof ApiError ? cause.message : t('estimateError')); } })
      .finally(() => { if (!controller.signal.aborted) setEstimateLoading(false); });
    return () => controller.abort();
  }, [selectedServices, selectedBarber, t]);

  function toggleService(serviceId: number) {
    setFormError(null); setSubmitted(false);
    if (selectedServices.includes(serviceId)) { setSelectedServices(selectedServices.filter((id) => id !== serviceId)); return; }
    if (selectedServices.length >= 3) { setFormError(t('maxThreeServices')); return; }
    setSelectedServices([...selectedServices, serviceId]);
  }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitted(true); setFormError(null);
    if (!name.trim()) { setFormError(t('requiredName')); return; }
    if (!/^\d{10}$/.test(phone.trim())) { setFormError(t('invalidPhone')); return; }
    if (!selectedServices.length) { setFormError(t('selectOneService')); return; }
    if (!joinOpen) { setFormError(status?.isOpen ? t('joiningClosedMessage') : t('salonClosedMessage')); return; }
    setFormError(t('joiningNextStep'));
  }

  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center px-4"><p role="status" className="animate-pulse text-lg font-semibold text-slate-200">{t('loadingSalon')}</p></main>;
  if (error || !status) return <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-extrabold text-white">{t('loadErrorTitle')}</h1><p className="mt-3 text-slate-300">{error}</p><button type="button" onClick={() => void refresh()} className="mt-5 min-h-11 rounded-full bg-gold px-5 font-bold text-charcoal">{t('retry')}</button></main>;

  const onBreakNames = barbers.filter((barber) => barber.status === 'on_break').map((barber) => barber.name);
  return <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-9">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><Link to="/" className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-bold text-gold hover:bg-white/5">‹ {t('home')}</Link><h1 className="mt-2 break-words text-3xl font-black text-white sm:text-4xl">{t('joinTitle')}</h1><p className="mt-2 max-w-2xl text-slate-300">{t('joinIntro')}</p></div>
      <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${status.isOpen ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>{status.isOpen ? t('open') : t('closed')} · {status.closingTime}</span>
    </div>

    {!joinOpen && <div role="status" className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-amber-100">{status.isOpen ? t('joiningClosedMessage') : t('salonClosedMessage')}</div>}
    {services.length === 0 ? <section className="rounded-3xl border border-dashed border-white/20 px-5 py-12 text-center text-slate-300">{t('noServices')}</section> : <form onSubmit={confirm} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-white">{t('yourName')} &amp; {t('phoneNumber')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-200">{t('yourName')}<input value={name} onChange={(event) => { setName(event.target.value); setFormError(null); }} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-3.5 text-base text-white outline-none focus:border-gold focus:ring-4 focus:ring-gold/15" placeholder={t('namePlaceholder')} /></label>
            <label className="block text-sm font-bold text-slate-200">{t('phoneNumber')}<input value={phone} onChange={(event) => { setPhone(event.target.value); setFormError(null); }} inputMode="numeric" autoComplete="tel-national" maxLength={10} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-charcoal px-3.5 text-base text-white outline-none focus:border-gold focus:ring-4 focus:ring-gold/15" placeholder={t('phonePlaceholder')} /></label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-extrabold text-white">{t('chooseServices')}</h2><p className="mt-1 text-sm text-slate-300">{t('chooseUpToThree')}</p></div><span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">{selectedServices.length} / 3</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((service) => {
              const selected = selectedServices.includes(service.id);
              return <button key={service.id} type="button" aria-pressed={selected} onClick={() => toggleService(service.id)} className={`min-h-24 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 ${selected ? 'border-gold bg-gold/10' : 'border-white/10 bg-charcoal/70 hover:border-white/30'}`}>
                <span className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-extrabold text-white">{language === 'gu' ? service.nameGu : service.nameEn}</span><span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm ${selected ? 'border-gold bg-gold text-charcoal' : 'border-white/30 text-transparent'}`}>✓</span></span>
                <span className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-slate-300"><span>{service.durationMinutes} {t('minutes')}</span><span className="font-extrabold text-gold">{money(service.price)}</span></span>
              </button>;
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-white">{t('selectBarber')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" aria-pressed={selectedBarber === 'any'} onClick={() => { setSelectedBarber('any'); setFormError(null); }} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left font-bold transition ${selectedBarber === 'any' ? 'border-gold bg-gold/10 text-white' : 'border-white/10 bg-charcoal/70 text-slate-200'}`}><span aria-hidden="true" className="text-2xl">✦</span>{t('anyBarber')}</button>
            {barbers.map((barber) => {
              const unavailable = barber.status === 'on_break'; const selected = selectedBarber.toLowerCase() === barber.name.toLowerCase();
              return <button key={barber.id} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => { setSelectedBarber(barber.name); setFormError(null); }} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${selected ? 'border-gold bg-gold/10' : 'border-white/10 bg-charcoal/70'}`}>
                <span aria-hidden="true" className="text-2xl">{barber.avatar}</span><span className="min-w-0 flex-1 break-words font-bold text-white">{barber.name}</span>
                <span className={`max-w-24 break-words rounded-full px-2 py-1 text-[11px] font-bold ${barber.status === 'free' ? 'bg-emerald-400/15 text-emerald-300' : barber.status === 'busy' ? 'bg-amber-400/15 text-amber-200' : 'bg-slate-500/30 text-slate-300'}`}>{t(barber.status === 'on_break' ? 'onBreak' : barber.status)}</span>
              </button>;
            })}
          </div>
          {onBreakNames.length > 0 && <p className="mt-3 text-xs text-slate-400">{onBreakNames.map((barberName) => `${barberName}: ${t('onBreak')}`).join(' · ')}</p>}
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-gold/30 bg-slate-900 p-5 shadow-lg shadow-black/20 sm:p-6 lg:sticky lg:top-5">
        <h2 className="text-xl font-extrabold text-white">{t('summary')}</h2>
        {!selectedServices.length && <p className="mt-4 text-sm text-slate-300">{t('selectServicePrompt')}</p>}
        {estimateLoading && <p role="status" className="mt-4 text-sm text-slate-300">{t('estimateLoading')}</p>}
        {estimateError && <p role="alert" className="mt-4 break-words text-sm text-rose-300">{estimateError}</p>}
        {estimate && !estimateLoading && <dl className="mt-4 space-y-3">
          <div className="flex justify-between gap-3 text-sm"><dt className="text-slate-300">{t('totalTime')}</dt><dd className="shrink-0 font-extrabold text-white">{estimate.totalMinutes} {t('minutes')}</dd></div>
          <div className="flex justify-between gap-3 text-sm"><dt className="text-slate-300">{t('totalPrice')}</dt><dd className="shrink-0 font-extrabold text-gold">{money(estimate.totalPrice)}</dd></div>
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-sm"><dt className="text-slate-300">{t('expectedWaitLabel')}</dt><dd className="shrink-0 font-extrabold text-white">{estimate.expectedWaitMinutes} {t('minutes')}</dd></div>
        </dl>}
        {formError && <p role={submitted ? 'alert' : 'status'} className="mt-4 break-words rounded-xl bg-amber-300/10 px-3 py-2.5 text-sm font-semibold text-amber-100">{formError}</p>}
        <button type="submit" disabled={!joinOpen} className="mt-5 min-h-12 w-full rounded-2xl bg-gold px-5 font-extrabold text-charcoal transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{t('confirm')}</button>
      </aside>
    </form>}
  </main>;
}
