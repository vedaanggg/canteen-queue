# Salon API plan

This is a plan only. Step 1 implements the health check and generic server
scaffold; salon endpoints, database tables, and business events are not built.

## Environment

- `VITE_API_URL`: API base URL used by the browser.
- `CLIENT_ORIGIN`: allowed browser origin for Express and Socket.IO.
- `PORT`: backend listen port (default `3001`).
- `DATABASE_PATH`: SQLite file path (default `./data/salon.sqlite`).
- `SALON_TIMEZONE`: optional salon timezone for future appointment rules.
- `STAFF_PIN`: optional server-only PIN setting for a future staff access flow.

## HTTP endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/health` | Check that the Express API and SQLite connection respond. | Implemented |
| GET | `/api/services` | Proposed public service catalog for the join flow. | Planned |
| POST | `/api/appointments` | Proposed appointment request submission. | Planned |
| GET | `/api/appointments/:id` | Proposed appointment status lookup. | Planned |
| GET | `/api/reception/appointments` | Proposed reception appointment list. | Planned |
| GET | `/api/barbers/:name/appointments` | Proposed barber-specific appointment list. | Planned |
| GET | `/api/display` | Proposed salon display data. | Planned |
| GET/POST/PATCH/DELETE | `/api/admin/*` | Salon configuration and management API, details pending requirements. | Planned |

The planned routes are provisional placeholders derived from the seven
frontend route names. Their fields, authorization, validation, and behavior
must be specified before implementation. All unknown `/api` paths currently
return HTTP 404.

## SQLite tables

No salon-specific tables are created in Step 1. Candidate tables for a later
design are `services`, `barbers`, and `appointments`; relationships, fields,
retention, and appointment lifecycle are not yet specified.

## Socket.IO events

| Direction | Event | Payload | Status |
| --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ "connected": true }` | Implemented |
| Server → clients | `appointments:updated` | To be defined with appointment requirements. | Planned |
| Server → clients | `display:updated` | To be defined with display requirements. | Planned |

The browser HTTP and Socket.IO clients use `VITE_API_URL`; CORS uses
`CLIENT_ORIGIN`. No salon events are emitted in Step 1.
