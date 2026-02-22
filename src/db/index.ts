import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";

mkdirSync("./data", { recursive: true });

const db = new Database("./data/nexia.db", { create: true });

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New conversation',
    session_id TEXT,
    cwd TEXT NOT NULL DEFAULT '${homedir()}',
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at)
`);

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  content_blocks: string | null;
  created_at: string;
}

// Migration: add status, summary, archived_at columns
try {
  db.exec(`ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived'))`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE conversations ADD COLUMN summary TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE conversations ADD COLUMN archived_at TEXT`);
} catch { /* column already exists */ }

// Migration: add content_blocks column to messages
try {
  db.exec(`ALTER TABLE messages ADD COLUMN content_blocks TEXT`);
} catch { /* column already exists */ }

export interface Conversation {
  id: string;
  title: string;
  session_id: string | null;
  cwd: string;
  status: string;
  summary: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const listConversations = db.prepare<Conversation, []>(
  "SELECT * FROM conversations ORDER BY updated_at DESC"
);

export const getConversation = db.prepare<Conversation, [string]>(
  "SELECT * FROM conversations WHERE id = ?"
);

export const insertConversation = db.prepare<void, [string, string, string]>(
  "INSERT INTO conversations (id, title, cwd) VALUES (?, ?, ?)"
);

export const updateConversationSessionId = db.prepare<void, [string, string]>(
  "UPDATE conversations SET session_id = ?, updated_at = datetime('now') WHERE id = ?"
);

export const updateConversationTitle = db.prepare<void, [string, string]>(
  "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?"
);

export const touchConversation = db.prepare<void, [string]>(
  "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?"
);

export const deleteConversation = db.prepare<void, [string]>(
  "DELETE FROM conversations WHERE id = ?"
);

export const insertMessage = db.prepare<void, [string, string, string, string, string | null]>(
  "INSERT INTO messages (id, conversation_id, role, content, content_blocks) VALUES (?, ?, ?, ?, ?)"
);

export const listMessages = db.prepare<Message, [string]>(
  "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
);

export const deleteMessages = db.prepare<void, [string]>(
  "DELETE FROM messages WHERE conversation_id = ?"
);

export const archiveConversation = db.prepare<void, [string, string]>(
  "UPDATE conversations SET status = 'archived', summary = ?, archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
);

export const markArchived = db.prepare<void, [string]>(
  "UPDATE conversations SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
);

export const setSummary = db.prepare<void, [string, string]>(
  "UPDATE conversations SET summary = ?, updated_at = datetime('now') WHERE id = ?"
);

export { db };
