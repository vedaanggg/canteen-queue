# Salon API plan

This API evolves incrementally. The health check, salon catalog, opening and
joining status, queue estimate, customer joining, status and cancellation are
implemented. Reception, Barber, Display, and Admin workflows remain planned.

## Environment

- `VITE_API_URL`: browser API base URL.
- `CLIENT_ORIGIN`: allowed frontend origin for Express and Socket.IO.
- `PORT`: backend listen port (default `3001`).
- `DATABASE_PATH`: SQLite file path (default `./data/salon.sqlite`).
- `SALON_TIMEZONE`: IANA timezone for salon hours (defaults to `Asia/Kolkata`).
- `SALON_STATUS_OVERRIDE`: optional `open` or `closed` test override; blank
  follows the salon hours and owner joining switch.
- `STAFF_PIN`: optional server-only PIN for a future staff access flow.

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
| GET | `/api/reception/queue` | Reception queue view. | Planned |
| GET | `/api/barbers/:name/queue` | Barber queue view. | Planned |
| GET | `/api/display` | Public salon waiting display data. | Planned |
| GET/POST/PATCH/DELETE | `/api/admin/*` | Salon services, barber, and setting management. | Planned |

The Join screen creates spots through `POST /api/queue`. Queue status transitions
to Called, In chair, Done or No-show are intentionally not exposed yet. Unknown
`/api` routes return HTTP 404. Future staff route payloads and authorization
must be finalized before implementation.

## SQLite tables

- `services`: English and Gujarati service names, duration in minutes, price in
  rupees, and an enabled switch. Six example services are seeded if empty.
- `barbers`: name, emoji avatar, on-duty switch, and status (`free`, `busy`, or
  `on_break`). Ravi, Amit, and Imran are seeded if empty; Imran is on break.
- `salon_settings`: singleton owner switch for online joining, enabled by
  default.
- `queue_entries`: daily token, unique client request UUID, customer details,
  preferred barber, status, totals and timestamps. A partial active spot is
  checked for the same phone on the current salon day.
- `queue_entry_services`: immutable English/Gujarati name, duration and price
  snapshot for each service selected when joining.
- `queue_token_counters`: last token number per salon-local calendar day, so
  tokens restart daily and cancelled tokens are not reused.

## Socket.IO events

| Direction | Event | Payload | Status |
| --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ "connected": true }` | Implemented |
| Server → clients | `queue:updated` | `{ action: "joined" | "cancelled", id, token, status }` | Implemented for customer join/cancel |
| Server → clients | `salon:updated` | To be defined with salon settings requirements. | Planned |

Socket.IO CORS uses `CLIENT_ORIGIN`; the browser connects through
`VITE_API_URL`. No salon update events are emitted yet.

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
for matching spot IDs and uses 5-second polling while disconnected. No events
are emitted for future staff-driven status changes until those routes exist.
