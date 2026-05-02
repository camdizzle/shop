import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const auth = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', secure: false });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

app.get('/api/filaments', (_req, res) => {
  res.json(db.prepare('SELECT * FROM filaments ORDER BY id DESC').all());
});

app.post('/api/filaments', auth, (req, res) => {
  const { material, color, sku, stock_grams } = req.body;
  const info = db.prepare('INSERT INTO filaments (material,color,sku,stock_grams) VALUES (?,?,?,?)').run(material, color, sku, stock_grams);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/products', (_req, res) => {
  const rows = db.prepare(`SELECT p.*, f.material, f.color FROM products p JOIN filaments f ON p.filament_id=f.id ORDER BY p.id DESC`).all();
  res.json(rows);
});

app.post('/api/products', auth, (req, res) => {
  const { name, description, image_url, price_cents, filament_id } = req.body;
  const info = db.prepare('INSERT INTO products (name,description,image_url,price_cents,filament_id) VALUES (?,?,?,?,?)').run(name, description, image_url, price_cents, filament_id);
  res.json({ id: info.lastInsertRowid });
});


const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.post('/api/checkout', async (req, res) => {
  const { items } = req.body;
  if (!stripe.apiKey) return res.status(400).json({ error: 'Stripe key missing' });
  const line_items = items.map((i) => ({
    price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price_cents },
    quantity: i.quantity
  }));
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: `${process.env.CLIENT_ORIGIN}?checkout=success`,
    cancel_url: `${process.env.CLIENT_ORIGIN}/cart`
  });
  res.json({ url: session.url });
});

app.listen(process.env.PORT || 4000, () => console.log('API running'));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
