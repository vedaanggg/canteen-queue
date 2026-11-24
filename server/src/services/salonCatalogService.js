import { db as liveDatabase, queryRows as liveQueryRows } from '../db/database.js';

function query(database, sql, params) {
  if (!database) return liveQueryRows(sql, params);
  const statement = database.prepare(sql);
  try { statement.bind(params); const results = []; while (statement.step()) results.push(statement.getAsObject()); return results; }
  finally { statement.free(); }
}

export class CatalogError extends Error {
  constructor(message, status = 400, code = 'INVALID_SELECTION') { super(message); this.status = status; this.code = code; }
}

export function createSalonCatalogService({ database } = {}) {
  const getDatabase = () => database ?? liveDatabase;
  function getServices() {
    return query(getDatabase(), 'SELECT id, name_en AS nameEn, name_gu AS nameGu, duration_minutes AS durationMinutes, price FROM services WHERE is_on = 1 ORDER BY id', []).map((service) => ({ ...service, id: Number(service.id), durationMinutes: Number(service.durationMinutes), price: Number(service.price) }));
  }
  function getBarbers() {
    return query(getDatabase(), 'SELECT id, name, avatar, status FROM barbers WHERE is_on_duty = 1 ORDER BY id', []).map((barber) => ({ ...barber, id: Number(barber.id) }));
  }
  return { getServices, getBarbers };
}
