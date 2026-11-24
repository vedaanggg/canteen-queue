# Flows & Rules

## Main flow
1. Student adds items on Menu -> Cart -> enters name + roll no. -> Place Order
2. Student sees token #42 on Order Status (status: Placed)
3. Order appears in the NEW column on the Kitchen Board
4. Kitchen taps Start -> Preparing; customer page updates by itself
5. Kitchen taps Ready -> TV shows #42 under "Ready to Collect"; student's phone
   turns green
6. Student collects; counter taps Collected -> token leaves the TV and the
   kitchen board
7. Owner marks an item Sold out -> the customer menu shows it greyed out

## Order statuses
- Placed -> Preparing -> Ready -> Collected. Never backwards, never skipping.
- Kitchen board names: NEW (= Placed), PREPARING, READY.
- Customer can cancel only while the status is Placed.
- Invalid status changes are rejected by the BACKEND with a clear error,
  not just hidden in the frontend.

## Token rules
- Token numbers start from 1 every day and increase by 1 for each order.
- Tokens are never reused on the same day, even if an order is cancelled.
- Duplicate submissions (double tap, repeated request) must create only one order.

## Waiting time
- Estimated wait = about 5 minutes per order ahead of you (orders that are
  Placed or Preparing with a smaller token). Rough estimate only.

## Order rules
- Max 10 of any one item per order (checked on frontend AND backend).
- Student name and roll number are required.
- Cart must have at least one item.
- The backend calculates the total from current prices. It never trusts the
  browser's total.
- Sold-out or deleted items cannot be ordered. If an item in the cart goes
  Sold out, show a message and remove it.
- No orders after 4:45 PM (canteen closes 5 PM): show "Ordering closed".
  The backend rejects such orders too.

## Realtime and persistence
- All screens update automatically (Socket.IO), within ~5 seconds at most.
- All orders and menu items are saved in SQLite. They survive a page refresh
  and a backend restart.
- If Socket.IO disconnects, the screen reconnects and shows the latest data.

## Edge cases
- Empty cart -> Place Order disabled
- Missing name or roll no. -> error shown, order not placed
- Quantity above 10 -> blocked with a message
- Sold-out item in cart -> message shown, item removed
- Order placed after 4:45 PM -> "Ordering closed"
- Unknown order id -> "Order not found"
- Refresh during an active order -> same order and status still shown
- Two or more browser windows open -> all stay in sync

## Test checklist
[ ] Add 3 items, place order -> get token, total is correct
[ ] Second and third orders get sequential tokens (#2, #3)
[ ] Empty cart -> Place Order button is disabled
[ ] Name or roll no. missing -> error shown, order not placed
[ ] Quantity above 10 is blocked (frontend and backend)
[ ] New order appears on the Kitchen Board without refresh
[ ] Start/Ready on kitchen board -> customer page updates by itself
[ ] Ready token appears on the TV and animates for 5 seconds
[ ] Collected order disappears from kitchen board and TV
[ ] Cannot move an order backwards or skip a status (test via backend too)
[ ] Cancel works only while Placed
[ ] Mark item Sold out -> greyed out on Menu immediately
[ ] Sold-out item in cart -> message shown, item removed
[ ] Order after 4:45 PM -> "Ordering closed", backend rejects it
[ ] Double-clicking Place Order creates only one order
[ ] Refreshing Order Status keeps the same order
[ ] Orders and menu changes survive a backend restart
[ ] Token numbers restart from 1 on a new day
[ ] Admin add, edit, delete work and summary cards are correct
[ ] Whole flow works on a phone screen (390px)
[ ] Two browser windows (customer + kitchen) stay in sync
[ ] Socket.IO disconnect -> reconnect recovers the latest state

## Time and timezone
- All time rules use the canteen timezone: Asia/Kolkata (IST), set by env var
  CANTEEN_TIMEZONE. Never use the server's local time (Render servers run UTC).
- "Today" for token reset and summary cards = the current IST calendar day.
- Ordering cutoff is checked by the backend at the moment the order is submitted.
  Before 4:45:00 PM = accepted. After = rejected, even if the cart was open earlier.

## Cancellation
- Cancelled is a final status. Only the customer can cancel, only while Placed.
  Staff have no cancel button in the MVP.
- Cancelled orders disappear from the Kitchen Board and the TV. Their token is
  never reused. They are NOT counted in the summary cards.
- Realtime: a cancel is broadcast like any other status change.

## Duplicate submissions and refresh
- The cart creates a unique request ID (UUID) for each order attempt. If the
  backend gets the same ID again, it returns the existing order instead of
  creating a new one.
- The order id is in the URL (/order/:id). The last order id is also saved in
  the browser (localStorage) so the student can get back to it.

## Waiting time details
- Wait = 5 min x number of orders ahead (Placed or Preparing, smaller token).
- If 0 orders ahead, show "You're next". Hide the estimate once Ready.

## Summary cards
- Orders today = non-cancelled orders placed today.
- Items sold = total quantity across those orders.
- Top-selling item = highest total quantity; if tied, show the first alphabetically.
- Order records store the item name and price at the time of ordering, so
  deleted or edited menu items don't change past orders.

## Menu item rules
- Categories are fixed (Snacks, Meals, Beverages, Desserts); the owner picks one.
- Name required (max 50 chars). Price is a whole rupee amount from 1 to 999.
  Description optional (max 120 chars).

## Sound, vibration and connection
- Sound and vibration are best-effort. If the browser blocks them, fail silently.
- If Socket.IO disconnects, show a small "Reconnecting..." note, refetch the
  latest data on reconnect, and poll every 5 seconds while disconnected.

## Testing
- Use Vitest for backend business-logic tests. Time must be injectable
  (a clock function) so cutoff and daily-reset tests don't depend on the real clock.

## Opening hours and old orders
- Ordering is open from 9:00 AM to 4:45 PM IST (change 9 AM to your canteen's
  real opening time). The backend decides open/closed using IST time; the
  frontend only displays what the backend says (e.g. GET /api/status).
- At the start of each new IST day, any active order from a previous day
  (Placed, Preparing or Ready) is hidden from the Kitchen Board and TV.
  It stays in the database.
