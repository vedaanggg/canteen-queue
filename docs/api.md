# Salon API plan

This API evolves incrementally. The health check, salon catalog, opening and
joining status, queue estimate, customer joining, status, cancellation,
Reception, Barber View, Waiting Area Display and Owner Settings are implemented.

## Environment

- `VITE_API_URL`: browser API base URL.
- `CLIENT_ORIGIN`: allowed frontend origin for Express and Socket.IO.
- `PORT`: backend listen port (default `3001`).
- `DATABASE_PATH`: SQLite file path (default `./data/salon.sqlite`).
- `SALON_TIMEZONE`: IANA timezone for salon hours (defaults to `Asia/Kolkata`).
- `SALON_STATUS_OVERRIDE`: optional `open` or `closed` test override; blank
  follows the salon hours and owner joining switch.
- `STAFF_PIN`: server-only PIN required to issue a staff bearer token.

## HTTP endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/health` | Check that Express and SQLite respond. | Implemented |
| GET | `/api/services` | List enabled services with bilingual names, minutes, and prices. | Implemented |
| GET | `/api/barbers` | List on-duty barbers and their status. | Implemented |
| GET | `/api/status` | Return salon hours, joining availability, and wait summary. | Implemented |
| GET | `/api/queue/estimate?serviceIds=1,2&barber=any` | Validate selected services and return totals and wait estimate. | Implemented |
| POST | `/api/queue` | Create a customer spot, or return the existing spot for a repeated request UUID/active phone. | Implemented |
| GET | `/api/queue/:id` | Return the spot, saved service snapshot, position, estimated wait, barber-break and previous-day flags. | Implemented |
| POST | `/api/queue/:id/cancel` | Cancel a same-day Waiting spot. | Implemented |
| POST | `/api/staff/login` | Validate the configured staff PIN and issue a bearer token. | Implemented |
| POST | `/api/staff/logout` | Revoke the current staff token. | Implemented |
| GET | `/api/reception` | Return today's barber cards and active queue entries. | Implemented |
| POST | `/api/reception/walk-in` | Add a same-day walk-in, even during the online-joining cutoff. | Implemented |
| POST | `/api/reception/call-next` | Call the earliest eligible Waiting spot for a barber. | Implemented |
| POST | `/api/reception/:id/cancel` | Cancel a Waiting spot as staff. | Implemented |
| POST | `/api/reception/:id/no-show` | Mark a Called customer No-show after 10 minutes. | Implemented |
| GET | `/api/barbers/:name/view` | Return an on-duty barber's current customer and next eligible Waiting customer. | Implemented; staff token required |
| POST | `/api/queue/:id/start` | Assigned barber moves Called to In chair and records start time. | Implemented; staff token required |
| POST | `/api/queue/:id/done` | Assigned barber moves In chair to Done and records finish time. | Implemented; staff token required |
| POST | `/api/barbers/:id/break` | Set an on-duty barber to `on_break` or `free`; active Called/In chair customers block break. | Implemented; staff token required |
| GET | `/api/display` | Public today-only barber state and next five Waiting tokens with wait estimates. | Implemented |
| GET | `/api/admin` | Return all services, all barbers, online joining switch, and today's stats. | Implemented; staff token required |
| POST | `/api/admin/services` | Add a service after validating bilingual names, duration, price, and duplicate English names. | Implemented; staff token required |
| PATCH | `/api/admin/services/:id` | Edit service details without deleting prior snapshots. | Implemented; staff token required |
| PATCH | `/api/admin/services/:id/state` | Turn a service on or off. | Implemented; staff token required |
| PATCH | `/api/admin/barbers/:id/duty` | Switch a barber on or off duty; active Called/In chair assignments block off-duty. | Implemented; staff token required |
| PATCH | `/api/admin/queue` | Persist the online joining Open/Closed switch. | Implemented; staff token required |
| POST | `/api/admin/queue/:id/move-to-any` | Move an eligible Waiting customer's unavailable barber preference to Any. | Implemented; staff token required |

The Join screen creates spots through `POST /api/queue`. Reception can call a
Waiting spot and mark it No-show after 10 minutes. Barber View handles In chair
and Done transitions. Unknown `/api` routes return HTTP 404.

All staff routes other than `POST /api/staff/login` require
`Authorization: Bearer <token>`. Login issues a random in-memory token after a
constant-time PIN comparison; logout revokes it. Tokens are invalidated by a
backend restart. If `STAFF_PIN` is unset, login returns HTTP 503.

