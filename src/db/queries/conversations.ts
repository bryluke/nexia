import { db } from "../connection.ts";

export interface ConversationRow {
  id: string;
  title: string;
  session_id: string | null;
  cwd: string;
  status: string;
  summary: string | null;
  tags: string | null;
  permission_mode: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const listConversations = db.prepare<ConversationRow, []>(
  "SELECT * FROM conversations ORDER BY updated_at DESC"
);

export const getConversation = db.prepare<ConversationRow, [string]>(
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

export const markArchived = db.prepare<void, [string]>(
  "UPDATE conversations SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
);

export const setSummary = db.prepare<void, [string, string]>(
  "UPDATE conversations SET summary = ?, updated_at = datetime('now') WHERE id = ?"
);

export const updatePermissionMode = db.prepare<void, [string, string]>(
  "UPDATE conversations SET permission_mode = ?, updated_at = datetime('now') WHERE id = ?"
);
