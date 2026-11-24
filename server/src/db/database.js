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
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price BETWEEN 1 AND 999),
    description TEXT,
    is_vegetarian INTEGER NOT NULL DEFAULT 1,
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE,
    token_number INTEGER NOT NULL,
    service_day TEXT NOT NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Placed', 'Preparing', 'Ready', 'Collected', 'Cancelled')),
    total INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (service_day, token_number)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    item_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
    line_total INTEGER NOT NULL
  );
`);
  persistDatabase();
}

export function persistDatabase() {
  if (!db) return;
  const bytes = db.export();
  fs.writeFileSync(databasePath, Buffer.from(bytes));
}
