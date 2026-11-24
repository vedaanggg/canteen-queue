# Salon API plan

This API evolves incrementally. The health check, salon catalog, opening and
joining status, and queue estimate are implemented. Queue entries and all
Reception, Barber, Display, and Admin workflows remain planned.

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
| POST | `/api/queue` | Create a queue entry after confirmation. | Planned; not created in this step |
| GET | `/api/queue/:id` | Return an individual's queue status. | Planned |
| GET | `/api/reception/queue` | Reception queue view. | Planned |
| GET | `/api/barbers/:name/queue` | Barber queue view. | Planned |
| GET | `/api/display` | Public salon waiting display data. | Planned |
| GET/POST/PATCH/DELETE | `/api/admin/*` | Salon services, barber, and setting management. | Planned |

The estimate endpoint and Join screen do not create queue entries. Unknown
`/api` routes return HTTP 404. Future route payloads and staff authorization
must be finalized before implementation.

## SQLite tables

- `services`: English and Gujarati service names, duration in minutes, price in
  rupees, and an enabled switch. Six example services are seeded if empty.
- `barbers`: name, emoji avatar, on-duty switch, and status (`free`, `busy`, or
  `on_break`). Ravi, Amit, and Imran are seeded if empty; Imran is on break.
- `salon_settings`: singleton owner switch for online joining, enabled by
  default. No queue-entry table exists yet.

## Socket.IO events

| Direction | Event | Payload | Status |
| --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ "connected": true }` | Implemented |
| Server → clients | `queue:updated` | To be defined with queue lifecycle requirements. | Planned |
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
unknown/off-duty or on-break barbers. The response includes `serviceIds`,
`barber`, `totalMinutes`, `totalPrice`, `waitingCount`, and
`expectedWaitMinutes`. Until queue entries are implemented, waiting count and
expected wait are zero.
