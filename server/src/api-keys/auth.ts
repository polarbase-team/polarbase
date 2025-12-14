import { ApiKey } from './db';

const SUPER_ADMIN_API_KEY = process.env.SUPER_ADMIN_API_KEY;

/**
 * Authenticates an API key.
 * - If the API key matches the SUPER_ADMIN_API_KEY, grants all access.
 * - Otherwise, looks up the key in the database (and checks it is not revoked).
 *   Throws if not found or revoked.
 * Returns an object with keyId, name, and scopes array.
 */
export const apiKeyAuth = async (apiKey: string) => {
  // Check if API key is the super admin key with all scopes
  if (apiKey === SUPER_ADMIN_API_KEY) {
    return { keyId: 'app-key', name: 'App Key', scopes: '*' };
  }

  // Dynamically import db (avoids circular imports)
  const { db } = await import('./db');
  // Look up API key in the database (and make sure it's not revoked)
  const row = db
    .prepare('SELECT * FROM api_keys WHERE key = ? AND revoked = 0')
    .get(apiKey) as ApiKey;
  if (!row) throw new Error('Invalid or revoked API key');

  // Parse scopes (stored as JSON array)
  const scopes = JSON.parse(row.scopes);
  return { keyId: row.id, name: row.name, scopes };
};
