import { db } from "../connection.ts";

export interface MemoryRow {
  id: string;
  conversation_id: string | null;
  kind: string;
  content: string;
  tags: string | null;
  created_at: string;
}

export const insertMemory = db.prepare<
  void,
  [string, string | null, string, string, string | null]
>(
  "INSERT INTO memory (id, conversation_id, kind, content, tags) VALUES (?, ?, ?, ?, ?)"
);

export const searchMemory = db.prepare<MemoryRow, [string, string]>(
  "SELECT * FROM memory WHERE content LIKE '%' || ? || '%' OR tags LIKE '%' || ? || '%' ORDER BY created_at DESC LIMIT 20"
);

export const listMemoryByKind = db.prepare<MemoryRow, [string]>(
  "SELECT * FROM memory WHERE kind = ? ORDER BY created_at DESC"
);

export const listRecentMemory = db.prepare<MemoryRow, [number]>(
  "SELECT * FROM memory ORDER BY created_at DESC LIMIT ?"
);

export const deleteMemory = db.prepare<void, [string]>(
  "DELETE FROM memory WHERE id = ?"
);

export const listMemoryForConversation = db.prepare<MemoryRow, [string]>(
  "SELECT * FROM memory WHERE conversation_id = ? ORDER BY created_at DESC"
);
