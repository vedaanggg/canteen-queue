import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { createOrderService } from './orderService.js';

let SQL;
let database;
let now;
const requestId = () => crypto.randomUUID();
const payload = (id = requestId(), items = [{ id: 1, quantity: 1 }]) => ({ requestId: id, studentName: 'Aditi Sharma', rollNumber: 'CS24-018', items });

beforeAll(async () => { SQL = await initSqlJs(); });
beforeEach(() => {
  database = new SQL.Database(); database.run('PRAGMA foreign_keys = ON');
  database.run(`CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT, price INTEGER, is_available INTEGER);
    CREATE TABLE orders (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, token_number INTEGER NOT NULL, service_day TEXT NOT NULL, student_name TEXT NOT NULL, roll_number TEXT NOT NULL, status TEXT NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(service_day, token_number));
    CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), menu_item_id INTEGER, item_name TEXT NOT NULL, unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10), line_total INTEGER NOT NULL);
    INSERT INTO menu_items VALUES (1, 'Samosa', 20, 1), (2, 'Cold Coffee', 50, 0);`);
  now = new Date('2026-11-24T05:00:00.000Z');
});
function service(extra = {}) { return createOrderService({ database, persist: () => {}, clock: () => now, timezone: 'Asia/Kolkata', ...extra }); }

