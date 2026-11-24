# Screens & Features

Mobile-first (390px) unless stated otherwise. Every screen needs loading, empty
and friendly error states. Every label comes from the English/Gujarati language
file. A language toggle (EN | GU) is in the header of every screen, and the
choice is remembered in the browser.

Staff screens (/reception, /barber/:name, /admin) ask for the staff PIN first.
/ , /join, /status/:id and /display are public.

## Screen 1: Home (/)
**User:** customer.
- Salon name + logo, badge "Open · Closes 9 PM" (or "Closed")
- Live card: "6 people waiting · about 50 min"
- Barber chips with status: Ravi (busy) · Amit (free) · Imran (on break)
- Big gold [ Join Queue ] button
- If online joining is closed (owner switch, or within 30 min of closing):
  button disabled with a clear message. Walk-ins are still welcome.
- If the customer has an active spot saved in the browser, show
  [ View my spot ] linking to /status/:id
- Updates automatically

## Screen 2: Join Queue (/join)
**User:** customer.
- Name (required), Phone (10 digits, required, validated)
- Service cards, multi-select, max 3: name, minutes, price. Only services that
  are switched on are shown.
- Barber picker: "Any barber (fastest)" or a barber card. Barbers not on duty
  are not shown; barbers on break show "On break".
- Live summary: "Total 45 min · ₹230 · Expected wait ~35 min"
- [ Confirm ] button: disabled while the request runs (prevents double submit);
  on success goes to My Status
- If the same phone already has an active spot: show "You are already in the
  queue" with a link to that spot, and do not create a second one
- If queue is closed: show the closed message and disable Confirm
- Errors from the backend are shown clearly; the form keeps its values

## Screen 3: My Status (/status/:id)
**User:** customer on a phone.
- Token "S-14" large, position "4th in line", name and chosen services/barber
- Circular countdown: "about 35 min"; updates by itself
- When 2nd or 1st in line: banner "Start coming to the salon"
- When Called: full-screen gold "It's your turn! Go to Ravi", large text, gentle
  pulse animation, phone vibration (best-effort)
- In chair: "Your service is in progress with Ravi"
- Done: "Thank you!" message
- No-show: message explaining the spot was released, with a [ Join again ] link
- Cancelled: cancelled message
- If the chosen barber is on break: "Ravi is on break"
- [ Cancel my spot ] with a confirmation pop-up, visible only while Waiting
- Refresh keeps the same spot; unknown id shows "Spot not found"
- A spot from a previous day is read-only with a banner

## Screen 4: Reception Dashboard (/reception) — tablet, landscape
**User:** receptionist.
- Left: barber cards (name, status, current customer, time left or time since
  start, [ Call next ])
- Right: waiting list in order: token, name, phone, services, preferred barber,
  waiting time, [ No-show ] (for Called customers only) and [ Cancel ]
- Top: [ + Add walk-in ] opens a quick form (name, phone, services, barber)
- Customers waiting more than 60 min are highlighted amber
- Called customers are shown with a timer; [ No-show ] is enabled after 10 min
- New customers from phones appear without refresh
- Empty state: "No one waiting — walk right in!"

## Screen 5: Barber View (/barber/:name) — phone
**User:** barber.
- Current customer: name, services, timer since start
- Big buttons: [ Start ] (when the customer is Called) -> [ Done ] (when In chair)
- "Next for you: S-15 Kunal (Haircut)" or "No one waiting for you"
- Toggle: On break / Available. A barber cannot go on break while a customer is
  In chair.
- Unknown barber name shows a friendly error

## Screen 6: Waiting Area TV (/display) — 1920x1080
**User:** everyone in the waiting area. No buttons, no navigation, no refresh.
- Dark background, gold accents, text readable from 5 metres
- One row per barber on duty: photo/emoji, name, "Now: S-12" (or "Free" /
  "On break")
- "Up next" list: the next 5 tokens with estimated times
- A newly Called token flashes gold for 5 seconds, with a chime (best-effort)
- Shows the current language chosen on the TV; reconnects automatically

## Screen 7: Owner Settings (/admin)
**User:** owner.
- Services list: name in English and Gujarati, minutes, price, on/off toggle,
  Edit, and [ + Add service ] in a side panel
- Barbers on duty today (toggle for each barber)
- Queue switch: Open / Closed for online joining
- Today's stats cards: customers served, average wait, no-shows
- Backend validates all input; clear error messages
