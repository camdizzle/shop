import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve('shop-data.json');

const defaultChainMaker = {
  name: 'Design Custom Hype Chains',
  description: 'Build your own custom chain with your preferred style and details.',
  image_url: 'https://designer.camwow.tv/og-image.png',
  url: 'https://designer.camwow.tv',
};

const defaultData = { filaments: [], products: [], variants: [], counters: { filament: 1, product: 1, variant: 1 }, site_config: { chain_maker: defaultChainMaker } };

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
  if (!data.site_config) data.site_config = { chain_maker: defaultChainMaker };
  if (!data.site_config.chain_maker) data.site_config.chain_maker = defaultChainMaker;
  return data;
}

function save(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export function getSiteConfig() {
  const data = load();
  return data.site_config;
}

export function updateSiteConfig(updates) {
  const data = load();
  data.site_config = { ...data.site_config, ...updates };
  save(data);
  return data.site_config;
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
    const prices = variants.map(v => v.price_cents || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const hasMultiplePrices = new Set(prices).size > 1;
    return { ...p, variants, price_cents: minPrice, has_multiple_prices: hasMultiplePrices, material: variants[0]?.material || 'Unknown', color: variants[0]?.color || 'Unknown' };
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

export function updateProductSize(productId, oldSize, updates) {
  const data = load();
  let changed = false;
  data.variants = data.variants.map((v) => {
    if (v.product_id !== productId || v.size !== oldSize) return v;
    changed = true;
    return {
      ...v,
      ...(updates.size !== undefined ? { size: updates.size } : {}),
      ...(updates.price_cents !== undefined ? { price_cents: updates.price_cents } : {}),
    };
  });
  if (!changed) return false;
  save(data);
  return true;
}

export function deleteProductSize(productId, size) {
  const data = load();
  const before = data.variants.length;
  data.variants = data.variants.filter((v) => !(v.product_id === productId && v.size === size));
  if (data.variants.length === before) return false;
  save(data);
  return true;
}

export function addProductSize(productId, size, price_cents) {
  const data = load();
  const existing = data.variants.filter(v => v.product_id === productId);
  if (existing.length === 0) return false;
  const seen = new Set();
  const newVariants = [];
  for (const v of existing) {
    const key = `${v.theme}__${v.filament_id}__${v.style || 'Standard'}`;
    if (!seen.has(key)) {
      seen.add(key);
      newVariants.push({ id: data.counters.variant++, product_id: productId, filament_id: v.filament_id, theme: v.theme, size, style: v.style || 'Standard', price_cents });
    }
  }
  data.variants.push(...newVariants);
  save(data);
  return true;
}

export function updateProduct(id, input) {
  const data = load();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'description', 'image_url', 'slug', 'color_label_1', 'color_label_2', 'color_label_3', 'buy_n_get_1_free', 'size_label', 'color_default_1', 'color_default_2', 'color_default_3', 'color_lock_1', 'color_lock_2', 'color_lock_3'];
  const update = Object.fromEntries(Object.entries(input).filter(([k]) => allowed.includes(k)));
  data.products[idx] = { ...data.products[idx], ...update };
  save(data);
  return data.products[idx];
}
