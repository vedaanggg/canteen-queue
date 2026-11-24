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
  joining: 'Joining…', joinFailed: 'Could not join the queue. Try again.', alreadyInQueue: 'You are already in the queue.', viewSpot: 'View your spot',
  loadingSpot: 'Loading your queue status…', spotError: 'We could not load this spot.', spotNotFound: 'Spot not found', retrySpot: 'Try again', reconnecting: 'Reconnecting…',
  yourToken: 'Your token', position: 'in line', peopleAhead: 'people ahead', estimatedWaitLabelStatus: 'Estimated wait', youreNext: "You're next", startComing: 'Start coming to the salon',
  yourDetails: 'Your queue details', chosenServices: 'Services', preferredBarber: 'Barber', anyBarberStatus: 'Any barber', barberOnBreak: 'is on break', previousDay: 'This spot is from a previous day. It is read-only.',
  waiting: 'Waiting', called: 'It’s your turn!', goToBarber: 'Go to', inChair: 'Your service is in progress with', done: 'Thank you! Your visit is complete.', noShow: 'This spot was released because you did not arrive in time.', cancelled: 'Your spot has been cancelled.',
  cancelSpot: 'Cancel my spot', cancelConfirm: 'Cancel your queue spot?', cancel: 'Cancel', keepSpot: 'Keep my spot', joinAgain: 'Join again', notAvailable: 'No active wait estimate is available.',
  staffPin: 'Staff PIN', staffPinPlaceholder: 'Enter staff PIN', staffLogin: 'Staff login', staffLogout: 'Log out', invalidPin: 'That PIN is incorrect. Try again.', staffAccessError: 'Unable to verify staff access.',
  receptionDashboard: 'Reception dashboard', today: 'Today', refresh: 'Refresh', addWalkIn: 'Add walk-in', saveWalkIn: 'Add to queue', walkInAdded: 'Walk-in added to the queue.',
  waitingList: 'Waiting list', calledCustomers: 'Called customers', currentCustomer: 'Current customer', noCurrentCustomer: 'No customer assigned', noWaiting: 'No one waiting — walk right in!',
  callNext: 'Call next', barberAvailable: 'Available', barberBusy: 'Busy', noShowAction: 'No-show', cancelCustomer: 'Cancel', waitingTime: 'Waiting', minutesWaited: 'min waited', calledFor: 'Called for', noShowConfirm: 'Mark this customer as a No-show?', cancelCustomerConfirm: 'Cancel this Waiting customer?',
  loadingReception: 'Loading reception dashboard…', receptionLoadError: 'Could not load the reception dashboard.', actionError: 'The action could not be completed.', noDutyBarbers: 'No barbers are on duty.', walkInPhone: 'Phone number', walkInName: 'Customer name', walkInBarber: 'Preferred barber',
  calledStatus: 'Called', inChairStatus: 'In chair',
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
    joining: 'જોડાઈ રહ્યા છીએ…', joinFailed: 'કતારમાં જોડાઈ શકાયું નથી. ફરી પ્રયાસ કરો.', alreadyInQueue: 'તમે પહેલેથી કતારમાં છો.', viewSpot: 'તમારી જગ્યા જુઓ',
    loadingSpot: 'કતારની સ્થિતિ લોડ થઈ રહી છે…', spotError: 'આ જગ્યા લોડ થઈ શકી નથી.', spotNotFound: 'જગ્યા મળી નથી', retrySpot: 'ફરી પ્રયાસ કરો', reconnecting: 'ફરી જોડાઈ રહ્યું છે…',
    yourToken: 'તમારો ટોકન', position: 'કતારમાં', peopleAhead: 'લોકો આગળ છે', estimatedWaitLabelStatus: 'અંદાજિત રાહ', youreNext: 'તમારો વારો હવે છે', startComing: 'સેલોન તરફ આવવાનું શરૂ કરો',
    yourDetails: 'કતારની વિગતો', chosenServices: 'સેવાઓ', preferredBarber: 'વાળંદ', anyBarberStatus: 'કોઈપણ વાળંદ', barberOnBreak: 'વિરામ પર છે', previousDay: 'આ જગ્યા અગાઉના દિવસની છે. તે ફક્ત વાંચી શકાય છે.',
    waiting: 'રાહમાં', called: 'તમારો વારો છે!', goToBarber: 'આ વાળંદ પાસે જાઓ:', inChair: 'તમારી સેવા ચાલુ છે:', done: 'આભાર! તમારી મુલાકાત પૂર્ણ થઈ.', noShow: 'સમયસર ન આવવાથી તમારી જગ્યા મુક્ત કરવામાં આવી.', cancelled: 'તમારી જગ્યા રદ થઈ છે.',
    cancelSpot: 'મારી જગ્યા રદ કરો', cancelConfirm: 'તમારી કતારની જગ્યા રદ કરવી છે?', cancel: 'રદ કરો', keepSpot: 'જગ્યા રાખો', joinAgain: 'ફરી જોડાઓ', notAvailable: 'હાલ રાહનો અંદાજ ઉપલબ્ધ નથી.',
    staffPin: 'સ્ટાફ પિન', staffPinPlaceholder: 'સ્ટાફ પિન લખો', staffLogin: 'સ્ટાફ લોગિન', staffLogout: 'લોગઆઉટ', invalidPin: 'આ પિન ખોટો છે. ફરી પ્રયાસ કરો.', staffAccessError: 'સ્ટાફ ઍક્સેસ તપાસી શકાયી નથી.',
    receptionDashboard: 'રિસેપ્શન ડેશબોર્ડ', today: 'આજે', refresh: 'રીફ્રેશ', addWalkIn: 'વોક-ઇન ઉમેરો', saveWalkIn: 'કતારમાં ઉમેરો', walkInAdded: 'વોક-ઇન કતારમાં ઉમેરાયો.',
    waitingList: 'રાહ જોતા લોકો', calledCustomers: 'બોલાવેલા ગ્રાહકો', currentCustomer: 'હાલના ગ્રાહક', noCurrentCustomer: 'કોઈ ગ્રાહક સોંપાયેલ નથી', noWaiting: 'કોઈ રાહ જોતું નથી — સીધા આવી જાઓ!',
    callNext: 'આગળના ગ્રાહકને બોલાવો', barberAvailable: 'ઉપલબ્ધ', barberBusy: 'વ્યસ્ત', noShowAction: 'ગેરહાજર', cancelCustomer: 'રદ કરો', waitingTime: 'રાહ', minutesWaited: 'મિનિટથી રાહ', calledFor: 'બોલાવ્યા પછી', noShowConfirm: 'આ ગ્રાહકને ગેરહાજર તરીકે નોંધવો છે?', cancelCustomerConfirm: 'આ રાહ જોતા ગ્રાહકને રદ કરવો છે?',
    loadingReception: 'રિસેપ્શન ડેશબોર્ડ લોડ થઈ રહ્યો છે…', receptionLoadError: 'રિસેપ્શન ડેશબોર્ડ લોડ થઈ શક્યું નથી.', actionError: 'આ ક્રિયા પૂર્ણ થઈ શકી નથી.', noDutyBarbers: 'આજે કોઈ વાળંદ ફરજ પર નથી.', walkInPhone: 'ફોન નંબર', walkInName: 'ગ્રાહકનું નામ', walkInBarber: 'પસંદગીના વાળંદ',
    calledStatus: 'બોલાવ્યા', inChairStatus: 'ખુરશીમાં',
  },
};

export const translationKeys = Object.keys(english) as TranslationKey[];
