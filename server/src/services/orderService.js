import { randomUUID } from 'node:crypto';
import { db as liveDatabase, persistDatabase } from '../db/database.js';
import { config } from '../config/env.js';
import { getOrderingStatus } from './statusService.js';

export class OrderError extends Error {
  constructor(message, status = 400, code = 'INVALID_ORDER') { super(message); this.status = status; this.code = code; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function rows(database, sql, params = []) {
  const statement = database.prepare(sql);
  try { statement.bind(params); const result = []; while (statement.step()) result.push(statement.getAsObject()); return result; }
  finally { statement.free(); }
}
function dayFor(date, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shapeOrder(database, row, now, timezone) {
  const previous = row.service_day !== dayFor(now, timezone);
  const items = rows(database, 'SELECT menu_item_id AS menuItemId, item_name AS itemName, unit_price AS unitPrice, quantity, line_total AS lineTotal FROM order_items WHERE order_id = ? ORDER BY id', [row.id]).map((item) => ({ ...item, menuItemId: item.menuItemId == null ? null : Number(item.menuItemId), unitPrice: Number(item.unitPrice), quantity: Number(item.quantity), lineTotal: Number(item.lineTotal) }));
  const ahead = previous ? null : Number(rows(database, "SELECT COUNT(*) AS count FROM orders WHERE service_day = ? AND token_number < ? AND status IN ('Placed', 'Preparing')", [row.service_day, row.token_number])[0].count);
  return { id: row.id, requestId: row.request_id, tokenNumber: Number(row.token_number), serviceDay: row.service_day, studentName: row.student_name, rollNumber: row.roll_number, status: row.status, total: Number(row.total), createdAt: row.created_at, updatedAt: row.updated_at, items, ordersAhead: ahead, isPreviousDay: previous, readOnly: previous };
}

export function createOrderService({ database, persist = persistDatabase, clock = () => new Date(), timezone = config.canteenTimezone, override = config.orderingStatusOverride } = {}) {
  const getDb = () => database ?? liveDatabase;
  function getOrder(id) {
    const current = clock(); const db = getDb();
    const row = rows(db, 'SELECT * FROM orders WHERE id = ?', [id])[0];
    if (!row) throw new OrderError('Order not found.', 404, 'ORDER_NOT_FOUND');
    return shapeOrder(db, row, current, timezone);
  }
  function createOrder(body = {}) {
    const db = getDb();
    if (!UUID.test(body.requestId ?? '')) throw new OrderError('A valid request ID (UUID) is required.');
    const existing = rows(db, 'SELECT id FROM orders WHERE request_id = ?', [body.requestId])[0];
    if (existing) return { order: getOrder(existing.id), duplicate: true };
    const studentName = typeof body.studentName === 'string' ? body.studentName.trim() : '';
    const rollNumber = typeof body.rollNumber === 'string' ? body.rollNumber.trim() : '';
    if (!studentName || studentName.length > 100) throw new OrderError('Enter a student name (up to 100 characters).');
    if (!rollNumber || rollNumber.length > 50) throw new OrderError('Enter a roll number (up to 50 characters).');
    if (!Array.isArray(body.items) || !body.items.length) throw new OrderError('Add at least one item to the order.');
    const requested = new Map();
    for (const item of body.items) {
      if (!Number.isInteger(item?.id) || item.id < 1) throw new OrderError('Each cart item must have a valid menu item ID.');
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new OrderError('Each item quantity must be between 1 and 10.');
      if (requested.has(item.id)) throw new OrderError('Each menu item can appear only once in the cart.');
      requested.set(item.id, item.quantity);
    }
    const now = clock();
    if (!getOrderingStatus({ now, timezone, override }).isOpen) throw new OrderError('Ordering is closed right now.', 409, 'ORDERING_CLOSED');
    db.run('BEGIN IMMEDIATE');
    try {
      const raced = rows(db, 'SELECT id FROM orders WHERE request_id = ?', [body.requestId])[0];
      if (raced) { db.run('COMMIT'); return { order: shapeOrder(db, rows(db, 'SELECT * FROM orders WHERE id = ?', [raced.id])[0], now, timezone), duplicate: true }; }
      const ids = [...requested.keys()];
      const menu = rows(db, `SELECT id, name, price, is_available AS isAvailable FROM menu_items WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      const byId = new Map(menu.map((item) => [Number(item.id), item]));
      for (const id of ids) {
        const item = byId.get(id);
        if (!item) throw new OrderError(`Menu item ${id} no longer exists.`, 409, 'ITEM_UNAVAILABLE');
        if (!Number(item.isAvailable)) throw new OrderError(`${item.name} is sold out.`, 409, 'ITEM_UNAVAILABLE');
      }
      const serviceDay = dayFor(now, timezone);
      const token = Number(rows(db, 'SELECT COALESCE(MAX(token_number), 0) AS maxToken FROM orders WHERE service_day = ?', [serviceDay])[0].maxToken) + 1;
      const id = randomUUID(); const createdAt = now.toISOString();
      let total = 0;
      for (const menuId of ids) total += Number(byId.get(menuId).price) * requested.get(menuId);
      db.run("INSERT INTO orders (id, request_id, token_number, service_day, student_name, roll_number, status, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'Placed', ?, ?, ?)", [id, body.requestId, token, serviceDay, studentName, rollNumber, total, createdAt, createdAt]);
      for (const menuId of ids) {
        const item = byId.get(menuId); const quantity = requested.get(menuId); const price = Number(item.price);
        db.run('INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)', [id, menuId, item.name, price, quantity, price * quantity]);
      }
      db.run('COMMIT'); persist();
      return { order: getOrder(id), duplicate: false };
    } catch (error) { try { db.run('ROLLBACK'); } catch {} throw error; }
  }
  function cancelOrder(id) {
    const db = getDb(); const now = clock();
    db.run('BEGIN IMMEDIATE');
    try {
      const row = rows(db, 'SELECT * FROM orders WHERE id = ?', [id])[0];
      if (!row) throw new OrderError('Order not found.', 404, 'ORDER_NOT_FOUND');
      if (row.service_day !== dayFor(now, timezone)) throw new OrderError('Previous-day orders cannot be changed.', 409, 'ORDER_READ_ONLY');
      if (row.status !== 'Placed') throw new OrderError('Only Placed orders can be cancelled.', 409, 'CANNOT_CANCEL');
      db.run("UPDATE orders SET status = 'Cancelled', updated_at = ? WHERE id = ?", [now.toISOString(), id]);
      db.run('COMMIT'); persist();
      return getOrder(id);
    } catch (error) { try { db.run('ROLLBACK'); } catch {} throw error; }
  }
  function getKitchenOrders() {
    const db = getDb(); const current = clock(); const today = dayFor(current, timezone);
    return rows(db, "SELECT * FROM orders WHERE service_day = ? AND status IN ('Placed', 'Preparing', 'Ready') ORDER BY token_number", [today])
      .map((row) => shapeOrder(db, row, current, timezone));
  }
  function updateStatus(id, targetStatus) {
    const db = getDb(); const now = clock();
    const next = { Placed: 'Preparing', Preparing: 'Ready', Ready: 'Collected' };
    if (!['Preparing', 'Ready', 'Collected'].includes(targetStatus)) throw new OrderError('Target status must be Preparing, Ready, or Collected.', 400, 'INVALID_TARGET_STATUS');
    db.run('BEGIN IMMEDIATE');
    try {
      const row = rows(db, 'SELECT * FROM orders WHERE id = ?', [id])[0];
      if (!row) throw new OrderError('Order not found.', 404, 'ORDER_NOT_FOUND');
      if (row.service_day !== dayFor(now, timezone)) throw new OrderError('Previous-day orders cannot be changed.', 409, 'ORDER_READ_ONLY');
      if (row.status === 'Cancelled' || row.status === 'Collected') throw new OrderError(`Order is already ${row.status}; that status is final.`, 409, 'FINAL_STATUS');
      if (next[row.status] !== targetStatus) {
        if (row.status === targetStatus) throw new OrderError('This order was already advanced in another window. Refresh the board and continue from its current status.', 409, 'STATUS_CONFLICT');
        throw new OrderError(`Cannot move an order from ${row.status} to ${targetStatus}. Only the next forward status is allowed.`, 409, 'INVALID_STATUS_TRANSITION');
      }
      db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?', [targetStatus, now.toISOString(), id, row.status]);
      if (db.getRowsModified() !== 1) throw new OrderError('This order changed in another window. Refresh the board before trying again.', 409, 'STATUS_CONFLICT');
      db.run('COMMIT'); persist();
      return getOrder(id);
    } catch (error) { try { db.run('ROLLBACK'); } catch {} throw error; }
  }
  return { createOrder, getOrder, cancelOrder, getKitchenOrders, updateStatus };
}
