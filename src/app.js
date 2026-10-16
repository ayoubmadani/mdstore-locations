import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { listCountries, getCountryData, regionSummary } from './data.js';

export const app = new Hono();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));
// بيانات ثابتة تقريباً: تُخزَّن في CDN يوماً كاملاً
app.use('*', async (c, next) => {
  await next();
  if (c.res.status === 200) c.header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400');
});

const notFound = (c, msg) => c.json({ error: msg }, 404);
const withCountry = (c) => getCountryData(c.req.param('cc'));

app.get('/', async (c) => c.json({ service: 'mdstore-locations', version: 1, countries: (await listCountries()).map((x) => x.code) }));

// ───────── v1 ─────────
app.get('/v1/countries', async (c) => c.json(await listCountries()));

app.get('/v1/countries/:cc', async (c) => {
  const d = await withCountry(c);
  return d ? c.json({ ...d.meta, regions_count: d.regions.length }) : notFound(c, 'country not found');
});

app.get('/v1/countries/:cc/regions', async (c) => {
  const d = await withCountry(c);
  return d ? c.json(d.regions.map(regionSummary)) : notFound(c, 'country not found');
});

app.get('/v1/countries/:cc/regions/:id', async (c) => {
  const d = await withCountry(c);
  if (!d) return notFound(c, 'country not found');
  const r = d.regionById.get(Number(c.req.param('id')));
  return r ? c.json(regionSummary(r)) : notFound(c, 'region not found');
});

app.get('/v1/countries/:cc/regions/:id/localities', async (c) => {
  const d = await withCountry(c);
  if (!d) return notFound(c, 'country not found');
  const r = d.regionById.get(Number(c.req.param('id')));
  return r ? c.json(r.localities.map((l) => ({ ...l, regionId: r.id }))) : notFound(c, 'region not found');
});

app.get('/v1/countries/:cc/localities/:id', async (c) => {
  const d = await withCountry(c);
  if (!d) return notFound(c, 'country not found');
  const l = d.localityById.get(Number(c.req.param('id')));
  return l ? c.json(l) : notFound(c, 'locality not found');
});

// ───────── توافق مع API المنصة الحالي ─────────
// نفس شكل /shipping/wilayas و /shipping/get-communes/:wilayaId حتى تنتقل الواجهات بتغيير الرابط فقط
app.get('/legacy/wilayas', async (c) => {
  const d = await getCountryData('DZ');
  return c.json(d.regions.map(({ id, name, ar_name }) => ({ id, name, ar_name })));
});

app.get('/legacy/communes/:wilayaId', async (c) => {
  const d = await getCountryData('DZ');
  const r = d.regionById.get(Number(c.req.param('wilayaId')));
  return c.json(r ? r.localities.map((l) => ({ ...l, wilayaId: r.id })) : []);
});

app.notFound((c) => notFound(c, 'not found'));
