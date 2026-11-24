import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchQueueSpot } from '../lib/api';
import { useLanguage } from '../i18n/LanguageContext';
import { useSalonData } from '../state/useSalonData';

export default function HomePage() {
  const { t } = useLanguage();
  const { barbers, status, loading, error, refresh } = useSalonData();
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    const check = async () => {
      const savedId = localStorage.getItem('salon-last-spot-id');
      if (!savedId) { setActiveSpotId(null); return; }
      try {
        const result = await fetchQueueSpot(savedId);
        if (!disposed && activeStatuses.has(result.spot.status) && !result.spot.previousDay) setActiveSpotId(result.spot.id);
        else if (!disposed) setActiveSpotId(null);
      } catch { if (!disposed) setActiveSpotId(null); }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);
  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-5xl items-center justify-center px-4"><p role="status" className="animate-pulse text-lg font-semibold text-slate-200">{t('loadingSalon')}</p></main>;
  if (error || !status) return <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-extrabold text-white">{t('loadErrorTitle')}</h1><p className="mt-3 text-slate-300">{error}</p><button onClick={() => void refresh()} className="mt-5 min-h-11 rounded-full bg-gold px-5 font-bold text-charcoal">{t('retry')}</button></main>;
  const joinOpen = status.onlineJoiningOpen;

  return <main className="mx-auto max-w-6xl px-4 pb-10 pt-7 sm:px-6 sm:pt-12">
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 px-5 py-8 shadow-2xl shadow-black/20 sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-3xl text-charcoal shadow-lg shadow-gold/20">✂</span>
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">{t('salonName')}</p><span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${status.isOpen ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>{status.isOpen ? t('open') : t('closed')} · {status.closingTime}</span></div>
        </div>
        <h1 className="max-w-2xl break-words text-4xl font-black leading-tight text-white sm:text-6xl">{t('homeTitle')}</h1>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link aria-disabled={!joinOpen} to={joinOpen ? '/join' : '#join-closed'} onClick={(event) => { if (!joinOpen) event.preventDefault(); }} className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-7 text-lg font-black shadow-lg transition ${joinOpen ? 'bg-gold text-charcoal shadow-gold/15 hover:bg-amber-300' : 'cursor-not-allowed bg-slate-700 text-slate-400 shadow-none'}`}>{t('joinQueue')}</Link>
          {activeSpotId && <Link to={`/status/${encodeURIComponent(activeSpotId)}`} className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-gold px-6 text-base font-extrabold text-gold">{t('viewSpot')}</Link>}
          {!joinOpen && <p id="join-closed" role="status" className="w-full break-words text-sm font-semibold text-amber-200">{status.isOpen ? t('joiningClosedMessage') : t('salonClosedMessage')}</p>}
        </div>
      </div>
    </section>

    <section aria-label={t('liveCard')} className="mt-5 grid gap-4 sm:grid-cols-2">
      <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-white">{t('liveCard')}</h2><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400"/></span></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/15 p-4"><p className="text-sm text-slate-300">{t('peopleWaiting')}</p><p className="mt-1 text-3xl font-black text-gold">{status.waitingCount}</p></div>
          <div className="rounded-2xl bg-black/15 p-4"><p className="text-sm text-slate-300">{t('estimatedWait')}</p><p className="mt-1 text-3xl font-black text-gold">{status.estimatedWaitMinutes} <span className="text-base">{t('minutes')}</span></p></div>
        </div>
      </article>
      <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-white">{t('ourBarbers')}</h2>
        {barbers.length === 0 ? <p className="mt-4 text-sm text-slate-300">{t('noBarbers')}</p> : <ul className="mt-4 flex flex-wrap gap-2.5">{barbers.map((barber) => <li key={barber.id} className="flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2">
          <span aria-hidden="true" className="text-xl">{barber.avatar}</span><span className="font-bold text-white">{barber.name}</span>
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${barber.status === 'free' ? 'bg-emerald-400/15 text-emerald-300' : barber.status === 'busy' ? 'bg-amber-400/15 text-amber-200' : 'bg-slate-500/30 text-slate-300'}`}>{t(barber.status === 'on_break' ? 'onBreak' : barber.status)}</span>
        </li>)}</ul>}
      </article>
    </section>
  </main>;
}

const activeStatuses = new Set(['Waiting', 'Called', 'In chair']);
