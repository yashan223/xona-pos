import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'pos_local.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS local_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'cashier',
    synced INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    cost REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    description TEXT,
    imageUrl TEXT,
    salesCount INTEGER DEFAULT 0,
    synced INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS local_transactions (
    id TEXT PRIMARY KEY,
    cashierId TEXT NOT NULL,
    customerId TEXT,
    itemsJson TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    totalAmount REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash',
    paymentStatus TEXT DEFAULT 'paid',
    synced INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    synced INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_graph_nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    metadataJson TEXT,
    synced INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS local_graph_edges (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    type TEXT NOT NULL,
    metadataJson TEXT,
    synced INTEGER DEFAULT 0
  );
`);
console.log('[SQLite] Local database initialized successfully at ' + dbPath);
export default db;
export { db };
