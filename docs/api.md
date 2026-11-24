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
| POST | `/api/orders` | Create an order with an idempotency request ID; server validates and calculates prices/totals. | Planned |
| GET | `/api/orders/:id` | Return order details and saved status. | Planned |
| PATCH | `/api/orders/:id/status` | Advance an order through valid staff status transitions. | Planned |
| POST | `/api/orders/:id/cancel` | Cancel a Placed order. | Planned |
| GET/POST/PATCH/DELETE | `/api/admin/menu-items` | List, add, edit, or delete menu items. | Planned |
| GET | `/api/admin/summary` | Return today's order count, item quantity total, and top seller. | Planned |

## SQLite tables

- `menu_items`: menu name, category, whole-rupee price, description, emoji,
  veg flag, availability, and creation/update timestamps. If empty at startup,
  the backend seeds 19 sample canteen items across the four fixed categories.
- `orders`: UUID order ID, unique request ID, daily token, IST service day,
  student and roll details, status, total, and timestamps. Token numbers are
  unique within a service day.
- `order_items`: order reference and a snapshot of item name, unit price,
  quantity, and line total so menu edits do not change past orders.

## Socket.IO events

| Direction | Event | Payload | Purpose | Status |
| --- | --- | --- | --- | --- |
| Server → client | `connection:ready` | `{ connected: true }` | Confirm the realtime connection. | Implemented in Step 1 |
| Server → clients | `menu:updated` | Updated menu item or menu snapshot (to be finalized with menu API). | Refresh menu views after owner changes. | Planned |
| Server → clients | `order:created` | Created order summary. | Add a new order to kitchen and customer views. | Planned |
| Server → clients | `order:updated` | Updated order summary/status. | Synchronize kitchen, tracking, and display views. | Planned |
| Server → clients | `order:cancelled` | Cancelled order ID and status. | Remove cancelled orders from active views. | Planned |

Event payload details will be finalized alongside their corresponding features.

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

The frontend requests `/api/menu` and `/api/status` from `VITE_API_URL`. It
refreshes status every 30 seconds and refetches menu data on `menu:updated`.
No order creation endpoint is called from the Cart screen in this step.
