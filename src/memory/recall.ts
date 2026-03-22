import {
  searchMemory,
  listRecentMemory,
  type MemoryRow,
} from "../db/queries/memory.ts";

export interface RecalledMemory {
  id: string;
  kind: string;
  content: string;
  tags: string | null;
}

/**
 * Search memory by keywords extracted from a query string.
 * Falls back to recent memories if no keyword matches.
 */
export function recallByQuery(query: string, limit = 15): RecalledMemory[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  const seen = new Set<string>();
  const results: RecalledMemory[] = [];

  for (const keyword of keywords) {
    const rows = searchMemory.all(keyword, keyword);
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        results.push({
          id: row.id,
          kind: row.kind,
          content: row.content,
          tags: row.tags,
        });
      }
    }
  }

  // Fallback to recent memories if no matches
  if (results.length === 0) {
    const recent = listRecentMemory.all(10);
    for (const row of recent) {
      results.push({
        id: row.id,
        kind: row.kind,
        content: row.content,
        tags: row.tags,
      });
    }
  }

  return results.slice(0, limit);
}
