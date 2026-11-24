import { db as liveDatabase, persistDatabase as persistLiveDatabase } from '../db/database.js';
import { CatalogError } from './salonCatalogService.js';

function query(database, sql, params = []) {
  const statement = database.prepare(sql);
  try { statement.bind(params); const rows = []; while (statement.step()) rows.push(statement.getAsObject()); return rows; }
  finally { statement.free(); }
}

export function createQueueService({ database, rules, clock = () => new Date(), persist = persistLiveDatabase, emit = () => {} } = {}) {
  const getDatabase = () => database ?? liveDatabase;

  function createSpot(input = {}, emitEvent = emit) {
    const db = getDatabase();
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
    const requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';
    const barber = typeof input.barber === 'string' && input.barber.trim() ? input.barber.trim() : 'any';
    const serviceIds = input.serviceIds;
    if (!name || name.length > 100) throw new CatalogError('Enter a valid name.', 400, 'INVALID_NAME');
    if (!/^\d{10}$/.test(phone)) throw new CatalogError('Enter a valid 10-digit phone number.', 400, 'INVALID_PHONE');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new CatalogError('A valid request UUID is required.', 400, 'INVALID_REQUEST_ID');
    // sql.js runs synchronously in this process. The transaction makes token allocation and duplicate checks atomic.
    db.run('BEGIN IMMEDIATE');
    try {
      const duplicate = query(db, 'SELECT * FROM queue_entries WHERE request_id = ?', [requestId])[0];
      if (duplicate) { db.run('COMMIT'); return { spot: rules.getSpot(duplicate), existing: true, message: 'This request already created a queue spot.' }; }
      const day = rules.getSalonDayKey(clock());
      const samePhone = query(db, "SELECT * FROM queue_entries WHERE phone = ? AND token_day = ? AND status IN ('Waiting', 'Called', 'In chair') ORDER BY id DESC LIMIT 1", [phone, day])[0];
      if (samePhone) { db.run('COMMIT'); return { spot: rules.getSpot(samePhone), existing: true, message: 'You are already in the queue.' }; }
      const status = rules.getStatus();
      if (!status.onlineJoiningOpen) throw new CatalogError('Online joining is closed right now.', 409, 'QUEUE_CLOSED');
      if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 3) throw new CatalogError('Choose between 1 and 3 services.', 400, 'INVALID_SERVICE_COUNT');
      const ids = serviceIds.map(Number);
      if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) throw new CatalogError('Choose distinct valid services.', 400, 'INVALID_SERVICE_IDS');
      const services = query(db, `SELECT id, name_en AS nameEn, name_gu AS nameGu, duration_minutes AS durationMinutes, price FROM services WHERE is_on = 1 AND id IN (${ids.map(() => '?').join(',')})`, ids);
      if (services.length !== ids.length) throw new CatalogError('One or more selected services are unavailable.', 409, 'SERVICE_UNAVAILABLE');
      if (barber.toLowerCase() !== 'any') {
        const selected = query(db, 'SELECT name FROM barbers WHERE is_on_duty = 1 AND lower(name) = lower(?)', [barber])[0];
        if (!selected) throw new CatalogError('Choose a barber who is on duty, or Any barber.', 409, 'BARBER_UNAVAILABLE');
      }
      const totalMinutes = services.reduce((sum, item) => sum + Number(item.durationMinutes), 0);
      const totalPrice = services.reduce((sum, item) => sum + Number(item.price), 0);
      const timestamp = clock().toISOString();
      const counter = query(db, 'SELECT last_number FROM queue_token_counters WHERE token_day = ?', [day])[0];
      const tokenNumber = Number(counter?.last_number ?? 0) + 1;
      if (counter) db.run('UPDATE queue_token_counters SET last_number = ? WHERE token_day = ?', [tokenNumber, day]);
      else db.run('INSERT INTO queue_token_counters (token_day, last_number) VALUES (?, ?)', [day, tokenNumber]);
      db.run('INSERT INTO queue_entries (token_day, token_number, token, request_id, name, phone, barber, status, total_minutes, total_price, created_at, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [day, tokenNumber, `S-${tokenNumber}`, requestId, name, phone, barber, 'Waiting', totalMinutes, totalPrice, timestamp, timestamp]);
      const id = Number(query(db, 'SELECT last_insert_rowid() AS id')[0].id);
      for (const item of services) db.run('INSERT INTO queue_entry_services (queue_entry_id, source_service_id, name_en, name_gu, duration_minutes, price) VALUES (?, ?, ?, ?, ?, ?)', [id, item.id, item.nameEn, item.nameGu, item.durationMinutes, item.price]);
      db.run('COMMIT');
      persist();
      const spot = rules.getSpot(query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0]);
      emitEvent('queue:updated', { action: 'joined', id: spot.id, token: spot.token, status: spot.status });
      return { spot, existing: false };
    } catch (error) {
      try { db.run('ROLLBACK'); } catch { /* transaction may already have ended */ }
      if (error instanceof CatalogError) throw error;
      if (/UNIQUE constraint failed/i.test(error?.message ?? '')) throw new CatalogError('You are already in the queue.', 409, 'ACTIVE_SPOT_EXISTS');
      throw error;
    }
  }

  function getSpot(id) {
    const spot = query(getDatabase(), 'SELECT * FROM queue_entries WHERE id = ?', [id])[0];
    if (!spot) throw new CatalogError('Spot not found.', 404, 'SPOT_NOT_FOUND');
    return rules.getSpot(spot);
  }

  function cancelSpot(id, emitEvent = emit) {
    const db = getDatabase();
    db.run('BEGIN IMMEDIATE');
    try {
      const spot = query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0];
      if (!spot) throw new CatalogError('Spot not found.', 404, 'SPOT_NOT_FOUND');
      if (rules.getSalonDayKey(clock()) !== spot.token_day) throw new CatalogError('Previous-day spots are read-only.', 409, 'SPOT_READ_ONLY');
      if (spot.status !== 'Waiting') throw new CatalogError('Only a Waiting spot can be cancelled.', 409, 'CANCEL_NOT_ALLOWED');
      const timestamp = clock().toISOString();
      db.run("UPDATE queue_entries SET status = 'Cancelled', status_updated_at = ? WHERE id = ? AND status = 'Waiting'", [timestamp, id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('This spot has already changed. Refresh and try again.', 409, 'SPOT_CONFLICT');
      db.run('COMMIT'); persist();
      emitEvent('queue:updated', { action: 'cancelled', id: String(id), token: spot.token, status: 'Cancelled' });
      return getSpot(id);
    } catch (error) {
      try { db.run('ROLLBACK'); } catch { /* transaction may already have ended */ }
      throw error;
    }
  }

  return { createSpot, getSpot, cancelSpot };
}
