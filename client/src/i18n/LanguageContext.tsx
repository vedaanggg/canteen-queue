import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Language, type TranslationKey } from './translations';

const storageKey = 'salon-language';
interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string }
const LanguageContext = createContext<LanguageContextValue | null>(null);

function savedLanguage(): Language {
  try { return localStorage.getItem(storageKey) === 'gu' ? 'gu' : 'en'; } catch { return 'en'; }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(savedLanguage);
  useEffect(() => { document.documentElement.lang = language === 'gu' ? 'gu' : 'en'; }, [language]);
  const setLanguage = (next: Language) => {
    updateLanguage(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Persistence is optional in restricted browser modes. */ }
  };
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider.');
  return value;
}