## SQLite tables

- `services`: English and Gujarati service names, duration in minutes, price in
  rupees, and an enabled switch. Six example services are seeded if empty.
- `barbers`: name, emoji avatar, on-duty switch, and status (`free`, `busy`, or
  `on_break`). Ravi, Amit, and Imran are seeded if empty; Imran is on break.
- `salon_settings`: singleton owner switch for online joining, enabled by
  default.
- `queue_entries`: daily token, unique client request UUID, customer details,
  preferred barber, assigned barber, status, totals and created/status/started/
  finished timestamps. An active
  spot is checked for the same phone on the current salon day.
- `queue_entry_services`: immutable English/Gujarati name, duration and price
  snapshot for each service selected when joining.
- `queue_token_counters`: last token number per salon-local calendar day, so
  tokens restart daily and cancelled tokens are not reused.

## Socket.IO events

| Direction | Event | Payload | Status |
| --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ "connected": true }` | Implemented |
| Server → clients | `queue:updated` | Status changes: `{ action, id, token, status }`; barber changes: `{ action: "barber", barberId, barberName, status }` | Implemented for join, cancel, call-next, no-show, start, done and break |
| Server → clients | `salon:updated` | `{ action, ...settingDetails }` for service, barber duty, queue switch and preference changes. | Implemented |

Socket.IO CORS uses `CLIENT_ORIGIN`; the browser connects through
`VITE_API_URL`. Settings changes also emit a compatibility `queue:updated`
event with `action: "settings"` so Home, Join, Reception, Barber View, TV and
My Status refetch promptly.

## Implemented response rules

`GET /api/services` returns `{ services: [{ id, nameEn, nameGu,
durationMinutes, price }] }` and only returns services that are enabled.
`GET /api/barbers` returns `{ barbers: [{ id, name, avatar, status }] }` and
only returns barbers on duty.

`GET /api/status` returns `isOpen`, `status`, `openingTime` (`10:00`),
`closingTime` (`21:00`), `onlineJoiningOpen`, `onlineJoiningEnabled`,
`waitingCount`, `estimatedWaitMinutes`, `currentTime`, `timezone`, and the
active override. Salon hours use `SALON_TIMEZONE`. Online joining is available
only while the salon is open, the owner switch is on, and the time is earlier
than 30 minutes before closing. The test override forces both the salon status
and online-joining status open or closed.

`GET /api/queue/estimate` takes comma-separated `serviceIds` and a `barber`
name or `any`. It validates 1–3 distinct enabled service IDs and rejects
unknown/off-duty barbers. An on-duty barber on break may be selected; the spot
reports that break state. The response includes `serviceIds`, `barber`,
`totalMinutes`, `totalPrice`, `waitingCount`, and `expectedWaitMinutes`.

`POST /api/queue` accepts `{ name, phone, serviceIds, barber, requestId }`.
The request ID must be a UUID; `barber` is a duty barber name or `any`. The
backend validates the phone and selected services, calculates totals from the
current catalog, checks the online joining rule, allocates an IST-day token in
one transaction, and snapshots the selected service details. It returns
`{ spot, existing, message? }` with HTTP 201 for a new spot or HTTP 200 when
the request UUID or phone already has an active spot that day. Errors use
`{ error, code }`.

`GET /api/queue/:id` returns `{ spot }`. Spot fields include `id`, `token`,
`tokenDay`, `name`, `phone`, `barber`, `status`, `services`, totals,
`position`, `waitingCount`, `expectedWaitMinutes`, `isBarberOnBreak`,
`previousDay`, and `readOnly`. A previous-day spot retains its saved status,
has no live position/wait, and cannot be cancelled.

`POST /api/queue/:id/cancel` returns `{ spot }` and only changes a same-day
Waiting spot to final status `Cancelled`. Other statuses and previous-day spots
return HTTP 409.

Wait estimates use the rule in `queueRulesService.js`: service minutes ahead
plus remaining time for Called/In chair work, divided by active working barbers
for Any; a specific barber uses that barber's eligible queue and current work.
Positive estimates round up to the next 5 minutes; zero remains zero. The queue
is initially empty, so estimates start at zero.

On creation and cancellation the server emits `queue:updated` with
`{ action: "joined" | "cancelled", id, token, status }`. The client listens
for queue updates and uses 5-second polling while disconnected. Call-next and
No-show, Start and Done also emit `{ action: "status", id, token, status }`,
allowing Home, Barber View, Reception, TV and customer status pages to refresh.
Break changes emit `{ action: "barber", barberId, barberName, status }`. Screens
poll every five seconds while disconnected and refetch after reconnecting.

`GET /api/reception` returns `{ date, barbers, waitingList, called, inChair }`.
The lists are restricted to the current `SALON_TIMEZONE` date. Queue entries
include their service snapshots and preferred barber; Called/In chair entries
also include the assigned barber and status timing. Barber cards include status
and their assigned current customer, if any.

`POST /api/reception/walk-in` accepts the same body as `POST /api/queue` and
uses the same name, phone, service, barber, duplicate-phone and token rules.
It bypasses the online-joining cutoff but is rejected once the salon is closed.

`POST /api/reception/call-next` accepts `{ barberId }`. In one transaction, the
backend requires an on-duty, free barber without a Called/In chair customer and
assigns the earliest Waiting spot that selected that barber or `any`. The
assignment is saved on the spot, and the barber is marked busy. Conflicting
requests return HTTP 409.

Reception cancellation only accepts Waiting spots. `POST
/api/reception/:id/no-show` accepts only a same-day Called spot after at least
10 minutes from its call time, then releases the assigned barber. Called spots
cannot be cancelled under the status transition rule; they remain reserved
until In chair or No-show. This follows `docs/03-flows-rules.md`'s rule that
staff cancel only Waiting customers.

`GET /api/barbers/:name/view` requires a staff bearer token and returns
`{ barber, nextCustomer }`. The current customer is a same-day Called or In
chair spot assigned to that barber. The next customer is the earliest Waiting
spot that chose that barber or `any`. Unknown or off-duty names return
`BARBER_NOT_FOUND` with HTTP 404.

`POST /api/queue/:id/start` and `/done` both require a staff bearer token and a
`barberId`. Start accepts only a same-day Called spot assigned to that barber,
changes it to In chair and records `started_at`. Done accepts only an In chair
spot assigned to that barber, changes it to Done, records `finished_at`, and
frees the barber when no other active spot is reserved. Both transitions are
transactional and return HTTP 409 for invalid transitions or conflicts.

`POST /api/barbers/:id/break` requires `{ onBreak: boolean }` and a staff token.
It changes the barber to `on_break` or `free`; an assigned Called or In chair
spot prevents the change. It emits a barber `queue:updated` event so connected
screens refresh.

`GET /api/display` is public and returns `{ date, barbers, upNext }`. It includes
only today's on-duty barbers and up to five Waiting spots, with each barber's
status (`called`, `in_chair`, `free`, or `on_break`) and `currentToken`, plus the
next tokens' expected wait estimates. The TV flashes and attempts a short chime
when it receives a Called event; sound failure is ignored.

All `/api/admin/*` endpoints require `Authorization: Bearer <token>`. The
`GET /api/admin` response is `{ date, services, barbers, queueOpen, stats }`;
services include on/off state and barbers include today's duty state. Stats are
IST-day-only: `served` counts Done, `noShows` counts No-show, and
`averageWaitMinutes` averages minutes between `created_at` and `started_at` for
spots that started. Cancelled spots do not count as served.

`POST /api/admin/services` accepts `{ nameEn, nameGu, durationMinutes, price,
isOn? }`. Both names are required and at most 50 characters; English names are
unique ignoring case. Duration must be an integer from 5–180 and price an
integer from ₹1–₹9,999. `PATCH /api/admin/services/:id` edits the same fields;
`PATCH /api/admin/services/:id/state` accepts `{ isOn }`. There is no delete
operation, so existing queue service snapshots remain unchanged. Disabled
services are excluded from the customer and Reception catalogs and rejected for
new spots.

`PATCH /api/admin/barbers/:id/duty` accepts `{ onDuty }`. Turning a barber off
duty is rejected while they own a same-day Called or In chair spot. Waiting
customers who selected that barber remain in line and get an unavailable flag;
Reception can call the Move to Any action through
`POST /api/admin/queue/:id/move-to-any`, which only accepts a same-day Waiting
spot whose selected barber is off duty.

`PATCH /api/admin/queue` accepts `{ open }` and persists it in
`salon_settings.online_joining_enabled`. The existing `queueRulesService.js`
applies this switch with opening hours and the 30-minute cutoff. It disables
online joining while leaving walk-ins available during salon hours.
