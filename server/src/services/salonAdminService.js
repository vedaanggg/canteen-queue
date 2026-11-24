import { db as liveDatabase, persistDatabase as persistLiveDatabase } from '../db/database.js';
import { CatalogError } from './salonCatalogService.js';
import { createQueueRulesService } from './queueRulesService.js';

function query(database, sql, params = []) {
  const statement = database.prepare(sql);
  try { statement.bind(params); const rows = []; while (statement.step()) rows.push(statement.getAsObject()); return rows; }
  finally { statement.free(); }
}

function validService(input = {}, existing = null) {
  const nameEn = typeof input.nameEn === 'string' ? input.nameEn.trim() : '';
  const nameGu = typeof input.nameGu === 'string' ? input.nameGu.trim() : '';
  const durationMinutes = input.durationMinutes;
  const price = input.price;
  if (!nameEn) throw new CatalogError('English name is required.', 400, 'INVALID_SERVICE_NAME_EN');
  if (!nameGu) throw new CatalogError('Gujarati name is required.', 400, 'INVALID_SERVICE_NAME_GU');
  if (nameEn.length > 50 || nameGu.length > 50) throw new CatalogError('Each service name must be 50 characters or fewer.', 400, 'SERVICE_NAME_TOO_LONG');
  if (typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) throw new CatalogError('Duration must be a whole number from 5 to 180 minutes.', 400, 'INVALID_SERVICE_DURATION');
  if (typeof price !== 'number' || !Number.isInteger(price) || price < 1 || price > 9999) throw new CatalogError('Price must be a whole rupee amount from ₹1 to ₹9,999.', 400, 'INVALID_SERVICE_PRICE');
  const duplicate = query(existing?.database ?? null, 'SELECT id FROM services WHERE lower(trim(name_en)) = lower(?) AND id != ?', [nameEn, existing?.id ?? 0])[0];
  if (duplicate) throw new CatalogError('A service with this English name already exists.', 409, 'DUPLICATE_SERVICE_NAME');
  return { nameEn, nameGu, durationMinutes, price };
}

