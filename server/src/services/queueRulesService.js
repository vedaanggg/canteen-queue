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
    const peopleWaiting = Math.max(0, Number(waitingCount()) || 0);
    return {
      isOpen,
      status: isOpen ? 'open' : 'closed',
      openingTime: '10:00',
      closingTime: '21:00',
      onlineJoiningOpen,
      onlineJoiningEnabled: ownerEnabled,
      waitingCount: peopleWaiting,
      estimatedWaitMinutes: peopleWaiting * Math.max(0, Number(waitMinutesPerPerson) || 0),
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
      if (selected.status === 'on_break') throw new CatalogError(`${selected.name} is on break. Choose another barber or Any barber.`, 409, 'BARBER_ON_BREAK');
    }
    const totalMinutes = services.reduce((sum, service) => sum + Number(service.durationMinutes), 0);
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);
    const count = Math.max(0, Number(waitingCount()) || 0);
    return { serviceIds: ids, barber: normalizedBarber, totalMinutes, totalPrice, waitingCount: count, expectedWaitMinutes: count * Math.max(0, Number(waitMinutesPerPerson) || 0) };
  }

  return { getStatus, estimate };
}
