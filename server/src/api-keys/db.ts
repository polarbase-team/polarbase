import sqlite from '../plugins/sqlite';

export interface ApiKey {
  id: number;
  key: string;
  name: string;
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
    scopes TEXT NOT NULL, -- JSON object: {"rest": true, "mcp": true, "agent": true, "realtime": true}
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0
  );
`);

// Create index on 'key' column for quick lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_key ON api_keys(key)`);
