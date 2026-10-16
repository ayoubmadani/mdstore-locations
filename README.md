# mdstore-locations

A standalone service for MdStore locations: **country → region (wilaya) → locality (commune)**.
It is separate from the platform API so that adding a new country only means adding data, with no platform release.

The first country is Algeria: 58 wilayas and 1541 communes. Its IDs match the platform's `wilayas` and `communes` tables exactly, so existing orders and shipping prices stay valid.

## Running

```bash
npm install
npm run dev        # http://localhost:7100
npm test
npm run validate   # checks the data files before deploying
```

On Vercel: `api/index.js` is the entry point and `data/**` is bundled with the function (see `vercel.json`).

## Endpoints

| Endpoint | Response |
|---|---|
| `GET /v1/countries` | Active countries: currency, phone prefix, level names |
| `GET /v1/countries/:cc` | One country plus its region count |
| `GET /v1/countries/:cc/regions` | Regions without localities (`id`, `code`, `name`, `ar_name`, `localities_count`) |
| `GET /v1/countries/:cc/regions/:id` | One region |
| `GET /v1/countries/:cc/regions/:id/localities` | Localities of a region |
| `GET /v1/countries/:cc/localities/:id` | One locality plus its `regionId` |
| `GET /legacy/wilayas` | Same shape as `/shipping/wilayas` in the platform API |
| `GET /legacy/communes/:wilayaId` | Same shape as `/shipping/get-communes/:wilayaId` |

`:cc` is an ISO 3166-1 alpha-2 code (`DZ`, `MA`, `TN`, …), case-insensitive.
Responses are cached on the CDN for a day (`s-maxage=86400`) and CORS is open for GET.

## Data source

- **`LOCATIONS_DATA_URL`** (for example `<R2 public URL>/locations`): the platform admin writes `countries.json` and `<CC>.json` there through the MCP tools. The service picks up changes within 5 minutes, with no deploy.
- **`data/`** in this repo: the fallback when the URL is not set or the remote read fails.

The platform API (`/admin-mcp/locations/...`) writes to R2. For Algeria it also updates the `wilayas` and `communes` tables (add/update only, never delete).

## Adding a country

### From the MCP (admin key `mdsa_` + a PIN for every change)

1. `admin_upsert_country`: code, currency, phone prefix and level names, with `active: false`.
2. `admin_upsert_region` for each region with its localities, or `admin_set_country_regions` to send them all at once.
3. `admin_upsert_country` again with `active: true`.

Read-only tools: `admin_list_countries` and `admin_list_regions`.

### From the repo files

1. Add an entry to `data/countries.json`:
   ```json
   {
     "code": "MA", "name": "Morocco", "ar_name": "المغرب", "fr_name": "Maroc",
     "currency": "MAD", "phone_prefix": "+212", "phone_pattern": "^0[67]\\d{8}$",
     "levels": { "region": { "ar": "الجهة", "fr": "Région", "en": "Region" },
                 "locality": { "ar": "المدينة", "fr": "Ville", "en": "City" } },
     "active": true
   }
   ```
2. Create `data/MA.json` in the same format as `data/DZ.json`:
   `{ "country": "MA", "regions": [{ "id", "code", "name", "ar_name", "localities": [{ "id", "name", "ar_name", "post_code" }] }] }`.
   IDs must be unique across **all** countries, because the platform stores every region in one table.
   Algeria keeps its original numbers; any other country uses its ISO numeric code: region = `numeric × 1000 + n` (Tunisia 788 → `788011`), locality = `numeric × 100000 + n` (`78801101`).
3. Run `npm run validate && npm test`, then deploy.

No code changes are needed. Set `"active": false` to hide a country while its data is still in progress.

## Moving the platform to this service (later steps, not done yet)

1. **Frontends** (store, dashboard, confirm-app, editor): replace `${API}/shipping/wilayas` with `${LOCATIONS}/legacy/wilayas` and `get-communes/:id` with `/legacy/communes/:id`. Only the URL changes.
2. **Platform API**: keep the `wilayas` and `communes` tables for now, because orders and shipping prices reference them. Fill them from this service instead of `add-wilayas` and `add-communes`.
3. **Multiple countries**: add `country` (default `DZ`) to the store, orders and shipping prices; make shipping prices per region of the store's country; move frontends to the `/v1` endpoints.
