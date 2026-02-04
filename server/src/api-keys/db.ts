import sqlite from '../plugins/sqlite';

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  schemaName?: string;
  scopes: string;
  createdAt: Date;
  revoked: number;
}

export const db = sqlite;

// Create api_keys table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    schemaName TEXT DEFAULT 'public',
    scopes TEXT NOT NULL, -- JSON object: {"rest": true, "mcp": true, "agent": true, "realtime": true}
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0
  );
`);

// Migration: add schemaName column if it doesn't exist
try {
  db.exec(`ALTER TABLE api_keys ADD COLUMN schemaName TEXT DEFAULT 'public'`);
} catch (e) {
  // Column might already exist
}

// Ensure existing NULL values are set to 'public'
db.exec(`UPDATE api_keys SET schemaName = 'public' WHERE schemaName IS NULL`);

// Create index on 'key' column for quick lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_key ON api_keys(key)`);
