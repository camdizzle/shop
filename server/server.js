import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { createFilament, createProduct, deleteFilament, deleteProduct, getFilaments, getProducts } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

const auth = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/admin/me', auth, (_req, res) => {
  res.json({ ok: true, role: 'admin' });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
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

app.delete('/api/filaments/:id', auth, (req, res) => {
  const ok = deleteFilament(Number(req.params.id));
  if (ok) return res.json({ ok: true });
  res.status(404).json({ error: 'Not found' });
});

app.get('/api/products', (_req, res) => {
  res.json(getProducts());
});

app.post('/api/products', auth, (req, res) => {
  const { name, description, image_url, slug, price_cents, filament_ids = [], themes = ['Standard'], sizes = ['Standard'], styles = ['Standard'] } = req.body;
  const variants = [];
  for (const filament_id of filament_ids) {
    for (const theme of themes) {
      for (const size of sizes) {
        for (const style of styles) {
          variants.push({ filament_id: Number(filament_id), theme, size, style, price_cents: Number(price_cents) });
        }
      }
    }
  }
  if (variants.length === 0) return res.status(400).json({ error: 'At least one variant required' });
  const row = createProduct({ name, description, image_url, slug, variants });
  res.json({ id: row.id });
});

app.delete('/api/products/:id', auth, (req, res) => {
  const ok = deleteProduct(Number(req.params.id));
  if (ok) return res.json({ ok: true });
  res.status(404).json({ error: 'Not found' });
});

app.post('/api/checkout', async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  if (!stripe) return res.status(400).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env' });
  try {
    const line_items = items.map((i) => ({
      price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price_cents },
      quantity: i.quantity,
    }));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.CLIENT_ORIGIN}?checkout=success`,
      cancel_url: `${process.env.CLIENT_ORIGIN}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => console.log(`API running on ${HOST}:${PORT}`));
