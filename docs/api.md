# API, database, and realtime plan

This document describes the planned application contract. Step 1 implements
only the health endpoint and initial SQLite tables; the other endpoints and
events will be added in later steps and this document will be updated with them.

## Environment

- `VITE_API_URL`: base URL used by the frontend for HTTP API requests and the
  Socket.IO connection.
- `CLIENT_ORIGIN`: allowed frontend origin for Express CORS and Socket.IO.
- `PORT`: backend listening port (local default: `3001`).
- `DATABASE_PATH`: SQLite file path, resolved from the server working directory
  (local default: `./data/canteen.sqlite`).
- `CANTEEN_TIMEZONE`: timezone for all canteen time rules.

## HTTP endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/health` | Confirm the backend and SQLite are available. Returns `{ "status": "ok", "service": "canteen-queue-api" }`. | Implemented in Step 1 |
| GET | `/api/status` | Return ordering availability and current canteen time. | Planned |
| GET | `/api/menu` | Return available menu items and categories. | Planned |
| POST | `/api/orders` | Create an order with an idempotency request ID; server validates and calculates prices/totals. | Planned |
| GET | `/api/orders/:id` | Return order details and saved status. | Planned |
| PATCH | `/api/orders/:id/status` | Advance an order through valid staff status transitions. | Planned |
| POST | `/api/orders/:id/cancel` | Cancel a Placed order. | Planned |
| GET/POST/PATCH/DELETE | `/api/admin/menu-items` | List, add, edit, or delete menu items. | Planned |
| GET | `/api/admin/summary` | Return today's order count, item quantity total, and top seller. | Planned |

## SQLite tables

- `menu_items`: menu name, category, rupee price, description, veg flag,
  availability, and creation/update timestamps.
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
