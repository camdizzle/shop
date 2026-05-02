import Database from 'better-sqlite3';

const db = new Database('shop.db');

db.exec(`
CREATE TABLE IF NOT EXISTS filaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material TEXT NOT NULL,
  color TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  stock_grams INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  filament_id INTEGER NOT NULL,
  FOREIGN KEY (filament_id) REFERENCES filaments(id)
);
`);

export default db;