export function createSalonAdminService({ database, clock = () => new Date(), timezone = 'Asia/Kolkata', rules, persist = persistLiveDatabase } = {}) {
  const getDatabase = () => database ?? liveDatabase;
  const queueRules = rules ?? createQueueRulesService({ database: getDatabase(), clock, timezone, joiningEnabled: () => Boolean(Number(query(getDatabase(), 'SELECT online_joining_enabled AS enabled FROM salon_settings WHERE id = 1')[0]?.enabled ?? 1)), persist });
  const today = () => queueRules.getSalonDayKey(clock());

  function getSettings() {
    const db = getDatabase();
    const services = query(db, 'SELECT id, name_en AS nameEn, name_gu AS nameGu, duration_minutes AS durationMinutes, price, is_on AS isOn FROM services ORDER BY id').map((row) => ({ ...row, id: Number(row.id), durationMinutes: Number(row.durationMinutes), price: Number(row.price), isOn: Boolean(Number(row.isOn)) }));
    const barbers = query(db, 'SELECT id, name, avatar, is_on_duty AS isOnDuty, status FROM barbers ORDER BY id').map((row) => ({ ...row, id: Number(row.id), isOnDuty: Boolean(Number(row.isOnDuty)) }));
    const day = today();
    const stats = query(db, `SELECT
      SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS served,
      SUM(CASE WHEN status = 'No-show' THEN 1 ELSE 0 END) AS noShows,
      AVG(CASE WHEN started_at IS NOT NULL THEN (julianday(started_at) - julianday(created_at)) * 1440 END) AS averageWait
      FROM queue_entries WHERE token_day = ?`, [day])[0] ?? {};
    const queueStatus = queueRules.getStatus();
    return { date: day, services, barbers, queueOpen: queueStatus.onlineJoiningEnabled, stats: { served: Number(stats.served ?? 0), noShows: Number(stats.noShows ?? 0), averageWaitMinutes: Math.round(Number(stats.averageWait ?? 0) * 10) / 10 } };
  }

  function saveService(input, id = null) {
    const db = getDatabase();
    const current = id == null ? null : query(db, 'SELECT id FROM services WHERE id = ?', [id])[0];
    if (id != null && !current) throw new CatalogError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    const service = validService(input, { database: db, id: Number(id ?? 0) });
    const isOn = input.isOn === undefined ? current ? Boolean(Number(query(db, 'SELECT is_on AS isOn FROM services WHERE id = ?', [id])[0].isOn)) : true : input.isOn;
    if (typeof isOn !== 'boolean') throw new CatalogError('Choose whether the service is on or off.', 400, 'INVALID_SERVICE_STATE');
    if (id == null) db.run('INSERT INTO services (name_en, name_gu, duration_minutes, price, is_on) VALUES (?, ?, ?, ?, ?)', [service.nameEn, service.nameGu, service.durationMinutes, service.price, isOn ? 1 : 0]);
    else db.run('UPDATE services SET name_en = ?, name_gu = ?, duration_minutes = ?, price = ?, is_on = ? WHERE id = ?', [service.nameEn, service.nameGu, service.durationMinutes, service.price, isOn ? 1 : 0, id]);
    persist();
    const serviceId = Number(id ?? query(db, 'SELECT last_insert_rowid() AS id')[0].id);
    return query(db, 'SELECT id, name_en AS nameEn, name_gu AS nameGu, duration_minutes AS durationMinutes, price, is_on AS isOn FROM services WHERE id = ?', [serviceId]).map((row) => ({ ...row, id: Number(row.id), durationMinutes: Number(row.durationMinutes), price: Number(row.price), isOn: Boolean(Number(row.isOn)) }))[0];
  }

  function setBarberDuty(id, onDuty) {
    if (typeof onDuty !== 'boolean') throw new CatalogError('Choose whether the barber is on duty.', 400, 'INVALID_DUTY_STATE');
    const db = getDatabase();
    const barber = query(db, 'SELECT id, name, status, is_on_duty AS isOnDuty FROM barbers WHERE id = ?', [id])[0];
    if (!barber) throw new CatalogError('Barber not found.', 404, 'BARBER_NOT_FOUND');
    if (!onDuty && Number(barber.isOnDuty)) {
      const active = query(db, "SELECT id FROM queue_entries WHERE token_day = ? AND assigned_barber = ? AND status IN ('Called', 'In chair') LIMIT 1", [today(), barber.name])[0];
      if (active) throw new CatalogError(`${barber.name} cannot be switched off duty while a customer is Called or In chair.`, 409, 'BARBER_HAS_ACTIVE_CUSTOMER');
    }
    db.run('UPDATE barbers SET is_on_duty = ?, status = CASE WHEN ? = 1 AND status = \'on_break\' THEN status ELSE \'free\' END WHERE id = ?', [onDuty ? 1 : 0, onDuty ? 1 : 0, id]);
    persist();
    return { id: Number(id), name: barber.name, isOnDuty: onDuty, status: onDuty && barber.status === 'on_break' ? 'on_break' : 'free' };
  }

  function setServiceEnabled(id, isOn) {
    if (typeof isOn !== 'boolean') throw new CatalogError('Choose whether the service is on or off.', 400, 'INVALID_SERVICE_STATE');
    const db = getDatabase();
    const existing = query(db, 'SELECT id FROM services WHERE id = ?', [id])[0];
    if (!existing) throw new CatalogError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    db.run('UPDATE services SET is_on = ? WHERE id = ?', [isOn ? 1 : 0, id]);
    persist();
    return getSettings().services.find((service) => service.id === Number(id));
  }

  function setQueueOpen(open) {
    if (typeof open !== 'boolean') throw new CatalogError('Choose Open or Closed for online joining.', 400, 'INVALID_QUEUE_STATE');
    const db = getDatabase();
    db.run('UPDATE salon_settings SET online_joining_enabled = ? WHERE id = 1', [open ? 1 : 0]);
    persist();
    return { queueOpen: open, status: queueRules.getStatus() };
  }

  function moveToAny(id) {
    const db = getDatabase(); const currentDay = today();
    db.run('BEGIN IMMEDIATE');
    try {
      const entry = query(db, 'SELECT * FROM queue_entries WHERE id = ?', [id])[0];
      if (!entry) throw new CatalogError('Queue spot not found.', 404, 'SPOT_NOT_FOUND');
      if (entry.token_day !== currentDay) throw new CatalogError('Previous-day spots are read-only.', 409, 'SPOT_READ_ONLY');
      if (entry.status !== 'Waiting') throw new CatalogError('Only a Waiting customer can be moved to Any barber.', 409, 'MOVE_NOT_ALLOWED');
      if (entry.barber.toLowerCase() === 'any') throw new CatalogError('This customer already chose Any barber.', 409, 'ALREADY_ANY_BARBER');
      const preferred = query(db, 'SELECT is_on_duty AS isOnDuty FROM barbers WHERE lower(name) = lower(?)', [entry.barber])[0];
      if (preferred && Number(preferred.isOnDuty)) throw new CatalogError(`${entry.barber} is still on duty.`, 409, 'BARBER_STILL_AVAILABLE');
      db.run("UPDATE queue_entries SET barber = 'any' WHERE id = ? AND status = 'Waiting'", [id]);
      if (Number(query(db, 'SELECT changes() AS count')[0].count) !== 1) throw new CatalogError('This spot changed. Refresh and try again.', 409, 'QUEUE_CONFLICT');
      db.run('COMMIT'); persist();
      return { id: String(id), token: entry.token, name: entry.name, barber: 'any', status: 'Waiting' };
    } catch (error) { try { db.run('ROLLBACK'); } catch { /* transaction may already be closed */ } throw error; }
  }

  return { getSettings, saveService, setServiceEnabled, setBarberDuty, setQueueOpen, moveToAny };
}
