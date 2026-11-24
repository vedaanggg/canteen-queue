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
    CREATE TABLE barbers (id INTEGER PRIMARY KEY, name TEXT, status TEXT, is_on_duty INTEGER);
    CREATE TABLE queue_entries (id INTEGER PRIMARY KEY, token_day TEXT, token_number INTEGER, token TEXT, request_id TEXT, name TEXT, phone TEXT, barber TEXT, status TEXT, total_minutes INTEGER, total_price INTEGER, created_at TEXT, status_updated_at TEXT);
    CREATE TABLE queue_entry_services (id INTEGER PRIMARY KEY, queue_entry_id INTEGER, source_service_id INTEGER, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER);
    INSERT INTO services VALUES (1, 'Haircut', 'વાળ કપાવવું', 30, 150, 1), (2, 'Beard trim', 'દાઢી ટ્રીમ', 15, 80, 1), (3, 'Hidden service', 'બંધ સેવા', 20, 100, 0);
    INSERT INTO barbers VALUES (1, 'Ravi', 'free', 1), (2, 'Imran', 'on_break', 1);`);
  now = new Date('2026-11-24T05:00:00.000Z'); // 10:30 AM Asia/Kolkata
});

function rules(options = {}) { return createQueueRulesService({ database, clock: () => now, timezone: 'Asia/Kolkata', ...options }); }

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
});
