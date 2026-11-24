import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { createQueueRulesService } from './queueRulesService.js';
import { createQueueService } from './queueService.js';

let SQL;
let database;
let now;
let rules;
let queue;

beforeAll(async () => { SQL = await initSqlJs(); });

beforeEach(() => {
  database = new SQL.Database();
  database.run(`CREATE TABLE services (id INTEGER PRIMARY KEY, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER, is_on INTEGER);
    CREATE TABLE barbers (id INTEGER PRIMARY KEY, name TEXT, status TEXT, is_on_duty INTEGER);
    CREATE TABLE queue_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, token_day TEXT, token_number INTEGER, token TEXT, request_id TEXT UNIQUE, name TEXT, phone TEXT, barber TEXT, status TEXT, total_minutes INTEGER, total_price INTEGER, created_at TEXT, status_updated_at TEXT, UNIQUE(token_day, token_number));
    CREATE TABLE queue_entry_services (id INTEGER PRIMARY KEY AUTOINCREMENT, queue_entry_id INTEGER, source_service_id INTEGER, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER);
    CREATE TABLE queue_token_counters (token_day TEXT PRIMARY KEY, last_number INTEGER);
    INSERT INTO services VALUES (1, 'Haircut', 'વાળ કપાવવું', 30, 150, 1), (2, 'Beard trim', 'દાઢી ટ્રીમ', 15, 80, 1), (3, 'Hair spa', 'હેર સ્પા', 45, 400, 1), (4, 'Facial', 'ફેશિયલ', 40, 350, 1), (5, 'Off service', 'બંધ', 5, 10, 0);
    INSERT INTO barbers VALUES (1, 'Ravi', 'free', 1), (2, 'Amit', 'free', 1), (3, 'Imran', 'on_break', 1);`);
  now = new Date('2026-11-24T05:00:00.000Z');
  rules = createQueueRulesService({ database, clock: () => now, timezone: 'Asia/Kolkata', joiningEnabled: () => true, override: 'open' });
  queue = createQueueService({ database, rules, clock: () => now, persist: () => {} });
});

let requestNumber = 0;
function create({ name = `Customer ${++requestNumber}`, phone = String(9000000000 + requestNumber), serviceIds = [1], barber = 'any', requestId = uuid() } = {}) {
  return queue.createSpot({ name, phone, serviceIds, barber, requestId });
}
function uuid() { return `00000000-0000-4000-8000-${String(++requestNumber).padStart(12, '0')}`; }

describe('real customer queue', () => {
  it('allocates sequential daily tokens and resets the counter on a new IST day', () => {
    const cancelled = create().spot;
    expect(cancelled.token).toBe('S-1');
    queue.cancelSpot(cancelled.id);
    expect(create().spot.token).toBe('S-2');
    now = new Date('2026-11-24T18:31:00.000Z'); // 12:01 AM IST next day
    expect(create().spot.token).toBe('S-1');
  });

  it('returns the same spot for a duplicate request UUID', () => {
    const requestId = uuid();
    const first = create({ requestId });
    const retry = create({ requestId, name: 'Different', phone: '9123456789' });
    expect(retry).toMatchObject({ existing: true, spot: { id: first.spot.id, token: first.spot.token } });
  });

  it('allocates distinct tokens for concurrent submissions and emits join events', async () => {
    const events = [];
    const first = { name: 'First', phone: '9000000001', serviceIds: [1], barber: 'any', requestId: uuid() };
    const second = { name: 'Second', phone: '9000000002', serviceIds: [2], barber: 'any', requestId: uuid() };
    const results = await Promise.all([
      Promise.resolve().then(() => queue.createSpot(first, (event, payload) => events.push([event, payload]))),
      Promise.resolve().then(() => queue.createSpot(second, (event, payload) => events.push([event, payload]))),
    ]);
    expect(results.map((result) => result.spot.token).sort()).toEqual(['S-1', 'S-2']);
    expect(events).toHaveLength(2);
    expect(events[0][0]).toBe('queue:updated');
    expect(events[0][1]).toMatchObject({ action: 'joined', status: 'Waiting' });
  });

  it('returns an existing active spot when the phone tries again', () => {
    const first = create({ phone: '9876543210' });
    expect(create({ phone: '9876543210' })).toMatchObject({ existing: true, spot: { id: first.spot.id }, message: 'You are already in the queue.' });
  });

  it('rejects invalid phone numbers and more than three services', () => {
    expect(() => create({ phone: '12345' })).toThrow(/10-digit phone/);
    expect(() => create({ serviceIds: [1, 2, 3, 4] })).toThrow(/1 and 3/);
  });

  it('rejects off services, unavailable barbers, and closed joining', () => {
    expect(() => create({ serviceIds: [5] })).toThrow(/unavailable/);
    expect(() => create({ barber: 'Unknown' })).toThrow(/on duty/);
    rules = createQueueRulesService({ database, clock: () => now, joiningEnabled: () => false });
    queue = createQueueService({ database, rules, clock: () => now, persist: () => {} });
    expect(() => create()).toThrow(/closed/i);
  });

  it('calculates total minutes and rupees on the backend and snapshots the service data', () => {
    const result = create({ serviceIds: [1, 2] }).spot;
    expect(result).toMatchObject({ totalMinutes: 45, totalPrice: 230, services: [{ nameEn: 'Haircut', durationMinutes: 30, price: 150 }, { nameEn: 'Beard trim', durationMinutes: 15, price: 80 }] });
  });

  it('cancels only Waiting spots and treats cancellation as final', () => {
    const spot = create().spot;
    const events = [];
    expect(queue.cancelSpot(spot.id, (event, payload) => events.push([event, payload]))).toMatchObject({ status: 'Cancelled' });
    expect(events[0]).toMatchObject(['queue:updated', { action: 'cancelled', id: spot.id, token: spot.token, status: 'Cancelled' }]);
    const calledSpot = create().spot;
    database.run("UPDATE queue_entries SET status = 'Called' WHERE id = ?", [calledSpot.id]);
    expect(() => queue.cancelSpot(calledSpot.id)).toThrow(/Only a Waiting/);
  });

  it('returns position and computes separate Any and barber-specific waits', () => {
    create({ serviceIds: [1], barber: 'Ravi' });
    create({ serviceIds: [2], barber: 'Amit' });
    create({ serviceIds: [3], barber: 'any' });
    const target = create({ serviceIds: [2], barber: 'Ravi' }).spot;
    expect(target.position).toBe(4);
    expect(target.expectedWaitMinutes).toBe(75);
    expect(rules.estimate([1], 'any').expectedWaitMinutes).toBe(55);
    expect(rules.estimate([1], 'Ravi').expectedWaitMinutes).toBe(90);
  });

  it('returns old-day spots as read-only without changing their saved status', () => {
    const spot = create().spot;
    now = new Date('2026-11-25T05:00:00.000Z');
    expect(queue.getSpot(spot.id)).toMatchObject({ previousDay: true, readOnly: true, status: 'Waiting', position: null });
    expect(() => queue.cancelSpot(spot.id)).toThrow(/read-only/);
  });
});
