# Flows & Rules

## Flow: remote customer
1. Opens Home -> Join -> picks Haircut + "Any barber" -> gets S-14, 6th in line
2. Watches My Status from home; at 2nd in line sees "Start coming"
3. Receptionist taps Call next on Amit's card -> S-14 becomes Called
4. Customer's phone shows "It's your turn! Go to Amit"; TV flashes S-14
5. Amit taps Start (In chair), then Done -> S-14 leaves the queue

## Flow: walk-in
Receptionist taps + Add walk-in -> name, phone, services, barber -> joins the
same queue at the end (first come, first served).

## Statuses
- Waiting -> Called -> In chair -> Done. Never backwards, never skipping.
- Waiting -> Cancelled (by the customer or the receptionist).
- Called -> No-show (by the receptionist, only after 10 minutes of being Called).
- Done, Cancelled and No-show are final.
- Invalid status changes are rejected by the BACKEND with a clear error.

## Tokens
- Tokens look like S-1, S-2... and restart from S-1 every IST day.
- Tokens are never reused on the same day, even after cancel or no-show.
- Duplicate submissions (double tap, repeated request) create only one spot. The
  client sends a unique request ID; the same ID returns the existing spot.

## Who is next ("Call next")
- First come, first served.
- Call next for barber X picks the earliest Waiting customer who chose X or "Any".
- A customer who chose Ravi is never given to another barber.
- Call next is allowed only if barber X is Available and has no Called or
  In chair customer. A barber on break cannot be called for.
- A barber has only one customer in the chair at a time.
- If two staff tap Call next at once, only one customer is called and the other
  request gets a clear error (no double-calling the same customer).

## Waiting time
- "Any barber" customer: (total service minutes of Waiting customers ahead +
  remaining minutes of customers currently Called or In chair) ÷ number of
  barbers working.
- Customer who chose a specific barber: use only that barber's own queue
  (customers ahead who chose that barber, plus that barber's current customer).
- Round up to the next 5 minutes. Show "You're next" when the wait is 0.
- Rough estimate only. It goes down as customers finish.

## Joining rules
- Phone number: exactly 10 digits. Name required.
- 1 to 3 services; only services that are switched on can be chosen.
- One active spot per phone number (Waiting, Called or In chair). A second try
  shows the existing spot.
- The backend calculates total minutes and price from current service data and
  stores a snapshot of each service name, minutes and price on the spot.
- Online joining is closed when the owner switches the queue to Closed, or
  within 30 minutes of closing time. Walk-ins by reception are allowed until
  closing time.
- Opening hours: 10:00 AM to 9:00 PM IST (change to your own). The backend
  decides open/closed using IST; the frontend only shows what the backend says.
- If the chosen barber is on break: the customer sees "Ravi is on break" and
  stays in the queue.
- If a barber is switched off duty while customers waiting for them exist, those
  customers see a message and the receptionist can move them to "Any".

## No-show and cancel
- Called but not arrived in 10 minutes -> receptionist can mark No-show.
- If a no-show customer arrives later, they are added again at the END with a
  NEW token. The old spot stays as No-show.
- Cancel is only possible while Waiting.
- Cancelled and No-show customers are not counted as served in today's stats.

## Staff PIN
- /reception, /barber/:name and /admin need the staff PIN (env var STAFF_PIN).
  The backend rejects staff actions without it. The PIN is a simple shared code,
  not a login system.
- Customers screens and /display are public.

## Time and old spots
- All time rules use Asia/Kolkata (SALON_TIMEZONE), never the server's local
  time. "Today" means the current IST calendar day.
- Spots from a previous day are hidden from Reception, Barber View and TV, stay
  in the database, and open read-only on /status/:id with a banner.

## Realtime and persistence
- All screens update automatically through Socket.IO, within about 5 seconds.
- If Socket.IO disconnects, show "Reconnecting...", poll every 5 seconds, and
  refetch the latest data on reconnect.
- Spots, services and barbers are stored in SQLite and survive a backend restart.
  (On Render's free tier the file is wiped on restart; the seed data returns.)
- Sound and vibration are best-effort and fail silently if blocked.

## Languages
- Every label comes from the English/Gujarati language file. The choice is
  remembered. Long Gujarati text must not overflow.

## Test checklist
[ ] Join with 2 services -> correct total time and price shown
[ ] Phone with fewer or more than 10 digits is rejected (frontend and backend)
[ ] Selecting a 4th service is blocked
[ ] Same phone joins twice -> shown the existing spot, no duplicate
[ ] Double-clicking Confirm creates only one spot
[ ] Tokens are sequential (S-1, S-2...) and restart on a new day
[ ] Call next for Amit skips a customer who chose Ravi
[ ] Call next picks the earliest customer who chose Amit or Any
[ ] Call next is blocked for a barber who is busy or on break
[ ] Call next -> customer's phone shows "It's your turn" within 5 s
[ ] Start/Done on Barber View updates Reception, TV and customer page
[ ] Invalid status changes (backwards, skipping) are rejected by the backend
[ ] No-show is blocked before 10 minutes; after that it works
[ ] No-show, then re-add -> goes to the end of the queue with a new token
[ ] Cancel works only while Waiting
[ ] Closing online queue -> Join button disabled with message; walk-ins still work
[ ] Within 30 min of closing -> online join closed
[ ] Staff screens reject a wrong PIN, and the backend rejects staff actions without it
[ ] Turning a service off hides it from Join
[ ] Language toggle switches all labels to Gujarati, with no overflow
[ ] Waiting time goes down as customers finish
[ ] Refreshing My Status keeps the same spot
[ ] Phone, tablet and TV windows all stay in sync
[ ] Socket.IO disconnect -> reconnect recovers the latest state
[ ] Spots and settings survive a backend restart (locally)

## Testing
- Use Vitest for backend queue-logic tests. Time must be injectable so closing
  time, 10-minute no-show and daily-reset tests don't depend on the real clock.
