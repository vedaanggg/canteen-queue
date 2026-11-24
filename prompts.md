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
