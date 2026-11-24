import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { createSalonAdminService } from './salonAdminService.js';
import { createSalonCatalogService } from './salonCatalogService.js';
import { createQueueRulesService, getSalonDayKey } from './queueRulesService.js';
import { createQueueService } from './queueService.js';

let SQL; let database; let now;
beforeAll(async () => { SQL = await initSqlJs(); });
beforeEach(() => {
  database = new SQL.Database();
  database.run(`CREATE TABLE services (id INTEGER PRIMARY KEY AUTOINCREMENT, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER, is_on INTEGER);
    CREATE TABLE barbers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, avatar TEXT, is_on_duty INTEGER, status TEXT);
    CREATE TABLE salon_settings (id INTEGER PRIMARY KEY, online_joining_enabled INTEGER);
    CREATE TABLE queue_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, token_day TEXT, token_number INTEGER, token TEXT, request_id TEXT, name TEXT, phone TEXT, barber TEXT, assigned_barber TEXT, status TEXT, total_minutes INTEGER, total_price INTEGER, created_at TEXT, status_updated_at TEXT, started_at TEXT, finished_at TEXT);
    CREATE TABLE queue_entry_services (id INTEGER PRIMARY KEY AUTOINCREMENT, queue_entry_id INTEGER, source_service_id INTEGER, name_en TEXT, name_gu TEXT, duration_minutes INTEGER, price INTEGER);
    CREATE TABLE queue_token_counters (token_day TEXT PRIMARY KEY, last_number INTEGER);
    INSERT INTO services (name_en, name_gu, duration_minutes, price, is_on) VALUES ('Haircut', 'વાળ કપાવવું', 30, 150, 1), ('Hidden', 'છુપાયેલું', 15, 80, 0);
    INSERT INTO barbers (name, avatar, is_on_duty, status) VALUES ('Ravi', '✂', 1, 'free'), ('Imran', '🧔', 1, 'on_break');
    INSERT INTO salon_settings VALUES (1, 1);`);
  now = new Date('2026-11-24T05:30:00.000Z');
});

function setup() {
  const rules = createQueueRulesService({ database, clock: () => now, timezone: 'Asia/Kolkata', joiningEnabled: () => Boolean(Number(database.exec('SELECT online_joining_enabled FROM salon_settings WHERE id = 1')[0].values[0][0])), persist: () => {} });
  const admin = createSalonAdminService({ database, clock: () => now, timezone: 'Asia/Kolkata', rules, persist: () => {} });
  return { rules, admin, queue: createQueueService({ database, rules, clock: () => now, persist: () => {} }), catalog: createSalonCatalogService({ database }) };
}

