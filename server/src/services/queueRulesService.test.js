import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { createQueueRulesService } from './queueRulesService.js';

let SQL;
let database;
let now;

beforeAll(async () => { SQL = await initSqlJs(); });
beforeEach(() => {
  database = new SQL.Database();
  database.run(`CREATE TABLE services (id INTEGER PRIMARY KEY, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER, is_on INTEGER);
    CREATE TABLE barbers (id INTEGER PRIMARY KEY, name TEXT, avatar TEXT, status TEXT, is_on_duty INTEGER);
    CREATE TABLE queue_entries (id INTEGER PRIMARY KEY, token_day TEXT, token_number INTEGER, token TEXT, request_id TEXT, name TEXT, phone TEXT, barber TEXT, assigned_barber TEXT, status TEXT, total_minutes INTEGER, total_price INTEGER, created_at TEXT, status_updated_at TEXT, started_at TEXT, finished_at TEXT);
    CREATE TABLE queue_entry_services (id INTEGER PRIMARY KEY, queue_entry_id INTEGER, source_service_id INTEGER, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER);
    INSERT INTO services VALUES (1, 'Haircut', 'વાળ કપાવવું', 30, 150, 1), (2, 'Beard trim', 'દાઢી ટ્રીમ', 15, 80, 1), (3, 'Hidden service', 'બંધ સેવા', 20, 100, 0);
    INSERT INTO barbers VALUES (1, 'Ravi', '✂', 'free', 1), (2, 'Imran', '🧔', 'on_break', 1);`);
  now = new Date('2026-11-24T05:00:00.000Z'); // 10:30 AM Asia/Kolkata
});

function rules(options = {}) { return createQueueRulesService({ database, clock: () => now, timezone: 'Asia/Kolkata', persist: () => {}, ...options }); }

