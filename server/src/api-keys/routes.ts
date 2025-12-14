import { Elysia, t } from 'elysia';
import crypto from 'crypto';

import { ApiKey, db } from './db';

const SUPER_ADMIN_API_KEY = process.env.SUPER_ADMIN_API_KEY;

// Generates a new random API key string.
export const generateApiKey = () => {
  return 'ak_' + crypto.randomBytes(32).toString('hex');
};

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  // Middleware: Only allow super admin API key to access these routes
  .onBeforeHandle(({ headers, set }) => {
    const apiKey = headers['x-api-key'];
    if (!apiKey || apiKey !== SUPER_ADMIN_API_KEY) {
      set.status = 401;
      return { error: 'Invalid or missing x-api-key' };
    }
  })

  // Create a new API key
  .post(
    '/',
    ({ body }) => {
      const key = generateApiKey();
      const stmt = db.prepare(`
        INSERT INTO api_keys (key, name, scopes)
        VALUES (?, ?, ?)
      `);
      stmt.run(key, body.name, JSON.stringify(body.scopes));
      return { key, name: body.name, scopes: body.scopes };
    },
    {
      body: t.Object({
        name: t.String(),
        scopes: t.Array(
          t.String({ enum: ['rest', 'mcp', 'agent', 'realtime'] })
        ),
      }),
    }
  )

  // List all API keys
  .get('/', () => {
    const rows = db
      .prepare('SELECT id, key, name, scopes, createdAt, revoked FROM api_keys')
      .all() as ApiKey[];
    return rows.map((r) => ({ ...r, scopes: JSON.parse(r.scopes) }));
  })

  // Permanently revoke (soft delete) an API key
  .delete(
    '/:id',
    ({ params }) => {
      db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(params.id);
      return { success: true };
    },
    { params: t.Object({ id: t.Numeric() }) }
  );
