import { Link, Route, Routes, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import type { TranslationKey } from './i18n/translations';
import { fetchHealth } from './lib/api';
import HomePage from './screens/HomePage';
import JoinQueuePage from './screens/JoinQueuePage';
import MyStatusPage from './screens/MyStatusPage';

const pages = [
  { path: '/', key: 'home' }, { path: '/join', key: 'join' }, { path: '/status/demo', key: 'status' },
  { path: '/reception', key: 'reception' }, { path: '/barber/stylist', key: 'barber' },
  { path: '/display', key: 'display' }, { path: '/admin', key: 'admin' },
] as const;

function HealthStatus() {
  const { t } = useLanguage();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    socket?.connect();
    return () => { socket?.disconnect(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal).then(() => setOnline(true)).catch(() => {
      if (!controller.signal.aborted) setOnline(false);
    });
    return () => controller.abort();
  }, []);
  const label = online === null ? t('checking') : online ? t('backendOnline') : t('backendOffline');
  return <span className={`text-xs font-medium ${online ? 'text-emerald-300' : online === false ? 'text-rose-300' : 'text-slate-300'}`}>{label}</span>;
}

function Placeholder({ titleKey, route }: { titleKey: TranslationKey; route: string }) {
  const { t } = useLanguage();
  const { id, name } = useParams();
  return <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
    <span className="mb-4 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">{t('stepBadge')}</span>
    <h1 className="text-4xl font-bold tracking-tight text-white">{t(titleKey)}</h1>
    <p className="mt-3 max-w-lg text-slate-300">{t('placeholderCopy')}</p>
    <p className="mt-5 rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm text-gold">{route}{id ? ` · ${id}` : ''}{name ? ` · ${name}` : ''}</p>
  </main>;
}

function AppShell() {
  const { language, setLanguage, t } = useLanguage();
  return <div className="min-h-screen bg-charcoal text-white">
    <header className="border-b border-white/10 bg-slate-900/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link className="text-xl font-extrabold tracking-wide text-white" to="/">{t('brand')}</Link>
        <nav aria-label={t('temporaryNav')} className="flex flex-wrap gap-2">
          {pages.map((page) => <Link key={page.path} to={page.path} className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-gold hover:text-gold">{t(page.key)}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('language')}</span>
          <button type="button" onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')} className="min-h-11 rounded-full bg-gold px-4 text-sm font-extrabold text-charcoal" aria-label={t('toggleLanguage')}>
            {language === 'en' ? 'ગુજરાતી' : 'English'}
          </button>
        </div>
      </div>
    </header>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join" element={<JoinQueuePage />} />
      <Route path="/status/:id" element={<MyStatusPage />} />
      <Route path="/reception" element={<Placeholder titleKey="receptionTitle" route="/reception" />} />
      <Route path="/barber/:name" element={<Placeholder titleKey="barberTitle" route="/barber/:name" />} />
      <Route path="/display" element={<Placeholder titleKey="displayTitle" route="/display" />} />
      <Route path="/admin" element={<Placeholder titleKey="adminTitle" route="/admin" />} />
      <Route path="*" element={<Placeholder titleKey="notFound" route="*" />} />
    </Routes>
    <footer className="mx-auto flex max-w-7xl justify-center px-4 pb-6"><HealthStatus /></footer>
  </div>;
}

export default function App() {
  return <LanguageProvider><AppShell /></LanguageProvider>;
}
