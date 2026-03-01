import { Database } from 'bun:sqlite';

const db = new Database('./data/agent-memory.db');

// Enable WAL mode for better concurrent read/write performance
db.exec('PRAGMA journal_mode = WAL;');
// Enable foreign key constraint
db.exec('PRAGMA foreign_keys = ON;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_sessions (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'New Conversation',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memory_core (
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, key),
    FOREIGN KEY (session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS memory_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS memory_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_memory_sessions_updated ON memory_sessions(updated_at);
  CREATE INDEX IF NOT EXISTS idx_memory_notes_sessions ON memory_notes(session_id);
  CREATE INDEX IF NOT EXISTS idx_memory_conversations_sessions ON memory_conversations(session_id);
`);

export default db;
