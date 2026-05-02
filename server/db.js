import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve('shop-data.json');

const defaultData = { filaments: [], products: [], counters: { filament: 1, product: 1 } };

function load() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
    return structuredClone(defaultData);
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
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

export function getProducts() {
  const data = load();
  return data.products
    .map((p) => {
      const filament = data.filaments.find((f) => f.id === p.filament_id);
      return { ...p, material: filament?.material || 'Unknown', color: filament?.color || 'Unknown' };
    })
    .sort((a, b) => b.id - a.id);
}

export function createProduct(input) {
  const data = load();
  const row = { id: data.counters.product++, ...input };
  data.products.push(row);
  save(data);
  return row;
}
