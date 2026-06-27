const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'hotmart.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    status TEXT,
    product_name TEXT,
    product_id TEXT,
    buyer_name TEXT,
    buyer_email TEXT,
    payment_method TEXT,
    value REAL,
    currency TEXT,
    created_at TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    subscriber_code TEXT,
    status TEXT,
    product_name TEXT,
    product_id TEXT,
    buyer_name TEXT,
    buyer_email TEXT,
    next_charge_date TEXT,
    created_at TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    price REAL,
    currency TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT,
    coupon_type TEXT,
    discount REAL,
    status TEXT,
    max_uses INTEGER,
    valid_until TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT,
    payload TEXT,
    received_at TEXT DEFAULT (datetime('now'))
  );
`);

const upsertSale = db.prepare(`
  INSERT OR REPLACE INTO sales
    (id, status, product_name, product_id, buyer_name, buyer_email, payment_method, value, currency, created_at)
  VALUES
    (:id, :status, :product_name, :product_id, :buyer_name, :buyer_email, :payment_method, :value, :currency, :created_at)
`);

const getSales = db.prepare(`SELECT * FROM sales ORDER BY created_at DESC`);
const getSalesByStatus = db.prepare(`SELECT * FROM sales WHERE status = ? ORDER BY created_at DESC`);
const getSalesByDateRange = db.prepare(`SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`);

const upsertSubscription = db.prepare(`
  INSERT OR REPLACE INTO subscriptions
    (id, subscriber_code, status, product_name, product_id, buyer_name, buyer_email, next_charge_date, created_at)
  VALUES
    (:id, :subscriber_code, :status, :product_name, :product_id, :buyer_name, :buyer_email, :next_charge_date, :created_at)
`);

const getSubscriptions = db.prepare(`SELECT * FROM subscriptions ORDER BY created_at DESC`);
const getActiveSubscriptions = db.prepare(`SELECT * FROM subscriptions WHERE status = 'ACTIVE'`);

const upsertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (id, name, status, price, currency)
  VALUES (:id, :name, :status, :price, :currency)
`);

const getProducts = db.prepare(`SELECT * FROM products`);

const upsertCoupon = db.prepare(`
  INSERT OR REPLACE INTO coupons (id, code, coupon_type, discount, status, max_uses, valid_until)
  VALUES (:id, :code, :coupon_type, :discount, :status, :max_uses, :valid_until)
`);

const getCoupons = db.prepare(`SELECT * FROM coupons`);

const insertWebhookEvent = db.prepare(`
  INSERT INTO webhook_events (event, payload) VALUES (?, ?)
`);

const getWebhookEvents = db.prepare(`SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 100`);

module.exports = {
  upsertSale,
  getSales,
  getSalesByStatus,
  getSalesByDateRange,
  upsertSubscription,
  getSubscriptions,
  getActiveSubscriptions,
  upsertProduct,
  getProducts,
  upsertCoupon,
  getCoupons,
  insertWebhookEvent,
  getWebhookEvents
};