function addQueueEntry({ id, tokenNumber = id, name = `Guest ${id}`, phone = `98765432${String(id).padStart(2, '0')}`, barber = 'any', assigned = null, status = 'Waiting', createdAt = now.toISOString(), startedAt = null, finishedAt = null, day = getSalonDayKey(now) }) {
  database.run('INSERT INTO queue_entries (id, token_day, token_number, token, request_id, name, phone, barber, assigned_barber, status, total_minutes, total_price, created_at, status_updated_at, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, day, tokenNumber, `S-${tokenNumber}`, `req-${id}`, name, phone, barber, assigned, status, 30, 150, createdAt, createdAt, startedAt, finishedAt]);
}

describe('owner settings rules', () => {
  it.each([
    ['missing English name', { nameEn: '', nameGu: 'વાળ', durationMinutes: 30, price: 100 }, 'INVALID_SERVICE_NAME_EN'],
    ['English name over 50 characters', { nameEn: 'a'.repeat(51), nameGu: 'વાળ', durationMinutes: 30, price: 100 }, 'SERVICE_NAME_TOO_LONG'],
    ['missing Gujarati name', { nameEn: 'Trim', nameGu: '', durationMinutes: 30, price: 100 }, 'INVALID_SERVICE_NAME_GU'],
    ['Gujarati name over 50 characters', { nameEn: 'Trim', nameGu: 'વ'.repeat(51), durationMinutes: 30, price: 100 }, 'SERVICE_NAME_TOO_LONG'],
    ['duration below 5', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 4, price: 100 }, 'INVALID_SERVICE_DURATION'],
    ['duration above 180', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 181, price: 100 }, 'INVALID_SERVICE_DURATION'],
    ['fractional duration', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 5.5, price: 100 }, 'INVALID_SERVICE_DURATION'],
    ['price below one rupee', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 5, price: 0 }, 'INVALID_SERVICE_PRICE'],
    ['price above 9999 rupees', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 5, price: 10000 }, 'INVALID_SERVICE_PRICE'],
    ['fractional price', { nameEn: 'Trim', nameGu: 'ટ્રિમ', durationMinutes: 5, price: 10.5 }, 'INVALID_SERVICE_PRICE'],
  ])('validates %s', (_label, input, code) => {
    expect(() => setup().admin.saveService(input)).toThrow(expect.objectContaining({ code }));
  });

  it('rejects duplicate English service names without case sensitivity', () => {
    expect(() => setup().admin.saveService({ nameEn: ' haircut ', nameGu: 'વાળ', durationMinutes: 20, price: 99 })).toThrow(expect.objectContaining({ code: 'DUPLICATE_SERVICE_NAME' }));
  });

  it('hides switched-off services from the join catalog without changing saved spot snapshots', () => {
    const { admin, catalog, queue } = setup();
    expect(catalog.getServices().map((service) => service.nameEn)).toEqual(['Haircut']);
    const body = { name: 'Saved guest', phone: '9999999999', serviceIds: [1], barber: 'any', requestId: '123e4567-e89b-42d3-a456-426614174002' };
    const spot = queue.createSpot(body, () => {}).spot;
    admin.setServiceEnabled(1, false);
    expect(catalog.getServices()).toEqual([]);
    expect(database.exec("SELECT name_en FROM services WHERE id = 1")[0].values[0][0]).toBe('Haircut');
    expect(database.exec('SELECT name_en FROM queue_entry_services WHERE queue_entry_id = 1')[0].values[0][0]).toBe('Haircut');
    expect(() => queue.createSpot({ ...body, requestId: '123e4567-e89b-42d3-a456-426614174003', phone: '8888888888' }, () => {})).toThrow(/unavailable/);
    expect(spot.services[0].nameEn).toBe('Haircut');
  });

  it('blocks taking a barber off duty while they have a Called or In chair customer', () => {
    for (const status of ['Called', 'In chair']) {
      database.run('DELETE FROM queue_entries');
      addQueueEntry({ id: 1, assigned: 'Ravi', status });
      expect(() => setup().admin.setBarberDuty(1, false)).toThrow(expect.objectContaining({ code: 'BARBER_HAS_ACTIVE_CUSTOMER' }));
    }
  });

  it('moves an unavailable barber’s Waiting customer to Any', () => {
    const { admin } = setup();
    addQueueEntry({ id: 1, barber: 'Ravi' });
    database.run('UPDATE barbers SET is_on_duty = 0 WHERE id = 1');
    expect(admin.moveToAny(1)).toMatchObject({ id: '1', barber: 'any', status: 'Waiting' });
    expect(database.exec('SELECT barber FROM queue_entries WHERE id = 1')[0].values[0][0]).toBe('any');
  });

  it('closes online joining but still allows walk-ins during salon hours', () => {
    const { admin, rules, queue } = setup();
    admin.setQueueOpen(false);
    expect(rules.getStatus()).toMatchObject({ isOpen: true, onlineJoiningEnabled: false, onlineJoiningOpen: false });
    const body = { name: 'Walk-in', phone: '9999999999', serviceIds: [1], barber: 'any', requestId: '123e4567-e89b-42d3-a456-426614174000' };
    expect(() => queue.createSpot({ ...body, requestId: '123e4567-e89b-42d3-a456-426614174001' })).toThrow(expect.objectContaining({ code: 'QUEUE_CLOSED' }));
    expect(queue.createSpot(body, () => {}, { walkIn: true }).spot.status).toBe('Waiting');
  });

  it('calculates today’s served, average start wait and no-shows, excluding cancelled and old spots', () => {
    const { admin } = setup(); const day = getSalonDayKey(now);
    const joinedA = '2026-11-24T04:00:00.000Z'; const startedA = '2026-11-24T04:30:00.000Z';
    const joinedB = '2026-11-24T04:30:00.000Z'; const startedB = '2026-11-24T05:00:00.000Z';
    addQueueEntry({ id: 1, status: 'Done', createdAt: joinedA, startedAt: startedA, finishedAt: '2026-11-24T05:10:00.000Z' });
    addQueueEntry({ id: 2, status: 'In chair', createdAt: joinedB, startedAt: startedB });
    addQueueEntry({ id: 3, status: 'No-show' });
    addQueueEntry({ id: 4, status: 'Cancelled' });
    addQueueEntry({ id: 5, status: 'Done', day: '2026-11-23', createdAt: joinedA, startedAt: startedA });
    const settings = admin.getSettings();
    expect(settings.date).toBe(day);
    expect(settings.stats).toEqual({ served: 1, noShows: 1, averageWaitMinutes: 30 });
  });
});
