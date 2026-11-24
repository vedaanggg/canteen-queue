1st prompt
Read AGENTS.md and everything in docs/. Do not write any code yet.

1. Tell me in your own words the rules you will follow while working on this project.
2. Summarise the app in 8 bullet points.
3. List anything that is unclear, missing, or contradictory in the docs.

I've updated AGENTS.md and docs/03-flows-rules.md to resolve the gaps you listed.
Re-read all docs. In 3 bullets, tell me whether anything is still unclear or
contradictory. Do not write any code yet.


Implement Step 1 only. Set up React + Vite + TypeScript + Tailwind for the
frontend, and an Express backend with SQLite and Socket.IO. Create a clean
modular folder structure (client/ and server/), configure one root script so
`npm run dev` runs frontend and backend together, and add a backend health-check
endpoint at /api/health. Read the API URL from an environment variable
(VITE_API_URL) and allow the frontend origin from CLIENT_ORIGIN on the backend
(CORS and Socket.IO). Add a vercel.json so direct visits to /kitchen, /display,
/admin and /order/:id do not 404. Add a simple placeholder page for each of the
6 routes with a temporary nav bar. Do not build any real screens yet.

Also create docs/api.md describing the endpoints, database tables and Socket.IO
events you plan to use, and keep it updated in later steps.

Verify that frontend and backend both run on localhost and the frontend can
reach the health check. List the changed files and the exact test commands.
Do not deploy anything.

Build only Screen 1 (Menu) and Screen 2 (Cart) from docs/02-screens.md.
Do not touch other screens.

Backend:
- Create the menu_items table in SQLite and seed 15-20 realistic Indian canteen
  items on startup if the table is empty, with categories (Snacks, Meals,
  Beverages, Desserts), rupee prices, veg/non-veg flag, a short description and
  an emoji. Make 2-3 items sold out.
- Add GET /api/menu and GET /api/status (open/closed, decided by the backend
  using CANTEEN_TIMEZONE; ordering is open 9:00 AM to 4:45 PM IST).

Frontend:
- Search plus category tabs working together, sticky tabs, add/remove items,
  quantity controls with max 10, sticky cart bar, cart totals.
- Cart page with student name and roll number validation, and an empty-cart state.
- Sold-out items greyed out and disabled. "Ordering closed" banner when closed.
- Loading, error and empty states. Keep the cart if the page is refreshed.

- Implement order placement and Screen 3 (Order Status) from docs/02-screens.md\
and docs/03-flows-rules.md. Do not build the Kitchen Board, TV display or\
admin screens yet. Do not touch other screens.\
\
Backend:\
\- Create orders and order_items tables in SQLite. Store each item's name and\
&#x20; price at the time of ordering.\
\- POST /api/orders: validate student name, roll number, non-empty cart,\
&#x20; quantity 1-10 per item, and that every item exists and is available.\
&#x20; Recalculate the total on the server and ignore any total from the browser.\
&#x20; Reject orders when ordering is closed (use the existing backend open/closed\
&#x20; logic). Accept a client-generated request ID (UUID); if the same ID is sent\
&#x20; again, return the existing order instead of creating a new one.\
\- Daily token numbers start at 1 each IST day (CANTEEN_TIMEZONE), increase by 1,\
&#x20; and are never reused, including after cancellation. Token generation must be\
&#x20; safe against two simultaneous requests. Use an injectable clock so tests\
&#x20; don't depend on the real time.\
\- GET /api/orders/:id returns the order, its status, and the number of orders\
&#x20; ahead (Placed or Preparing, smaller token, same day).\
\- POST /api/orders/:id/cancel works only while the status is Placed. Cancelled\
&#x20; is a final status.\
\- Emit Socket.IO events when an order is created or cancelled.\
\- Orders from a previous IST day are returned as read-only with a flag.\
\
Frontend:\
\- Place Order sends the request with a UUID created per attempt, disables\
&#x20; itself while the request is running, and goes to /order/:id on success.\
&#x20; Clear the cart after success. Show backend errors clearly.\
\- Build /order/:id: huge token (about a third of the screen height), name and\
&#x20; items summary, progress steps (Placed -> Preparing -> Ready), estimated wait\
&#x20; at 5 min per order ahead ("You're next" when 0, hidden once Ready), Cancel\
&#x20; button only while Placed with a confirmation, Cancelled and Collected\
&#x20; messages, "Order not found" page, and the previous-day read-only banner.\
\- Update by itself through Socket.IO, with a polling fallback every 5 seconds\
&#x20; while disconnected. Show a "Reconnecting..." note when disconnected.\
\- Save the last order id in localStorage. Refreshing keeps the same order.\
\
Write Vitest tests for: sequential tokens, daily reset, duplicate request ID,\
quantity limit, sold-out rejection, closed-hours rejection, server-side total,\
and cancel only while Placed. Update docs/api.md. List the changed files and\
test commands. Test duplicate requests, page refreshes, invalid orders and\
daily token reset, and tell me exactly what you tested.
- Mobile-first at 390px, then responsive on laptop. Orange accent #F97316.
- Place Order only validates the form for now. Real order placement comes in the
  next step, so do not create orders yet.

