// مصدر البيانات:
//  1) LOCATIONS_DATA_URL (مثلاً <R2 public>/locations) — يكتبها مدير المنصة عبر أدوات MCP، بلا نشر
//  2) مجلد data/ المرفق — احتياطي إن لم يُضبط الرابط أو تعذّرت القراءة
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const REMOTE = (process.env.LOCATIONS_DATA_URL || '').replace(/\/$/, '');
const TTL_MS = Number(process.env.LOCATIONS_TTL_MS) || 5 * 60 * 1000;

const readLocal = (file) => {
  try { return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8')); } catch { return null; }
};
async function readRemote(file) {
  if (!REMOTE) return null;
  try {
    const res = await fetch(`${REMOTE}/${file}`, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

// ذاكرة مؤقتة لكل ملف (5 دقائق) — نسخة قديمة أفضل من لا شيء إن تعذّر المصدر
const files = new Map();
async function load(file) {
  const hit = files.get(file);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = (await readRemote(file)) ?? hit?.data ?? readLocal(file);
  if (data) files.set(file, { at: Date.now(), data });
  return data;
}

export async function listCountries() {
  return ((await load('countries.json')) || []).filter((c) => c.active !== false);
}

const indexes = new WeakMap();
export async function getCountryData(code) {
  const cc = String(code || '').toUpperCase();
  const meta = (await listCountries()).find((c) => c.code === cc);
  if (!meta) return null;
  const file = await load(`${cc}.json`);
  if (!file) return null;
  if (!indexes.has(file)) {
    const regions = file.regions;
    const regionById = new Map(regions.map((r) => [r.id, r]));
    const localityById = new Map();
    for (const r of regions) for (const l of r.localities) localityById.set(l.id, { ...l, regionId: r.id });
    indexes.set(file, { regions, regionById, localityById });
  }
  return { meta, ...indexes.get(file) };
}

// المنطقة بدون قائمة البلديات (للقوائم)
export const regionSummary = ({ localities, ...r }) => ({ ...r, localities_count: localities.length });
