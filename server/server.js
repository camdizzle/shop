import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { createFilament, createProduct, getFilaments, getProducts } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
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
    res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

app.get('/api/filaments', (_req, res) => {
  res.json(getFilaments());
});

app.post('/api/filaments', auth, (req, res) => {
  const { material, color, sku, stock_grams } = req.body;
  const row = createFilament({ material, color, sku, stock_grams });
  res.json({ id: row.id });
});

app.get('/api/products', (_req, res) => {
  res.json(getProducts());
});

app.post('/api/products', auth, (req, res) => {
  const { name, description, image_url, price_cents, filament_id } = req.body;
  const row = createProduct({ name, description, image_url, price_cents, filament_id });
  res.json({ id: row.id });
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

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => console.log(`API running on ${HOST}:${PORT}`));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