describe('order service', () => {
  it('assigns sequential tokens and never reuses a cancelled token', () => {
    const api = service(); const first = api.createOrder(payload()).order;
    api.cancelOrder(first.id);
    const second = api.createOrder(payload()).order;
    expect([first.tokenNumber, second.tokenNumber]).toEqual([1, 2]);
  });
  it('resets daily tokens using the configured timezone', () => {
    const api = service({ override: 'open' }); expect(api.createOrder(payload()).order.tokenNumber).toBe(1);
    now = new Date('2026-11-24T18:31:00.000Z');
    expect(api.createOrder(payload()).order.tokenNumber).toBe(1);
  });
  it('returns the original order for a duplicate request ID', () => {
    const api = service(); const body = payload(); const original = api.createOrder(body);
    const duplicate = api.createOrder(body);
    expect(duplicate.duplicate).toBe(true); expect(duplicate.order.id).toBe(original.order.id);
    expect(database.exec('SELECT COUNT(*) FROM orders')[0].values[0][0]).toBe(1);
  });
  it('rejects quantities above ten', () => { expect(() => service().createOrder(payload(requestId(), [{ id: 1, quantity: 11 }]))).toThrow(/between 1 and 10/); });
  it('rejects missing student details, an empty cart, and unknown menu items', () => {
    const api = service();
    expect(() => api.createOrder({ ...payload(), studentName: '  ' })).toThrow(/student name/i);
    expect(() => api.createOrder({ ...payload(), rollNumber: '' })).toThrow(/roll number/i);
    expect(() => api.createOrder(payload(requestId(), []))).toThrow(/at least one item/i);
    expect(() => api.createOrder(payload(requestId(), [{ id: 999, quantity: 1 }]))).toThrow(/no longer exists/i);
  });
  it('rejects sold-out menu items', () => { expect(() => service().createOrder(payload(requestId(), [{ id: 2, quantity: 1 }]))).toThrow(/sold out/i); });
  it('rejects when ordering is closed at the cutoff', () => {
    now = new Date('2026-11-24T11:15:00.000Z');
    expect(() => service().createOrder(payload())).toThrow(/closed/i);
  });
  it('calculates totals from current server prices', () => {
    const order = service().createOrder({ ...payload(), total: 1, items: [{ id: 1, quantity: 2 }] }).order;
    expect(order.total).toBe(40); expect(order.items[0]).toMatchObject({ itemName: 'Samosa', unitPrice: 20, quantity: 2, lineTotal: 40 });
  });
  it('counts only smaller same-day Placed or Preparing tokens ahead', () => {
    const api = service();
    const first = api.createOrder(payload()).order;
    const second = api.createOrder(payload()).order;
    expect(api.getOrder(second.id).ordersAhead).toBe(1);
    api.cancelOrder(first.id);
    expect(api.getOrder(second.id).ordersAhead).toBe(0);
  });
  it('allows cancellation only while Placed', () => {
    const api = service(); const placed = api.createOrder(payload()).order;
    expect(api.cancelOrder(placed.id).status).toBe('Cancelled');
    expect(() => api.cancelOrder(placed.id)).toThrow(/only Placed/i);
    const preparing = api.createOrder(payload()).order;
    database.run("UPDATE orders SET status = 'Preparing' WHERE id = ?", [preparing.id]);
    expect(() => api.cancelOrder(preparing.id)).toThrow(/only Placed/i);
  });
  it('flags previous-day orders as read-only and does not count ahead', () => {
    const api = service(); const oldOrder = api.createOrder(payload()).order;
    now = new Date('2026-11-25T05:00:00.000Z');
    expect(api.getOrder(oldOrder.id)).toMatchObject({ isPreviousDay: true, readOnly: true, ordersAhead: null, status: 'Placed' });
    expect(() => api.cancelOrder(oldOrder.id)).toThrow(/Previous-day/);
  });
  it('allows only the next forward status at each step', () => {
    const api = service(); const order = api.createOrder(payload()).order;
    expect(api.updateStatus(order.id, 'Preparing').status).toBe('Preparing');
    expect(api.updateStatus(order.id, 'Ready').status).toBe('Ready');
    expect(api.updateStatus(order.id, 'Collected').status).toBe('Collected');
  });
  it('rejects backwards and skipped transitions with a clear error', () => {
    const api = service(); const order = api.createOrder(payload()).order;
    expect(() => api.updateStatus(order.id, 'Ready')).toThrow(/Only the next forward status/i);
    api.updateStatus(order.id, 'Preparing');
    expect(() => api.updateStatus(order.id, 'Placed')).toThrow(/Target status/i);
    expect(() => api.updateStatus(order.id, 'Collected')).toThrow(/Only the next forward status/i);
  });
  it('rejects changes from Cancelled and Collected final statuses', () => {
    const api = service(); const cancelled = api.createOrder(payload()).order;
    api.cancelOrder(cancelled.id);
    expect(() => api.updateStatus(cancelled.id, 'Preparing')).toThrow(/final/i);
    const collected = api.createOrder(payload()).order;
    api.updateStatus(collected.id, 'Preparing'); api.updateStatus(collected.id, 'Ready'); api.updateStatus(collected.id, 'Collected');
    expect(() => api.updateStatus(collected.id, 'Ready')).toThrow(/final/i);
  });
  it('rejects status changes on previous-day orders', () => {
    const api = service(); const oldOrder = api.createOrder(payload()).order;
    now = new Date('2026-11-25T05:00:00.000Z');
    expect(() => api.updateStatus(oldOrder.id, 'Preparing')).toThrow(/Previous-day orders cannot be changed/i);
  });
  it('allows only one concurrent duplicate action and returns a conflict to the other', async () => {
    const api = service(); const order = api.createOrder(payload()).order;
    const results = await Promise.allSettled([
      Promise.resolve().then(() => api.updateStatus(order.id, 'Preparing')),
      Promise.resolve().then(() => api.updateStatus(order.id, 'Preparing')),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expect(rejected.reason.code).toBe('STATUS_CONFLICT');
    expect(api.getOrder(order.id).status).toBe('Preparing');
  });
  it('returns only current-day active orders for the kitchen', () => {
    const api = service(); const first = api.createOrder(payload()).order;
    const second = api.createOrder(payload()).order;
    api.updateStatus(second.id, 'Preparing');
    expect(api.getKitchenOrders().map((order) => order.id)).toEqual([first.id, second.id]);
    api.cancelOrder(first.id);
    expect(api.getKitchenOrders().map((order) => order.id)).toEqual([second.id]);
  });
});
