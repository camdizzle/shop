import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createFilament, createProduct, deleteFilament, deleteProduct, getFilaments, getProducts, updateFilament, updateProduct } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me') {
    console.warn('WARNING: JWT_SECRET is not set or is using a default value. Set a secure random string in .env');
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'change-me') {
    console.warn('WARNING: ADMIN_PASSWORD is not set or is using a default value. Set a secure password in .env');
  }
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > LOGIN_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

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

app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image file provided' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/admin/me', auth, (_req, res) => {
  res.json({ ok: true, role: 'admin' });
});

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
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
  const { material, color, sku, stock_grams, vendor } = req.body;
  const row = createFilament({ material, color, sku, stock_grams, vendor });
  res.json({ id: row.id });
});

app.delete('/api/filaments/:id', auth, (req, res) => {
  const ok = deleteFilament(Number(req.params.id));
  if (ok) return res.json({ ok: true });
  res.status(404).json({ error: 'Not found' });
});

app.put('/api/filaments/:id', auth, (req, res) => {
  const { material, color, sku, stock_grams, vendor } = req.body;
  const row = updateFilament(Number(req.params.id), { material, color, sku, stock_grams, vendor });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.get('/api/products', (_req, res) => {
  res.json(getProducts());
});

app.post('/api/products', auth, (req, res) => {
  const { parent_product_id, name, description, image_url, slug, price_cents, filament_ids = [], themes = ['Standard'], sizes = ['Standard'], styles = ['Standard'] } = req.body;
  const normalizedThemes = Array.isArray(themes) && themes.length ? themes : ['Standard'];
  const normalizedSizes = Array.isArray(sizes) && sizes.length ? sizes : ['Standard'];
  const normalizedStyles = Array.isArray(styles) && styles.length ? styles : ['Standard'];
  const variants = [];
  for (const filament_id of filament_ids) {
    for (const theme of normalizedThemes) {
      for (const size of normalizedSizes) {
        for (const style of normalizedStyles) {
          variants.push({ filament_id: Number(filament_id), theme, size, style, price_cents: Number(price_cents), ...(image_url ? { image_url } : {}) });
        }
      }
    }
  }
  if (variants.length === 0) return res.status(400).json({ error: 'At least one variant required' });
  if (!parent_product_id && (!name || !description || !image_url)) {
    return res.status(400).json({ error: 'Name, description, and image are required for new product groups.' });
  }
  try {
    const row = createProduct({ parent_product_id, name, description, image_url, slug, variants });
    res.json({ id: row.id });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to create product.' });
  }
});

app.put('/api/products/:id', auth, async (req, res) => {
  const { name, description, image_url, slug } = req.body;
  const row = updateProduct(Number(req.params.id), { name, description, image_url, slug });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
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
    const line_items = items.map((i) => {
      const desc = [i.variant, i.notes].filter(Boolean).join(' — ');
      return {
        price_data: { currency: 'usd', product_data: { name: i.name, ...(desc ? { description: desc } : {}) }, unit_amount: i.price_cents },
        quantity: i.quantity,
      };
    });
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