Update docs/api.md. Test all interactions, including the 10-item limit and the
closed state. List the changed files and test commands.
Read AGENTS.md and docs/. Build only Screen 4 (Reception Dashboard) at
/reception from docs/02-screens.md and docs/03-flows-rules.md, plus the staff
PIN gate. Do not build Barber View, TV or Owner Settings. Do not change other
screens, except small changes needed so My Status reacts to Called, No-show and
Cancelled.

Staff PIN:
- Add POST /api/staff/login that checks STAFF_PIN and returns a token. All staff
  endpoints (reception actions, and later barber and admin) must reject requests
  without a valid token, on the BACKEND. /reception shows a PIN screen first;
  a wrong PIN shows a clear error. Keep the token in sessionStorage. Add a
  Logout button.

Backend (all queue rules stay in the ONE existing rules module):
- GET /api/reception: today's barbers with status, current customer and time
  info, plus the Waiting list in order with token, name, phone, services,
  preferred barber, waiting time and minutes waited. Previous-day spots are
  excluded.
- POST /api/reception/walk-in: same validation, token and phone rules as online
  joining, but allowed until closing time even when online joining is closed.
  It joins at the end of the queue.
- POST /api/reception/call-next with a barber id. The barber must be on duty,
  Available (not on break) and have no Called or In


Read AGENTS.md and docs/.

First, a small bug fix. On /reception, entering the staff PIN shows "Unable to
verify staff access." even though STAFF_PIN is set to 1234. Find the cause by
testing POST /api/staff/login against the running backend (curl) and the
browser request, explain it in 2 lines, and fix it. Add a test that logs in with
the correct PIN, rejects a wrong PIN, and handles a missing STAFF_PIN with a
clear message. Show the frontend a clear error for each case. Then continue.

Build only Screen 5 (Barber View, /barber/:name) and Screen 6 (Waiting Area TV,
/display) from docs/02-screens.md and docs/03-flows-rules.md. Do not build Owner
Settings. Do not change Reception or other screens, except small changes so they
react to the new statuses.

Barber View:
- Needs the staff PIN, reusing the existing staff login and token. The backend
  rejects barber actions without it. An unknown barber name shows a friendly
  error.
- Phone layout: current customer (token, name, services, timer since start), big
  [ Start ] when the customer is Called, then [ Done ] when In chair. "Next for
  you: S-15 Kunal (Haircut)" or "No one waiting for you" (earliest Waiting
  customer who chose this barber or "Any"). Toggle On break / Available.
- Backend: POST /api/queue/:id/start (only Called -> In chair, only by the
  assigned barber) and POST /api/queue/:id/done (only In chair -> Done). A barber
  cannot go on break while a customer is Called or In chair. Enforce
  forward-only transitions and one customer per chair on the BACKEND, with clear
  errors, using the existing rules module. Record start and finish times.
- Emit Socket.IO events on start, done and break changes so Reception, the TV,
  Home and the customer's My Status update within 5 seconds. My Status must show
  In chair and Done correctly.

TV display (public, no PIN):
- GET /api/display returns, for today only, the barbers on duty with their
  current customer token or Free / On break, and the next 5 Waiting tokens with
  estimated times.
- 1920x1080, dark background, gold accents, text readable from 5 metres. One row
  per barber: avatar, name, "Now: S-12" (or Free / On break). "Up next" list of 5
  tokens with estimated times. A newly Called token flashes gold for 5 seconds
  with a best-effort chime. No buttons, no navigation, no refresh needed.
  Reconnect automatically with a 5-second polling fallback. Empty state text.
  Labels from the EN/GU file.

Write Vitest tests for: start only from Called, done only from In chair, only the
assigned barber can start, wrong transitions rejected, break blocked while busy,
next-for-you picks the right customer, waiting time goes down after Done, and
the display endpoint output. Update docs/api.md. List changed files and test
commands, and tell me exactly what you tested and what you did not.