function addSpot({ id, tokenNumber = id, name = `Customer ${id}`, barber = 'any', assigned = null, status = 'Waiting', minutes = 30, statusAt = now.toISOString() }) {
  const day = rules().getSalonDayKey(); const created = now.toISOString();
  database.run('INSERT INTO queue_entries (id, token_day, token_number, token, request_id, name, phone, barber, assigned_barber, status, total_minutes, total_price, created_at, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, day, tokenNumber, `S-${tokenNumber}`, `req-${id}`, name, '9876543210', barber, assigned, status, minutes, 150, created, statusAt]);
  database.run('INSERT INTO queue_entry_services (queue_entry_id, source_service_id, name_en, name_gu, duration_minutes, price) VALUES (?, 1, ?, ?, ?, 150)', [id, 'Haircut', 'વાળ કપાવવું', minutes]);
}

describe('salon queue rules', () => {
  it('requires the owner switch to be enabled during open joining hours', () => {
    expect(rules({ joiningEnabled: () => true }).getStatus().onlineJoiningOpen).toBe(true);
    expect(rules({ joiningEnabled: () => false }).getStatus()).toMatchObject({ isOpen: true, onlineJoiningOpen: false, onlineJoiningEnabled: false });
  });

  it('closes online joining exactly 30 minutes before closing', () => {
    now = new Date('2026-11-24T14:59:00.000Z'); // 8:29 PM IST
    expect(rules().getStatus().onlineJoiningOpen).toBe(true);
    now = new Date('2026-11-24T15:00:00.000Z'); // 8:30 PM IST
    expect(rules().getStatus()).toMatchObject({ isOpen: true, onlineJoiningOpen: false, closingTime: '21:00' });
  });

  it('reports closed outside 10 AM to 9 PM in the salon timezone', () => {
    now = new Date('2026-11-24T04:29:00.000Z'); // 9:59 AM IST
    expect(rules().getStatus()).toMatchObject({ isOpen: false, onlineJoiningOpen: false });
    now = new Date('2026-11-24T15:31:00.000Z'); // 9:01 PM IST
    expect(rules().getStatus()).toMatchObject({ isOpen: false, onlineJoiningOpen: false });
  });

  it('honors open and closed testing overrides', () => {
    now = new Date('2026-11-24T04:00:00.000Z');
    expect(rules({ override: 'open' }).getStatus()).toMatchObject({ isOpen: true, onlineJoiningOpen: true });
    expect(rules({ override: 'closed' }).getStatus()).toMatchObject({ isOpen: false, onlineJoiningOpen: false });
  });

  it('adds minutes and prices for selected services and returns zero wait for the empty queue', () => {
    expect(rules().estimate(['1', '2'], 'any')).toMatchObject({ totalMinutes: 45, totalPrice: 230, waitingCount: 0, expectedWaitMinutes: 0 });
  });

  it('limits estimates to one to three active services and accepts an on-duty barber on break', () => {
    expect(() => rules().estimate([], 'any')).toThrow(/between 1 and 3/);
    expect(() => rules().estimate(['3'], 'any')).toThrow(/unavailable/);
    expect(rules().estimate(['1'], 'Imran').barber).toBe('Imran');
  });

  it('starts only Called customers and records the start timestamp', () => {
    addSpot({ id: 1, assigned: 'Ravi', status: 'Called' });
    const result = rules().startService(1, 1);
    expect(result).toMatchObject({ status: 'In chair', startedAt: now.toISOString() });
    addSpot({ id: 2, status: 'Waiting' });
    expect(() => rules().startService(2, 1)).toThrow(/Only a Called customer/);
  });

  it('allows only the assigned barber to start and rejects other forward skips', () => {
    addSpot({ id: 1, assigned: 'Ravi', status: 'Called' });
    expect(() => rules().startService(1, 2)).toThrow(/assigned barber/);
    expect(() => rules().finishService(1, 1)).toThrow(/In chair/);
  });

  it('marks Done only from In chair and records the finish time', () => {
    addSpot({ id: 1, assigned: 'Ravi', status: 'In chair' });
    const result = rules().finishService(1, 1);
    expect(result).toMatchObject({ status: 'Done', finishedAt: now.toISOString() });
    expect(() => rules().finishService(1, 1)).toThrow(/In chair/);
  });

  it('prevents a barber taking a break while Called or In chair', () => {
    addSpot({ id: 1, assigned: 'Ravi', status: 'Called' });
    expect(() => rules().setBarberBreak(1, true)).toThrow(/cannot go on break/);
    database.run("UPDATE queue_entries SET status = 'In chair' WHERE id = 1");
    expect(() => rules().setBarberBreak(1, true)).toThrow(/cannot go on break/);
  });

  it('chooses the earliest Waiting customer assigned to this barber or Any', () => {
    addSpot({ id: 1, barber: 'Imran' }); addSpot({ id: 2, barber: 'any' }); addSpot({ id: 3, barber: 'Ravi' });
    expect(rules().getBarberView('Ravi').nextCustomer).toMatchObject({ id: '2', token: 'S-2' });
  });

  it('reduces the Any-barber wait after a customer is Done', () => {
    const calledAt = new Date(now.getTime() - 5 * 60_000).toISOString();
    addSpot({ id: 1, assigned: 'Ravi', status: 'In chair', minutes: 30, statusAt: calledAt });
    const before = rules().calculateWait({ barber: 'any' }).expectedWaitMinutes;
    rules().finishService(1, 1);
    expect(rules().calculateWait({ barber: 'any' }).expectedWaitMinutes).toBeLessThan(before);
  });

  it('returns only today’s display barbers and up to five Waiting tokens with estimates', () => {
    for (let id = 1; id <= 6; id += 1) addSpot({ id, barber: 'any' });
    addSpot({ id: 7, barber: 'any' });
    database.run("UPDATE queue_entries SET token_day = '2026-11-23' WHERE id = 7");
    const display = rules().getDisplayData();
    expect(display.barbers).toHaveLength(2);
    expect(display.barbers).toContainEqual(expect.objectContaining({ name: 'Ravi', status: 'free', currentToken: null }));
    expect(display.barbers).toContainEqual(expect.objectContaining({ name: 'Imran', status: 'on_break' }));
    expect(display.upNext).toHaveLength(5);
    expect(display.upNext[0]).toMatchObject({ token: 'S-1', expectedWaitMinutes: 0 });
  });
});
