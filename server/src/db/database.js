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
  db.exec('SELECT 1');
  persistDatabase();
}

export function persistDatabase() {
  if (!db) return;
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
}
