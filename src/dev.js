import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT) || 7100;
serve({ fetch: app.fetch, port }, () => console.log(`mdstore-locations on http://localhost:${port}`));
