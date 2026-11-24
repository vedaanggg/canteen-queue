export type Language = 'en' | 'gu';

const english = {
  brand: 'Salon Studio', language: 'Language', toggleLanguage: 'Switch language', temporaryNav: 'Temporary navigation',
  home: 'Home', join: 'Join Queue', status: 'Queue status', reception: 'Reception', barber: 'Barber', display: 'Display', admin: 'Admin',
  homeTitle: 'A little time for yourself', joinTitle: 'Join the queue', statusTitle: 'Queue status', receptionTitle: 'Reception', barberTitle: 'Barber workspace', displayTitle: 'Salon display', adminTitle: 'Salon admin', notFound: 'Page not found',
  stepBadge: 'Salon Studio', placeholderCopy: 'This is a placeholder page. Salon features will be added in a later step.',
  checking: 'Checking server…', backendOnline: 'Backend connected', backendOffline: 'Backend unavailable',
  salonName: 'Salon Studio', open: 'Open', closed: 'Closed', liveCard: 'Live queue', peopleWaiting: 'People waiting', estimatedWait: 'Expected wait', minutes: 'min',
  joinQueue: 'Join Queue', onlineJoiningClosed: 'Online joining is closed', joiningClosedMessage: 'Online joining is closed right now. Please check back during salon hours.', salonClosedMessage: 'The salon is closed right now.',
  ourBarbers: 'Our barbers', free: 'Free', busy: 'Busy', onBreak: 'On break', loadingSalon: 'Loading salon details…', loadErrorTitle: 'We couldn’t load salon details', retry: 'Try again', noBarbers: 'No barbers are on duty right now.',
  joinIntro: 'Choose your services and barber. You can review the live estimate before confirming.', yourName: 'Your name', namePlaceholder: 'Enter your name', phoneNumber: '10-digit phone number', phonePlaceholder: 'e.g. 9876543210',
  chooseServices: 'Choose services', chooseUpToThree: 'Select 1 to 3 services', noServices: 'No services are available right now.', selectBarber: 'Choose a barber', anyBarber: 'Any barber',
  selected: 'Selected', duration: 'Duration', price: 'Price', summary: 'Your estimate', totalTime: 'Total service time', totalPrice: 'Total price', expectedWaitLabel: 'Expected wait',
  confirm: 'Confirm', requiredName: 'Please enter your name.', invalidPhone: 'Enter a valid 10-digit phone number.', selectOneService: 'Select at least one service.', maxThreeServices: 'You can select up to 3 services.',
  estimateLoading: 'Updating estimate…', estimateError: 'Could not update the estimate. Try again.', selectServicePrompt: 'Choose a service to see your estimate.', detailsValid: 'Your details are ready.', joiningNextStep: 'Joining the queue will be available in a later step.',
} as const;

export type TranslationKey = keyof typeof english;
type Dictionary = Record<TranslationKey, string>;
export const translations: Record<Language, Dictionary> = {
  en: english,
  gu: {
    brand: 'સેલોન સ્ટુડિયો', language: 'ભાષા', toggleLanguage: 'ભાષા બદલો', temporaryNav: 'અસ્થાયી નેવિગેશન',
    home: 'હોમ', join: 'કતારમાં જોડાઓ', status: 'કતારની સ્થિતિ', reception: 'રિસેપ્શન', barber: 'વાળંદ', display: 'ડિસ્પ્લે', admin: 'એડમિન',
    homeTitle: 'તમારા માટે થોડો સમય', joinTitle: 'કતારમાં જોડાઓ', statusTitle: 'કતારની સ્થિતિ', receptionTitle: 'રિસેપ્શન', barberTitle: 'વાળંદ કાર્યસ્થળ', displayTitle: 'સેલોન ડિસ્પ્લે', adminTitle: 'સેલોન એડમિન', notFound: 'પેજ મળ્યું નથી',
    stepBadge: 'સેલોન સ્ટુડિયો', placeholderCopy: 'આ અસ્થાયી પેજ છે. સેલોનની સુવિધાઓ આગળના પગલામાં ઉમેરાશે.',
    checking: 'સર્વર તપાસી રહ્યા છીએ…', backendOnline: 'બેકએન્ડ જોડાયેલ છે', backendOffline: 'બેકએન્ડ ઉપલબ્ધ નથી',
    salonName: 'સેલોન સ્ટુડિયો', open: 'ખુલ્લું', closed: 'બંધ', liveCard: 'લાઇવ કતાર', peopleWaiting: 'રાહ જોતા લોકો', estimatedWait: 'અંદાજિત રાહ', minutes: 'મિનિટ',
    joinQueue: 'કતારમાં જોડાઓ', onlineJoiningClosed: 'ઓનલાઇન જોડાવાનું બંધ છે', joiningClosedMessage: 'અત્યારે ઓનલાઇન જોડાવાનું બંધ છે. સેલોનના સમય દરમિયાન ફરી તપાસો.', salonClosedMessage: 'અત્યારે સેલોન બંધ છે.',
    ourBarbers: 'અમારા વાળંદ', free: 'ખાલી', busy: 'વ્યસ્ત', onBreak: 'વિરામ પર', loadingSalon: 'સેલોનની માહિતી લોડ થઈ રહી છે…', loadErrorTitle: 'સેલોનની માહિતી લોડ થઈ શકી નથી', retry: 'ફરી પ્રયાસ કરો', noBarbers: 'અત્યારે કોઈ વાળંદ ફરજ પર નથી.',
    joinIntro: 'તમારી સેવા અને વાળંદ પસંદ કરો. ખાતરી કરતાં પહેલાં લાઇવ અંદાજ જુઓ.', yourName: 'તમારું નામ', namePlaceholder: 'તમારું નામ લખો', phoneNumber: '10 અંકનો ફોન નંબર', phonePlaceholder: 'દા.ત. 9876543210',
    chooseServices: 'સેવાઓ પસંદ કરો', chooseUpToThree: '1 થી 3 સેવાઓ પસંદ કરો', noServices: 'અત્યારે કોઈ સેવા ઉપલબ્ધ નથી.', selectBarber: 'વાળંદ પસંદ કરો', anyBarber: 'કોઈપણ વાળંદ',
    selected: 'પસંદ કરેલી', duration: 'સમય', price: 'કિંમત', summary: 'તમારો અંદાજ', totalTime: 'કુલ સેવા સમય', totalPrice: 'કુલ કિંમત', expectedWaitLabel: 'અંદાજિત રાહ',
    confirm: 'ખાતરી કરો', requiredName: 'કૃપા કરીને તમારું નામ લખો.', invalidPhone: 'માન્ય 10 અંકનો ફોન નંબર લખો.', selectOneService: 'ઓછામાં ઓછી એક સેવા પસંદ કરો.', maxThreeServices: 'તમે વધુમાં વધુ 3 સેવાઓ પસંદ કરી શકો છો.',
    estimateLoading: 'અંદાજ અપડેટ થઈ રહ્યો છે…', estimateError: 'અંદાજ અપડેટ થઈ શક્યો નથી. ફરી પ્રયાસ કરો.', selectServicePrompt: 'અંદાજ જોવા માટે સેવા પસંદ કરો.', detailsValid: 'તમારી માહિતી તૈયાર છે.', joiningNextStep: 'કતારમાં જોડાવાની સુવિધા આગળના પગલામાં આવશે.',
  },
};

export const translationKeys = Object.keys(english) as TranslationKey[];
