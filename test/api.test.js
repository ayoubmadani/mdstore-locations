import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

const get = async (path) => { const r = await app.request(path); return { status: r.status, body: await r.json(), headers: r.headers }; };

test('lists countries', async () => {
  const { status, body } = await get('/v1/countries');
  assert.equal(status, 200);
  assert.equal(body[0].code, 'DZ');
});

test('Algeria has 58 wilayas with stable ids', async () => {
  const { body } = await get('/v1/countries/dz/regions');
  assert.equal(body.length, 58);
  const oran = body.find((r) => r.id === 31);
  assert.equal(oran.code, 'DZ-31');
  assert.equal(oran.ar_name, 'وهران');
  assert.ok(oran.localities_count > 0);
  assert.equal(oran.localities, undefined);
});

test('localities of a region and lookup by id', async () => {
  const { body } = await get('/v1/countries/DZ/regions/16/localities');
  assert.ok(body.length > 0);
  assert.ok(body.every((l) => l.regionId === 16));
  const one = await get(`/v1/countries/DZ/localities/${body[0].id}`);
  assert.equal(one.body.regionId, 16);
});

test('legacy endpoints keep the platform shape', async () => {
  const w = await get('/legacy/wilayas');
  assert.deepEqual(Object.keys(w.body[0]).sort(), ['ar_name', 'id', 'name']);
  const c = await get('/legacy/communes/31');
  assert.ok(c.body.every((x) => x.wilayaId === 31 && 'post_code' in x));
  assert.deepEqual((await get('/legacy/communes/999')).body, []);
});

test('unknown country / region return 404, responses are cacheable', async () => {
  assert.equal((await get('/v1/countries/xx/regions')).status, 404);
  assert.equal((await get('/v1/countries/DZ/regions/999')).status, 404);
  const { headers } = await get('/v1/countries');
  assert.match(headers.get('cache-control'), /s-maxage/);
  assert.equal(headers.get('access-control-allow-origin'), '*');
});
