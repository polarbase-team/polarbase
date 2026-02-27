import crypto from 'crypto';

import db from './api-key.db';

const SUPER_ADMIN_API_KEY = process.env.SUPER_ADMIN_API_KEY;

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  schemaName?: string;
  scopes: string;
  createdAt: Date;
  revoked: number;
}

// Generates a new random API key string.
export const generateApiKey = () => {
  return 'ak_' + crypto.randomBytes(32).toString('hex');
};

/**
 * Authenticates an API key.
 * - If the API key matches the SUPER_ADMIN_API_KEY, grants all access.
 * - Otherwise, looks up the key in the database (and checks it is not revoked).
 *   Throws if not found or revoked.
 * Returns an object with id, name, and scopes object.
 */
export const apiKeyAuth = async (apiKey: string) => {
  if (!apiKey) throw new Error('API key is required');

  // Check if API key is the super admin key with all scopes
  if (apiKey === SUPER_ADMIN_API_KEY) {
    return {
      id: 'super-admin-key',
      name: 'Super Admin Key',
      schemaName: null,
      scopes: { rest: true, mcp: true, agent: true, realtime: true },
    };
  }

  // Look up API key in the database (and make sure it's not revoked)
  const row = db
    .prepare(
      'SELECT id, key, name, schema_name as schemaName, scopes, created_at as createdAt, revoked FROM api_keys WHERE key = ? AND revoked = 0'
    )
    .get(apiKey) as ApiKey;
  if (!row) throw new Error('Invalid or revoked API key');

  // Parse scopes (stored as JSON object)
  const scopes = JSON.parse(row.scopes);
  return {
    id: row.id,
    name: row.name,
    schemaName: row.schemaName,
    scopes: scopes as {
      rest: boolean;
      mcp: boolean;
      agent: boolean;
      realtime: boolean;
    },
  };
};
