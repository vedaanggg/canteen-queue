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
  ensureMenuItemColumn('emoji', "TEXT NOT NULL DEFAULT '🍽️'");
  seedMenuIfEmpty();
  persistDatabase();
}

function ensureMenuItemColumn(name, definition) {
  const columns = db.exec('PRAGMA table_info(menu_items)')[0]?.values ?? [];
  const exists = columns.some((column) => column[1] === name);
  if (!exists) db.run(`ALTER TABLE menu_items ADD COLUMN ${name} ${definition}`);
}

const seedItems = [
  ['Samosa', 'Snacks', 20, 1, 'Crisp pastry with spiced potato filling.', '🥟', 1],
  ['Vada Pav', 'Snacks', 30, 1, 'Mumbai-style potato fritter in a soft pav.', '🍔', 1],
  ['Paneer Pakora', 'Snacks', 55, 1, 'Golden paneer fritters with mint chutney.', '🧀', 1],
  ['Chicken Roll', 'Snacks', 80, 0, 'Spiced chicken wrapped in a flaky paratha.', '🌯', 1],
  ['Masala Dosa', 'Meals', 70, 1, 'Crisp dosa filled with masala potato.', '🥞', 1],
  ['Veg Thali', 'Meals', 100, 1, 'Rice, dal, seasonal sabzi, roti and pickle.', '🍛', 1],
  ['Paneer Rice Bowl', 'Meals', 110, 1, 'Jeera rice topped with creamy paneer curry.', '🍲', 1],
  ['Chicken Biryani', 'Meals', 130, 0, 'Fragrant rice layered with spiced chicken.', '🍗', 1],
  ['Egg Fried Rice', 'Meals', 90, 0, 'Wok-tossed rice with egg and vegetables.', '🍚', 1],
  ['Masala Chai', 'Beverages', 15, 1, 'Strong tea brewed with ginger and spices.', '☕', 1],
  ['Cold Coffee', 'Beverages', 50, 1, 'Chilled coffee blended with milk.', '🥤', 1],
  ['Mango Lassi', 'Beverages', 45, 1, 'Sweet yogurt drink with mango.', '🥭', 1],
  ['Nimbu Pani', 'Beverages', 25, 1, 'Fresh lime, mint and a pinch of chaat masala.', '🍋', 1],
  ['Bottled Water', 'Beverages', 20, 1, 'Chilled 500 ml drinking water.', '💧', 0],
  ['Gulab Jamun', 'Desserts', 25, 1, 'Warm milk-solid dumplings in sugar syrup.', '🍡', 1],
  ['Kheer Cup', 'Desserts', 35, 1, 'Rice pudding finished with cardamom.', '🍮', 1],
  ['Chocolate Brownie', 'Desserts', 50, 1, 'Fudgy chocolate brownie baked fresh.', '🍫', 1],
  ['Malai Kulfi', 'Desserts', 30, 1, 'Creamy cardamom kulfi on a stick.', '🍦', 0],
  ['Fruit Custard', 'Desserts', 40, 1, 'Seasonal fruit folded through vanilla custard.', '🍓', 1],
];

function seedMenuIfEmpty() {
  const row = db.exec('SELECT COUNT(*) FROM menu_items')[0];
  const count = Number(row?.values?.[0]?.[0] ?? 0);
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO menu_items
      (name, category, price, is_vegetarian, description, emoji, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  try {
    for (const item of seedItems) insert.run(item);
  } finally {
    insert.free();
  }
}

export function queryRows(sql, params = []) {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

export function persistDatabase() {
  if (!db) return;
  const bytes = db.export();
  fs.writeFileSync(databasePath, Buffer.from(bytes));
}
