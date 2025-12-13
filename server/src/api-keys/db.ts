import { Database } from 'bun:sqlite';

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  scopes: string;
  created_at: Date;
  revoked: number;
}

export const db = new Database('api-keys.db');

// Create api_keys table if it does not exist
db.query(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    scopes TEXT NOT NULL, -- JSON string: ["rest", "mcp", "agent", "realtime"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0
  );
`);

// Create index on 'key' column for quick lookups
db.query(`CREATE INDEX IF NOT EXISTS idx_key ON api_keys(key)`);
