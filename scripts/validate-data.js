// يتحقق من سلامة بيانات كل الدول قبل النشر: npm run validate
import { readFileSync, existsSync } from 'node:fs';

const countries = JSON.parse(readFileSync('data/countries.json', 'utf8'));
const errors = [];
// الأرقام فريدة عبر كل الدول (المنصة تخزّنها في جدول واحد): الجزائر بأرقامها الأصلية،
// وباقي الدول: منطقة = رمز ISO الرقمي × 1000 + رقمها، بلدية = رمز ISO الرقمي × 100000 + رقمها
const globalRegions = new Map(); const globalLocalities = new Map();
const need = ['code', 'name', 'ar_name', 'currency', 'phone_prefix', 'levels'];

for (const c of countries) {
  for (const k of need) if (!c[k]) errors.push(`${c.code || '?'}: missing "${k}"`);
  if (!/^[A-Z]{2}$/.test(c.code || '')) errors.push(`${c.code}: code must be ISO 3166-1 alpha-2`);
  const file = `data/${c.code}.json`;
  if (!existsSync(file)) { errors.push(`${c.code}: missing ${file}`); continue; }
  const { country, regions } = JSON.parse(readFileSync(file, 'utf8'));
  if (country !== c.code) errors.push(`${file}: country field is "${country}"`);
  const regionIds = new Set(); const localityIds = new Set();
  for (const r of regions) {
    if (regionIds.has(r.id)) errors.push(`${c.code}: duplicate region id ${r.id}`);
    if (globalRegions.has(r.id) && globalRegions.get(r.id) !== c.code) errors.push(`${c.code}: region id ${r.id} already used by ${globalRegions.get(r.id)}`);
    globalRegions.set(r.id, c.code);
    regionIds.add(r.id);
    if (!r.name || !r.ar_name) errors.push(`${c.code}: region ${r.id} needs name and ar_name`);
    if (!r.localities?.length) errors.push(`${c.code}: region ${r.id} has no localities`);
    for (const l of r.localities || []) {
      if (localityIds.has(l.id)) errors.push(`${c.code}: duplicate locality id ${l.id}`);
      if (globalLocalities.has(l.id) && globalLocalities.get(l.id) !== c.code) errors.push(`${c.code}: locality id ${l.id} already used by ${globalLocalities.get(l.id)}`);
      globalLocalities.set(l.id, c.code);
      localityIds.add(l.id);
      if (!l.name || !l.ar_name) errors.push(`${c.code}: locality ${l.id} needs name and ar_name`);
    }
  }
  console.log(`${c.code}: ${regions.length} regions, ${localityIds.size} localities`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('✓ data ok');
