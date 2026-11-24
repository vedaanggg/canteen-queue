import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { config } from '../config/env.js';

const databasePath = path.resolve(process.cwd(), config.databasePath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export let db;

export async function initializeDatabase() {
  const SQL = await initSqlJs();
  const existingFile = fs.existsSync(databasePath) ? new Uint8Array(fs.readFileSync(databasePath)) : undefined;
  db = existingFile ? new SQL.Database(existingFile) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_gu TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      price INTEGER NOT NULL CHECK (price >= 0),
      is_on INTEGER NOT NULL DEFAULT 1 CHECK (is_on IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS barbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      avatar TEXT NOT NULL,
      is_on_duty INTEGER NOT NULL DEFAULT 1 CHECK (is_on_duty IN (0, 1)),
      status TEXT NOT NULL CHECK (status IN ('free', 'busy', 'break'))
    );
    CREATE TABLE IF NOT EXISTS salon_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      online_joining_enabled INTEGER NOT NULL DEFAULT 1 CHECK (online_joining_enabled IN (0, 1))
    );
    INSERT OR IGNORE INTO salon_settings (id, online_joining_enabled) VALUES (1, 1);
  `);
  seedServicesIfEmpty();
  seedBarbersIfEmpty();
  persistDatabase();
}

const seedServices = [
  ['Haircut', 'વાળ કપાવવું', 30, 150, 1],
  ['Beard trim', 'દાઢી ટ્રીમ', 15, 80, 1],
  ['Hair spa', 'હેર સ્પા', 45, 400, 1],
  ['Facial', 'ફેશિયલ', 40, 350, 1],
  ['Hair color', 'વાળમાં રંગ', 90, 1200, 1],
  ['Head massage', 'માથાની મસાજ', 20, 120, 1],
];
const seedBarbers = [
  ['Ravi', '👨🏽‍🦱', 1, 'free'],
  ['Amit', '👨🏻‍🦱', 1, 'busy'],
  ['Imran', '🧔🏽', 1, 'break'],
];

function seedTableIfEmpty(table, columns, values) {
  const count = Number(db.exec(`SELECT COUNT(*) FROM ${table}`)[0]?.values?.[0]?.[0] ?? 0);
  if (count) return;
  const statement = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${values.map(() => '?').join(', ')})`);
  try { for (const row of values) statement.run(row); }
  finally { statement.free(); }
}

function seedServicesIfEmpty() { seedTableIfEmpty('services', 'name_en, name_gu, duration_minutes, price, is_on', seedServices); }
function seedBarbersIfEmpty() { seedTableIfEmpty('barbers', 'name, avatar, is_on_duty, status', seedBarbers); }

export function queryRows(sql, params = []) {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const result = [];
    while (statement.step()) result.push(statement.getAsObject());
    return result;
  } finally { statement.free(); }
}

export function getOnlineJoiningEnabled() {
  const result = queryRows('SELECT online_joining_enabled AS enabled FROM salon_settings WHERE id = 1')[0];
  return Boolean(Number(result?.enabled ?? 1));
}

export function persistDatabase() {
  if (!db) return;
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
}
