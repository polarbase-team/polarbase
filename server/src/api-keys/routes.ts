import { Elysia, t } from 'elysia';

import { ApiKey, db } from './db';
import { generateApiKey } from './auth';

const SUPER_ADMIN_API_KEY = process.env.SUPER_ADMIN_API_KEY;

export const apiKeyRoutes = new Elysia({ prefix: '/api-keys' })
  // Middleware: Only allow super admin API key to access these routes
  .derive(({ headers, set }) => {
    const apiKey = headers['x-api-key'];
    if (!apiKey || apiKey !== SUPER_ADMIN_API_KEY) {
      set.status = 401;
      throw new Error('Invalid or missing x-api-key');
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
        scopes: t.Object({
          rest: t.Boolean(),
          mcp: t.Boolean(),
          agent: t.Boolean(),
          realtime: t.Boolean(),
        }),
      }),
    }
  )

  // List all API keys
  .get('/', () => {
    const rows = db
      .prepare('SELECT id, key, name, scopes, createdAt, revoked FROM api_keys')
      .all() as ApiKey[];
    return rows.map((r) => ({
      ...r,
      revoked: !!r.revoked,
      scopes: JSON.parse(r.scopes) as {
        rest: boolean;
        mcp: boolean;
        agent: boolean;
        realtime: boolean;
      },
    }));
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
