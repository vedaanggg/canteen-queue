import { useCallback, useEffect, useState } from 'react';
import { fetchDisplay, type DisplayData } from '../lib/api';
import { socket } from '../lib/socket';
import { useLanguage } from '../i18n/LanguageContext';

function chime() {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.frequency.value = 880; gain.gain.value = 0.08;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.16);
    oscillator.onended = () => void context.close();
  } catch { /* Sound is best-effort and may be blocked by the browser. */ }
}

export default function DisplayPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket?.connected ?? false);
  const [calledToken, setCalledToken] = useState('');

  const refresh = useCallback(async () => {
    try { setData(await fetchDisplay()); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('receptionLoadError')); }
  }, [t]);

  useEffect(() => {
    void refresh();
    const liveSocket = socket; if (!liveSocket) return;
    const onUpdate = (payload: { status?: string; token?: string }) => {
      if (payload.status === 'Called' && payload.token) { setCalledToken(payload.token); chime(); window.setTimeout(() => setCalledToken(current => current === payload.token ? '' : current), 5000); }
      void refresh();
    };
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    liveSocket.on('queue:updated', onUpdate); liveSocket.on('connect', onConnect); liveSocket.on('disconnect', onDisconnect);
    const timer = window.setInterval(() => { if (!liveSocket.connected) void refresh(); }, 5000);
    return () => { window.clearInterval(timer); liveSocket.off('queue:updated', onUpdate); liveSocket.off('connect', onConnect); liveSocket.off('disconnect', onDisconnect); };
  }, [refresh]);

  return <main className="min-h-screen overflow-hidden bg-[#111827] px-6 py-8 text-white sm:px-12 sm:py-12 xl:px-20 xl:py-16">
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1800px] flex-col">
      <header className="flex items-end justify-between border-b-2 border-gold/40 pb-6"><div><p className="text-xl font-black uppercase tracking-[0.3em] text-gold">{t('brand')}</p><h1 className="mt-2 text-5xl font-black sm:text-7xl">{t('displayTitle')}</h1></div>{!connected && <p role="status" className="text-lg font-bold text-amber-200 sm:text-2xl">{t('reconnecting')}</p>}</header>
      {error && !data && <p role="alert" className="my-auto text-center text-3xl text-rose-200">{error}</p>}
      {!data && !error && <p role="status" className="my-auto text-center text-3xl text-slate-300">{t('loadingSalon')}</p>}
      {data && <div className="grid flex-1 gap-8 py-8 xl:grid-cols-[1.4fr_1fr] xl:gap-14 xl:py-12">
        <section aria-label={t('ourBarbers')} className="space-y-4 sm:space-y-6">{data.barbers.length === 0 ? <p className="rounded-3xl bg-white/5 p-8 text-2xl text-slate-300">{t('displayNoBarbers')}</p> : data.barbers.map(barber => {
          const label = barber.status === 'on_break' ? t('onBreak') : barber.status === 'free' ? t('displayFree') : barber.currentToken ? `${t('displayNow')}: ${barber.currentToken}` : t('displayFree');
          const flashing = Boolean(barber.currentToken && barber.currentToken === calledToken);
          return <article key={barber.id} className={`flex min-h-28 items-center gap-5 rounded-3xl border-2 px-5 py-5 transition-all duration-300 sm:min-h-36 sm:gap-8 sm:px-8 ${flashing ? 'animate-pulse border-gold bg-gold text-charcoal shadow-[0_0_48px_rgba(212,160,23,0.45)]' : 'border-white/10 bg-white/[0.06]'}`}>
            <span aria-hidden="true" className="text-5xl sm:text-7xl">{barber.avatar}</span><span className="min-w-0 flex-1 truncate text-3xl font-black sm:text-5xl">{barber.name}</span><span className={`text-right text-2xl font-black sm:text-4xl ${flashing ? '' : barber.status === 'on_break' ? 'text-slate-400' : barber.status === 'free' ? 'text-emerald-300' : 'text-gold'}`}>{label}</span>
          </article>;
        })}</section>
        <section className="rounded-3xl border-2 border-gold/30 bg-slate-900/80 p-6 sm:p-9"><h2 className="border-b border-white/10 pb-5 text-3xl font-black text-gold sm:text-5xl">{t('upNext')}</h2>{data.upNext.length === 0 ? <p className="py-10 text-2xl text-slate-300 sm:text-3xl">{t('displayEmpty')}</p> : <ol className="divide-y divide-white/10">{data.upNext.map((entry, index) => <li key={entry.id} className="flex items-center gap-4 py-5 sm:py-7"><span className="w-12 text-xl font-bold text-slate-500 sm:w-16 sm:text-3xl">{index + 1}</span><span className={`flex-1 text-3xl font-black sm:text-5xl ${entry.token === calledToken ? 'animate-pulse text-gold' : 'text-white'}`}>{entry.token}</span><span className="text-right text-lg font-bold text-slate-300 sm:text-2xl">{entry.expectedWaitMinutes === 0 ? t('youreNext') : `${t('expectedAt')} ~${entry.expectedWaitMinutes ?? '—'} ${t('minutes')}`}</span></li>)}</ol>}</section>
      </div>}
    </div>
  </main>;
}

