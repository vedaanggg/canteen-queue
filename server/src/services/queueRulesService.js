import { db as liveDatabase, queryRows as liveQueryRows } from '../db/database.js';
import { config } from '../config/env.js';
import { CatalogError } from './salonCatalogService.js';
import { persistDatabase as persistLiveDatabase } from '../db/database.js';

function query(database, sql, params = []) {
  if (!database) return liveQueryRows(sql, params);
  const statement = database.prepare(sql);
  try { statement.bind(params); const results = []; while (statement.step()) results.push(statement.getAsObject()); return results; }
  finally { statement.free(); }
}

function getClockParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getSalonDayKey(date, timezone = config.salonTimezone ?? 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createQueueRulesService({
  database,
  clock = () => new Date(),
  timezone = config.salonTimezone ?? 'Asia/Kolkata',
  joiningEnabled = () => true,
  override = config.salonStatusOverride,
  waitingCount = () => 0,
  waitMinutesPerPerson = 0,
  persist = persistLiveDatabase,
} = {}) {
  const getDatabase = () => database ?? liveDatabase;

  function getStatus() {
    const now = clock(); const parts = getClockParts(now, timezone);
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const opening = 10 * 60; const closing = 21 * 60; const joinCutoff = closing - 30;
    const withinHours = minutes >= opening && minutes < closing;
    const ownerEnabled = Boolean(joiningEnabled());
    const isOpen = override === 'open' ? true : override === 'closed' ? false : withinHours;
    const onlineJoiningOpen = override === 'open' ? true : override === 'closed' ? false : isOpen && ownerEnabled && minutes < joinCutoff;
    let peopleWaiting = Math.max(0, Number(waitingCount()) || 0);
    let expected = peopleWaiting * Math.max(0, Number(waitMinutesPerPerson) || 0);
    try {
      peopleWaiting = Number(query(getDatabase(), "SELECT COUNT(*) AS count FROM queue_entries WHERE token_day = ? AND status = 'Waiting'", [getSalonDayKey(now, timezone)])[0]?.count ?? 0);
      expected = calculateWait({ barber: 'any' }).expectedWaitMinutes;
    } catch { /* queue tables are not present in isolated rules tests */ }
    return {
      isOpen,
      status: isOpen ? 'open' : 'closed',
      openingTime: '10:00',
      closingTime: '21:00',
      onlineJoiningOpen,
      onlineJoiningEnabled: ownerEnabled,
      waitingCount: peopleWaiting,
      estimatedWaitMinutes: expected,
      currentTime: `${parts.hour}:${parts.minute}:${parts.second}`,
      timezone,
      override: override ?? null,
    };
  }

  function estimate(serviceIds, barber = 'any') {
    if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 3) {
      throw new CatalogError('Select between 1 and 3 services.', 400, 'INVALID_SERVICE_COUNT');
    }
    const ids = serviceIds.map((id) => Number(id));
    if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
      throw new CatalogError('Service IDs must be distinct positive integers.', 400, 'INVALID_SERVICE_IDS');
    }
    const services = query(getDatabase(), `SELECT id, name_en AS nameEn, duration_minutes AS durationMinutes, price FROM services WHERE is_on = 1 AND id IN (${ids.map(() => '?').join(',')})`, ids);
    if (services.length !== ids.length) throw new CatalogError('One or more selected services are unavailable.', 409, 'SERVICE_UNAVAILABLE');
    const normalizedBarber = typeof barber === 'string' && barber.trim() ? barber.trim() : 'any';
    if (normalizedBarber.toLowerCase() !== 'any') {
      const selected = query(getDatabase(), 'SELECT name, status FROM barbers WHERE is_on_duty = 1 AND lower(name) = lower(?)', [normalizedBarber])[0];
      if (!selected) throw new CatalogError('That barber is unavailable.', 409, 'BARBER_UNAVAILABLE');
    }
    const totalMinutes = services.reduce((sum, service) => sum + Number(service.durationMinutes), 0);
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);
    const metrics = calculateWait({ barber: normalizedBarber, totalMinutes, createdAt: clock().toISOString() });
    return { serviceIds: ids, barber: normalizedBarber, totalMinutes, totalPrice, waitingCount: metrics.waitingCount, expectedWaitMinutes: metrics.expectedWaitMinutes };
  }

  function calculateWait({ barber = 'any', targetId = null, totalMinutes = 0, createdAt = clock().toISOString() } = {}) {
    const today = getSalonDayKey(clock(), timezone);
    const entries = query(getDatabase(), `SELECT id, barber, assigned_barber AS assignedBarber, status, total_minutes AS totalMinutes, created_at AS createdAt, status_updated_at AS statusUpdatedAt FROM queue_entries WHERE token_day = ? ORDER BY token_number`, [today]);
    const waiting = entries.filter((entry) => entry.status === 'Waiting');
    let ahead;
    if (targetId === null) ahead = waiting;
    else {
      const targetIndex = waiting.findIndex((entry) => Number(entry.id) === Number(targetId));
      ahead = targetIndex < 0 ? [] : waiting.slice(0, targetIndex);
    }
    const specific = barber.toLowerCase() !== 'any';
    const eligibleAhead = specific ? ahead.filter((entry) => entry.barber.toLowerCase() === barber.toLowerCase() || entry.barber.toLowerCase() === 'any') : ahead;
    const waitingMinutes = eligibleAhead.reduce((sum, entry) => sum + Number(entry.totalMinutes), 0);
    const busy = entries.filter((entry) => entry.status === 'Called' || entry.status === 'In chair').filter((entry) => !specific || (entry.assignedBarber || entry.barber).toLowerCase() === barber.toLowerCase());
    const nowMs = clock().getTime();
    const busyMinutes = busy.reduce((sum, entry) => {
      const elapsed = Math.max(0, (nowMs - new Date(entry.statusUpdatedAt || entry.createdAt).getTime()) / 60_000);
      return sum + Math.max(0, Number(entry.totalMinutes) - elapsed);
    }, 0);
    const workingBarbers = query(getDatabase(), "SELECT COUNT(*) AS count FROM barbers WHERE is_on_duty = 1 AND status != 'on_break'")[0]?.count ?? 0;
    const divisor = specific ? 1 : Math.max(1, Number(workingBarbers));
    const raw = (waitingMinutes + busyMinutes) / divisor;
    const rounded = raw <= 0 ? 0 : Math.ceil(raw / 5) * 5;
    const targetPosition = targetId === null ? waiting.length + 1 : waiting.findIndex((entry) => Number(entry.id) === Number(targetId)) + 1;
    const target = targetId === null ? null : query(getDatabase(), 'SELECT status FROM queue_entries WHERE id = ?', [targetId])[0];
    return { position: targetId === null ? null : target?.status === 'Waiting' && targetPosition > 0 ? targetPosition : null, waitingCount: waiting.length, expectedWaitMinutes: rounded, isBarberOnBreak: specific && Boolean(query(getDatabase(), "SELECT 1 FROM barbers WHERE lower(name) = lower(?) AND status = 'on_break' AND is_on_duty = 1", [barber]).length) };
  }

  function getSpot(spot) {
    const today = getSalonDayKey(clock(), timezone);
    const services = query(getDatabase(), 'SELECT source_service_id AS sourceServiceId, name_en AS nameEn, name_gu AS nameGu, duration_minutes AS durationMinutes, price FROM queue_entry_services WHERE queue_entry_id = ? ORDER BY id', [spot.id]);
    const previousDay = spot.token_day !== today;
    const metrics = previousDay ? { position: null, waitingCount: 0, expectedWaitMinutes: null, isBarberOnBreak: false } : calculateWait({ barber: spot.barber, targetId: spot.id, totalMinutes: Number(spot.total_minutes), createdAt: spot.created_at });
    return { id: String(spot.id), token: spot.token, tokenNumber: Number(spot.token_number), tokenDay: spot.token_day, name: spot.name, phone: spot.phone, barber: spot.barber, assignedBarber: spot.assigned_barber ?? null, status: spot.status, services, totalMinutes: Number(spot.total_minutes), totalPrice: Number(spot.total_price), createdAt: spot.created_at, statusUpdatedAt: spot.status_updated_at, previousDay, readOnly: previousDay, ...metrics };
  }

  function getReceptionData() {
    const db = getDatabase(); const now = clock(); const today = getSalonDayKey(now, timezone);
    const entries = query(db, "SELECT * FROM queue_entries WHERE token_day = ? AND status IN ('Waiting', 'Called', 'In chair') ORDER BY token_number", [today]).map((entry) => {
      const spot = getSpot(entry);
      const services = spot.services.map((service) => ({ nameEn: service.nameEn, nameGu: service.nameGu, durationMinutes: service.durationMinutes, price: service.price, quantity: 1 }));
      const waitedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(entry.created_at).getTime()) / 60_000));
      const statusMinutes = Math.max(0, Math.floor((now.getTime() - new Date(entry.status_updated_at).getTime()) / 60_000));
      return { ...spot, services, preferredBarber: entry.barber, waitingMinutes: entry.status === 'Waiting' ? waitedMinutes : null, minutesWaited: waitedMinutes, statusMinutes, canMarkNoShow: entry.status === 'Called' && statusMinutes >= 10 };
    });
    const barbers = query(db, 'SELECT id, name, avatar, status, is_on_duty AS isOnDuty FROM barbers WHERE is_on_duty = 1 ORDER BY id').map((barber) => {
      const current = entries.find((entry) => entry.assignedBarber?.toLowerCase() === barber.name.toLowerCase() && ['Called', 'In chair'].includes(entry.status));
      const status = barber.status === 'on_break' ? 'on_break' : current ? 'busy' : barber.status;
      return { id: Number(barber.id), name: barber.name, avatar: barber.avatar, status, currentCustomer: current ? { id: current.id, token: current.token, name: current.name, status: current.status, totalMinutes: current.totalMinutes, elapsedMinutes: current.statusMinutes, assignedAt: current.statusUpdatedAt } : null };
    });
    return { date: today, barbers, waitingList: entries.filter((entry) => entry.status === 'Waiting'), called: entries.filter((entry) => entry.status === 'Called'), inChair: entries.filter((entry) => entry.status === 'In chair') };
  }

  function callNext(barberId) {
    const db = getDatabase(); const now = clock(); const today = getSalonDayKey(now, timezone);
    db.run('BEGIN IMMEDIATE');
    try {
      const barber = query(db, 'SELECT id, name, status FROM barbers WHERE id = ? AND is_on_duty = 1', [barberId])[0];
      if (!barber) throw new CatalogError('This barber is not on duty.', 409, 'BARBER_UNAVAILABLE');
      if (barber.status === 'on_break') throw new CatalogError('This barber is on break.', 409, 'BARBER_ON_BREAK');
      if (barber.status !== 'free') throw new CatalogError('This barber is not available.', 409, 'BARBER_BUSY');
      const reserved = query(db, "SELECT id FROM queue_entries WHERE token_day = ? AND assigned_barber = ? AND status IN ('Called', 'In chair') LIMIT 1", [today, barber.name])[0];
      if (reserved) throw new CatalogError('This barber already has an active customer.', 409, 'BARBER_BUSY');
      const next = query(db, "SELECT id FROM queue_entries WHERE token_day = ? AND status = 'Waiting' AND (lower(barber) = lower(?) OR lower(barber) = 'any') ORDER BY token_number LIMIT 1", [today, barber.name])[0];
      if (!next) throw new CatalogError('No waiting customer is available for this barber.', 409, 'NO_ELIGIBLE_CUSTOMER');
      const timestamp = now.toISOString();
      db.run("UPDATE queue_entries SET status = 'Called', assigned_barber = ?, status_updated_at = ? WHERE id = ? AND status = 'Waiting'", [barber.name, timestamp, next.id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('The customer was already called. Refresh and try again.', 409, 'QUEUE_CONFLICT');
      db.run("UPDATE barbers SET status = 'busy' WHERE id = ? AND status = 'free'", [barber.id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('This barber is no longer available. Refresh and try again.', 409, 'BARBER_CONFLICT');
      db.run('COMMIT'); persist();
      return getSpot(query(db, 'SELECT * FROM queue_entries WHERE id = ?', [next.id])[0]);
    } catch (error) { try { db.run('ROLLBACK'); } catch { /* transaction already ended */ } throw error; }
  }

  function cancelWaiting(id) {
    const db = getDatabase(); const now = clock(); const today = getSalonDayKey(now, timezone);
    db.run('BEGIN IMMEDIATE');
    try {
      const entry = query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0];
      if (!entry) throw new CatalogError('Spot not found.', 404, 'SPOT_NOT_FOUND');
      if (entry.token_day !== today) throw new CatalogError('Previous-day spots are read-only.', 409, 'SPOT_READ_ONLY');
      if (entry.status !== 'Waiting') throw new CatalogError('Staff can cancel only Waiting customers.', 409, 'CANCEL_NOT_ALLOWED');
      db.run("UPDATE queue_entries SET status = 'Cancelled', status_updated_at = ? WHERE id = ? AND status = 'Waiting'", [now.toISOString(), id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('This spot has already changed. Refresh and try again.', 409, 'QUEUE_CONFLICT');
      db.run('COMMIT'); persist();
      return getSpot(query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0]);
    } catch (error) { try { db.run('ROLLBACK'); } catch { /* transaction already ended */ } throw error; }
  }

  function markNoShow(id) {
    const db = getDatabase(); const now = clock(); const today = getSalonDayKey(now, timezone);
    db.run('BEGIN IMMEDIATE');
    try {
      const entry = query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0];
      if (!entry) throw new CatalogError('Spot not found.', 404, 'SPOT_NOT_FOUND');
      if (entry.token_day !== today) throw new CatalogError('Previous-day spots are read-only.', 409, 'SPOT_READ_ONLY');
      if (entry.status !== 'Called') throw new CatalogError('Only Called customers can be marked as No-show.', 409, 'NO_SHOW_NOT_ALLOWED');
      const calledMinutes = (now.getTime() - new Date(entry.status_updated_at).getTime()) / 60_000;
      if (calledMinutes < 10) throw new CatalogError('No-show is available after 10 minutes.', 409, 'NO_SHOW_TOO_EARLY');
      db.run("UPDATE queue_entries SET status = 'No-show', status_updated_at = ? WHERE id = ? AND status = 'Called'", [now.toISOString(), id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('This spot has already changed. Refresh and try again.', 409, 'QUEUE_CONFLICT');
      if (entry.assigned_barber) db.run("UPDATE barbers SET status = 'free' WHERE name = ? AND status = 'busy' AND NOT EXISTS (SELECT 1 FROM queue_entries WHERE assigned_barber = ? AND status IN ('Called', 'In chair') AND id != ?)", [entry.assigned_barber, entry.assigned_barber, id]);
      db.run('COMMIT'); persist();
      return getSpot(query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0]);
    } catch (error) { try { db.run('ROLLBACK'); } catch { /* transaction already ended */ } throw error; }
  }

  return { getStatus, estimate, calculateWait, getSpot, getReceptionData, callNext, cancelWaiting, markNoShow, getSalonDayKey: (date = clock()) => getSalonDayKey(date, timezone) };
}
