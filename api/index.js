// نقطة الدخول على Vercel (Node.js runtime)
import { handle } from '@hono/node-server/vercel';
import { app } from '../src/app.js';

export default handle(app);
