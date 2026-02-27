import { Database } from 'bun:sqlite';

const db = new Database('api-keys.db');

// Create api_keys table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    schema_name TEXT DEFAULT 'public',
    scopes TEXT NOT NULL, -- JSON object: {"rest": true, "mcp": true, "agent": true, "realtime": true}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0
  );
`);

// Create index on 'key' column for quick lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_key ON api_keys(key)`);

export default db;
