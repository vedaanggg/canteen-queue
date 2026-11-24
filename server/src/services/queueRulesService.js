import { db as liveDatabase, queryRows as liveQueryRows } from '../db/database.js';
import { config } from '../config/env.js';
import { CatalogError } from './salonCatalogService.js';

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
    const entries = query(getDatabase(), `SELECT id, barber, status, total_minutes AS totalMinutes, created_at AS createdAt, status_updated_at AS statusUpdatedAt FROM queue_entries WHERE token_day = ? ORDER BY token_number`, [today]);
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
    const busy = entries.filter((entry) => entry.status === 'Called' || entry.status === 'In chair').filter((entry) => !specific || entry.barber.toLowerCase() === barber.toLowerCase());
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
    return { id: String(spot.id), token: spot.token, tokenNumber: Number(spot.token_number), tokenDay: spot.token_day, name: spot.name, phone: spot.phone, barber: spot.barber, status: spot.status, services, totalMinutes: Number(spot.total_minutes), totalPrice: Number(spot.total_price), createdAt: spot.created_at, previousDay, readOnly: previousDay, ...metrics };
  }

  return { getStatus, estimate, calculateWait, getSpot, getSalonDayKey: (date = clock()) => getSalonDayKey(date, timezone) };
}
