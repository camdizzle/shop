import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve('shop-data.json');

const defaultData = { filaments: [], products: [], variants: [], counters: { filament: 1, product: 1, variant: 1 } };

function load() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
    return structuredClone(defaultData);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return migrate(data);
}

function migrate(data) {
  if (!data.variants) {
    data.variants = [];
    data.counters.variant = 1;
    for (const p of data.products || []) {
      data.variants.push({
        id: data.counters.variant++,
        product_id: p.id,
        filament_id: p.filament_id,
        theme: p.theme || 'Standard',
        size: p.size || 'Standard',
        style: p.style || 'Standard',
        price_cents: p.price_cents,
      });
    }
  }
  if (!data.counters.variant) data.counters.variant = (data.variants.at(-1)?.id || 0) + 1;
  return data;
}

function save(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export function getFilaments() {
  const data = load();
  return [...data.filaments].sort((a, b) => b.id - a.id);
}
export function createFilament(input) {
  const data = load();
  const row = { id: data.counters.filament++, ...input };
  data.filaments.push(row);
  save(data);
  return row;
}
export function deleteFilament(id) {
  const data = load();
  const idx = data.filaments.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  data.filaments.splice(idx, 1);
  save(data);
  return true;
}

export function updateFilament(id, input) {
  const data = load();
  const idx = data.filaments.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  data.filaments[idx] = { ...data.filaments[idx], ...input };
  save(data);
  return data.filaments[idx];
}

export function getProducts() {
  const data = load();
  return data.products.map((p) => {
    const variants = data.variants.filter((v) => v.product_id === p.id).map((v) => {
      const filament = data.filaments.find((f) => f.id === v.filament_id);
      return { ...v, material: filament?.material || 'Unknown', color: filament?.color || 'Unknown', color_hex: filament?.color_hex || null };
    });
    return { ...p, variants, price_cents: variants[0]?.price_cents || 0, material: variants[0]?.material || 'Unknown', color: variants[0]?.color || 'Unknown' };
  }).sort((a, b) => b.id - a.id);
}

export function createProduct(input) {
  const data = load();
  const { name, description, image_url, slug, variants = [], parent_product_id } = input;
  if (parent_product_id) {
    const existing = data.products.find((p) => p.id === Number(parent_product_id));
    if (!existing) throw new Error('Parent product not found');
    for (const v of variants) {
      data.variants.push({ id: data.counters.variant++, product_id: existing.id, ...v });
    }
    save(data);
    return existing;
  }
  const product = { id: data.counters.product++, name, description, image_url, slug: slug || name.toLowerCase().replace(/\s+/g, '-') };
  data.products.push(product);
  for (const v of variants) {
    data.variants.push({ id: data.counters.variant++, product_id: product.id, ...v });
  }
  save(data);
  return product;
}

export function deleteProduct(id) {
  const data = load();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  data.products.splice(idx, 1);
  data.variants = data.variants.filter((v) => v.product_id !== id);
  save(data);
  return true;
}

export function deleteProductTheme(productId, theme) {
  const data = load();
  const before = data.variants.length;
  data.variants = data.variants.filter((v) => !(v.product_id === productId && v.theme === theme));
  if (data.variants.length === before) return false;
  save(data);
  return true;
}

export function updateProductTheme(productId, oldTheme, updates) {
  const data = load();
  let changed = false;
  data.variants = data.variants.map((v) => {
    if (v.product_id !== productId || v.theme !== oldTheme) return v;
    changed = true;
    return {
      ...v,
      ...(updates.theme !== undefined ? { theme: updates.theme } : {}),
      ...(updates.price_cents !== undefined ? { price_cents: updates.price_cents } : {}),
      ...(updates.image_url ? { image_url: updates.image_url } : {}),
    };
  });
  if (!changed) return false;
  save(data);
  return true;
}

export function updateProduct(id, input) {
  const data = load();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'description', 'image_url', 'slug', 'color_label_1', 'color_label_2'];
  const update = Object.fromEntries(Object.entries(input).filter(([k]) => allowed.includes(k)));
  data.products[idx] = { ...data.products[idx], ...update };
  save(data);
  return data.products[idx];
}
