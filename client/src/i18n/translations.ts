export type Language = 'en' | 'gu';

export const translations = {
  en: {
    brand: 'Salon Studio', language: 'Language', toggleLanguage: 'Switch language', temporaryNav: 'Temporary navigation',
    home: 'Home', join: 'Book', status: 'Booking status', reception: 'Reception', barber: 'Barber', display: 'Display', admin: 'Admin',
    homeTitle: 'Welcome', joinTitle: 'Join us', statusTitle: 'Booking status', receptionTitle: 'Reception', barberTitle: 'Barber workspace', displayTitle: 'Salon display', adminTitle: 'Salon admin', notFound: 'Page not found',
    stepBadge: 'Salon Studio · Step 1', placeholderCopy: 'This is a placeholder page. No salon features are built in this setup step.',
    checking: 'Checking server…', backendOnline: 'Backend connected', backendOffline: 'Backend unavailable',
  },
  gu: {
    brand: 'સેલોન સ્ટુડિયો', language: 'ભાષા', toggleLanguage: 'ભાષા બદલો', temporaryNav: 'અસ્થાયી નેવિગેશન',
    home: 'હોમ', join: 'બુકિંગ', status: 'બુકિંગ સ્થિતિ', reception: 'રિસેપ્શન', barber: 'વાળંદ', display: 'ડિસ્પ્લે', admin: 'એડમિન',
    homeTitle: 'સ્વાગત છે', joinTitle: 'અમારી સાથે જોડાઓ', statusTitle: 'બુકિંગ સ્થિતિ', receptionTitle: 'રિસેપ્શન', barberTitle: 'વાળંદ કાર્યસ્થળ', displayTitle: 'સેલોન ડિસ્પ્લે', adminTitle: 'સેલોન એડમિન', notFound: 'પેજ મળ્યું નથી',
    stepBadge: 'સેલોન સ્ટુડિયો · પગલું 1', placeholderCopy: 'આ એક અસ્થાયી પેજ છે. આ સેટઅપમાં સેલોનની સુવિધાઓ બનાવવામાં આવી નથી.',
    checking: 'સર્વર તપાસી રહ્યા છીએ…', backendOnline: 'બેકએન્ડ જોડાયેલ છે', backendOffline: 'બેકએન્ડ ઉપલબ્ધ નથી',
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;
