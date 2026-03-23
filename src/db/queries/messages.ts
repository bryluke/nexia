import { db } from "../connection.ts";

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  content_blocks: string | null;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

export const insertMessage = db.prepare<
  void,
  [string, string, string, string, string | null]
>(
  "INSERT INTO messages (id, conversation_id, role, content, content_blocks) VALUES (?, ?, ?, ?, ?)"
);

export const listMessages = db.prepare<MessageRow, [string]>(
  "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
);

export const deleteMessages = db.prepare<void, [string]>(
  "DELETE FROM messages WHERE conversation_id = ?"
);

export const updateMessageCost = db.prepare<void, [number, number, string]>(
  "UPDATE messages SET cost_usd = ?, duration_ms = ? WHERE id = ?"
);

export const countMessages = db.prepare<{ count: number }, [string]>(
  "SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?"
);

export const listMessagesBefore = db.prepare<MessageRow, [string, string, number]>(
  "SELECT * FROM messages WHERE conversation_id = ? AND created_at < ? ORDER BY created_at ASC LIMIT ?"
);