Read AGENTS.md and docs/. Build only Screen 7 (Owner Settings, /admin) from
docs/02-screens.md and docs/03-flows-rules.md. Do not change other screens,
except small changes so they react to settings changes.

Access: needs the staff PIN, reusing the existing staff login and token. All
admin endpoints reject requests without a valid token, on the BACKEND.

Services:
- Table of services: name in English, name in Gujarati, minutes, price, on/off
  toggle, Edit. [ + Add service ] opens a side panel form. No delete, only
  on/off, so past spots keep their snapshots.
- Backend validation: English and Gujarati names required (max 50 characters
  each), minutes a whole number from 5 to 180, price a whole rupee amount from 1
  to 9999. Return clear errors, shown in the form. Duplicate English names are
  rejected.
- Turning a service off hides it from Join (and from the walk-in form) but does
  not change spots that already include it.

Barbers and queue:
- Barbers on duty today: a toggle for each barber. A barber cannot be switched
  off duty while a customer is Called or In chair; show a clear error. When a
  barber is switched off duty, customers waiting for that barber see "Ravi is
  not available today", and Reception gets a [ Move to Any ] action on those
  customers (backend endpoint, staff token required).
- Queue switch: Open / Closed for online joining. Closed disables Join with the
  clear message on Home and Join, and walk-ins still work. Persist in SQLite.
  Use the existing joining-open rule module.

Stats cards (today only, IST): customers served (Done), average wait (minutes
from joining to starting, for customers who started), and no-shows. Cancelled
spots are not counted as served.

Realtime: emit Socket.IO events on every settings change so Home, Join,
Reception, Barber View and the TV refresh without a reload, within 5 seconds.

Frontend: tablet-friendly layout, also usable on a phone. Loading, error and
empty states, a "Reconnecting..." note and a 5-second polling fallback. Every
label from the EN/GU file. Charcoal and gold theme, tap targets at least 44px.
Disable buttons while requests run.


Read AGENTS.md and docs/. The MVP is complete. Act as a senior QA engineer and
audit the entire app by running it, not just reading the code. Use the test
checklist in docs/03-flows-rules.md and test every item, then these scenarios.

Main flow:
1. A customer opens Home, joins with services and a barber, and gets a token.
2. The customer appears on Reception.
3. Reception calls next for a free barber, and the customer's page shows "It's
   your turn" within 5 seconds and the TV flashes the token.
4. The barber taps Start, then Done, and Reception, the TV and the customer
   page update.
5. The wait time for others goes down.
6. The owner turns a service off and it disappears from Join.

Edge cases: empty or missing name, bad phone numbers (9 and 11 digits, letters),
no services selected, 4 services, a service turned off after selecting it, the
same phone joining twice, double-clicking Confirm, closed queue (owner switch),
online joining within 30 minutes of closing, walk-ins after online joining
closes, call next for a busy barber and an on-break barber, a Ravi-only customer
never given to another barber, two staff clicking Call next at once, invalid
status changes called directly through the API, No-show before and after 10
minutes, re-adding a no-show (new token at the end), cancel only while Waiting,
wrong and missing staff PIN on every staff endpoint, daily token reset, previous-day
spots read-only, page refresh on every screen, backend restart, two or more
windows, Socket.IO disconnect and reconnect, and English/Gujarati on every screen
with no overflow or untranslated text.

Final requirements: fix every reproducible bug, verify frontend and backend
validation, verify SQLite persistence, check responsive layouts (390px phone,
tablet landscape for /reception, 1920x1080 for /display), make sure there are no
non-functional buttons, add useful error messages and empty states, make sure no
localhost URLs are hard-coded, run the production build locally, and add
automated tests for any critical logic still untested. Do not deploy. Do not
redesign working screens and do not add features.

Finally provide: (1) the list of implemented features, (2) test results in
PASS/FAIL with how each was checked, (3) known limitations, (4) exact commands to
start the app, (5) localhost URLs for all seven screens, (6) remaining bugs. Do
not claim a feature works unless you actually tested it, and say clearly what you
could not test.

Write Vitest tests for: service validation (each rule), duplicate names, off
services excluded from the join list, off-duty barber blocked while busy, Move
to Any, queue switch blocking online joining but not walk-ins, stats calculation
(served, average wait, no-shows, cancelled excluded), and admin endpoints
rejecting a missing token. Update docs/api.md. List changed files and test
commands, and tell me exactly what you tested and what you did not.
