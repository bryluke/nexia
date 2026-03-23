import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

mkdirSync("./data", { recursive: true });

const db = new Database("./data/nexia.db", { create: true });

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");
db.exec("PRAGMA foreign_keys = ON");

// Create tables inline so they exist before any query modules import
db.exec(`
  CREATE TABLE IF NOT EXISTS _meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New conversation',
    session_id TEXT,
    cwd TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    summary TEXT,
    tags TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    content_blocks TEXT,
    cost_usd REAL,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK(kind IN ('summary', 'fact', 'decision', 'todo')),
    content TEXT NOT NULL,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_kind ON memory(kind)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory(tags)`);

// Run migrations inline (must happen before query modules prepare statements)
import { runMigrations } from "./migrations.ts";
runMigrations();

export { db };
