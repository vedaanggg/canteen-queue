# API, database, and realtime plan

This document describes the application contract. Endpoints and events are
marked implemented when they are available in the code; future-step contracts
remain marked planned.

## Environment

- `VITE_API_URL`: base URL used by the frontend for HTTP API requests and the
  Socket.IO connection.
- `CLIENT_ORIGIN`: allowed frontend origin for Express CORS and Socket.IO.
- `PORT`: backend listening port (local default: `3001`).
- `DATABASE_PATH`: SQLite file path, resolved from the server working directory
  (local default: `./data/canteen.sqlite`).
- `CANTEEN_TIMEZONE`: timezone for all canteen time rules.
- `ORDERING_STATUS_OVERRIDE`: optional `open` or `closed` override for testing.
  Omit or leave blank to follow the configured timezone schedule. Any other
  non-empty value makes the backend fail on startup rather than silently ignore it.

## HTTP endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/health` | Confirm the backend and SQLite are available. Returns `{ "status": "ok", "service": "canteen-queue-api" }`. | Implemented in Step 1 |
| GET | `/api/status` | Return ordering availability and current canteen time. | Implemented |
| GET | `/api/menu` | Return menu items, including sold-out items, and categories. | Implemented |
| GET | `/api/kitchen` | Return today's active Placed, Preparing, and Ready orders with item snapshots. | Implemented |
| POST | `/api/orders` | Create an order with a UUID idempotency request ID; validates availability/open hours and calculates prices/totals on the server. | Implemented |
| GET | `/api/orders/:id` | Return order details, saved status, queue estimate and previous-day read-only flags. | Implemented |
| POST | `/api/orders/:id/status` | Advance exactly one forward status step; rejects stale, invalid, final, and previous-day changes. | Implemented |
| POST | `/api/orders/:id/cancel` | Cancel an order only while status is Placed. | Implemented |
| GET/POST/PATCH/DELETE | `/api/admin/menu-items` | List, add, edit, or delete menu items. | Planned |
| GET | `/api/admin/summary` | Return today's order count, item quantity total, and top seller. | Planned |

## SQLite tables

- `menu_items`: menu name, category, whole-rupee price, description, emoji,
  veg flag, availability, and creation/update timestamps. If empty at startup,
  the backend seeds 19 sample canteen items across the four fixed categories.
- `orders`: UUID order ID, unique request ID, daily token, service day in
  `CANTEEN_TIMEZONE`, student and roll details, status, total, and timestamps.
  Tokens start at 1 each day, are allocated transactionally, and stay consumed
  after cancellation.
- `order_items`: order reference and a snapshot of item name, unit price,
  quantity, and line total so menu edits do not change past orders.

## Socket.IO events

| Direction | Event | Payload | Purpose | Status |
| --- | --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ connected: true }` | Confirm the realtime connection. | Implemented in Step 1 |
| Server → clients | `menu:updated` | Updated menu item or menu snapshot (to be finalized with menu API). | Refresh menu views after owner changes. | Planned |
| Server → clients | `order:created` | `{ id, status, tokenNumber, serviceDay }` | Notify connected order and kitchen views. | Implemented |
| Server → clients | `order:updated` | `{ id, tokenNumber, status, serviceDay }` | Synchronize kitchen, tracking, and display views. | Implemented |
| Server → clients | `order:cancelled` | `{ id, status, tokenNumber, serviceDay }` | Notify connected order and kitchen views. | Implemented |

Order create/cancel/status events carry compact summary objects as shown above.

## Implemented response shapes

### `GET /api/menu`

Returns HTTP 200:

```json
{
  "categories": ["Snacks", "Meals", "Beverages", "Desserts"],
  "items": [
    {
      "id": 1,
      "name": "Samosa",
      "category": "Snacks",
      "price": 20,
      "description": "Crisp pastry with spiced potato filling.",
      "emoji": "🥟",
      "isVegetarian": true,
      "isAvailable": true
    }
  ]
}
```

Sold-out items are included with `isAvailable: false` so the menu can show them
disabled. The client combines category and name filtering locally.

### `GET /api/status`

Returns HTTP 200 with `isOpen`, `status` (`open` or `closed`), `openingTime`
(`09:00`), `orderingCutoff` (`16:45`), `canteenClosingTime` (`17:00`),
`currentTime` in `timezone`, and `override` (`open`, `closed`, or `null`).
Opening and cutoff decisions use the configured timezone. The cutoff is exclusive:
ordering is closed at 4:45:00 PM. A test override takes precedence over the clock.

### Orders

`POST /api/orders` accepts `{ requestId, studentName, rollNumber, items }`,
where `requestId` is a UUID and each item is `{ id, quantity }`. Name and roll
number are required, the cart must be non-empty, each quantity must be 1–10,
and every menu item must exist and be available. The backend rejects closed
ordering hours, looks up current menu prices, calculates the total, and saves
item name/price snapshots. A browser-supplied total is ignored. A new order
returns HTTP 201 with `{ order, duplicate: false }`; reusing a request ID returns
HTTP 200 with the original `{ order, duplicate: true }` without creating a
second order. Errors return `{ error, code }`.

`GET /api/orders/:id` returns `{ order }`, including order items, status,
`ordersAhead`, `isPreviousDay`, and `readOnly`. `ordersAhead` counts smaller
tokens from the same day whose status is Placed or Preparing. For previous-day
orders the last saved status is returned with `isPreviousDay: true`,
`readOnly: true`, and `ordersAhead: null`; those orders cannot be cancelled.

`POST /api/orders/:id/cancel` returns `{ order }` after changing a current-day
Placed order to the final status Cancelled. Other statuses and previous-day
orders are rejected. Token numbers are not reused after cancellation.

### Kitchen Board

`GET /api/kitchen` returns `{ orders }` for the current `CANTEEN_TIMEZONE`
calendar day, ordered by token. Each order includes its ID, token, student
name, status, creation time, and item name/quantity snapshots. Only Placed,
Preparing, and Ready orders are included.

`POST /api/orders/:id/status` accepts `{ "status": "Preparing" | "Ready" |
"Collected" }` and returns `{ order }`. Only the next step is allowed:
Placed → Preparing → Ready → Collected. Unknown orders return 404; invalid,
backward, skipped, final-status, and previous-day transitions return clear
errors. Repeating an action after another window already advanced the order
returns a 409 `STATUS_CONFLICT`. Successful transitions emit `order:updated`
with `{ id, tokenNumber, status, serviceDay }` so connected clients refetch
current order details.

The frontend calls these endpoints through `VITE_API_URL`. Order Status listens
for `order:created`, `order:updated`, and `order:cancelled`; while Socket.IO is
disconnected it refreshes current-day orders every five seconds.
