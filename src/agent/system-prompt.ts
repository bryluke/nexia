import { resolve } from "node:path";
import { searchMemory, listRecentMemory } from "../db/queries/memory.ts";

/**
 * Build the system prompt append for a query.
 * Injects Nexia context, CLAUDE.md from cwd, and recalled memories.
 */
export async function buildSystemPrompt(
  cwd: string,
  userMessage: string
): Promise<string> {
  let prompt = `# Nexia Context

You are a Claude Code instance running inside **Nexia v2**, a web UI that wraps the Claude Agent SDK. The user is chatting with you through Nexia's browser interface, not the CLI directly.

- Working directory: \`${cwd}\`
- You have full Claude Code tools (file ops, bash, search, subagents, etc.)
- Nexia's source code is at \`${process.cwd()}\` — you can read and edit it
- The user may need to restart Nexia and refresh the browser after source changes`;

  // Inject CLAUDE.md from the conversation's working directory
  const claudeMdPath = resolve(cwd, "CLAUDE.md");
  try {
    const claudeMdFile = Bun.file(claudeMdPath);
    if (await claudeMdFile.exists()) {
      const claudeMdContent = await claudeMdFile.text();
      prompt += `\n\n# Project CLAUDE.md (from ${cwd})\n\n${claudeMdContent}`;
    }
  } catch {
    // CLAUDE.md doesn't exist or can't be read
  }

  // Recall relevant memories
  const memories = recallMemories(userMessage);
  if (memories.length > 0) {
    prompt += "\n\n# Recalled Memories\n\n";
    for (const mem of memories) {
      prompt += `- [${mem.kind}] ${mem.content}\n`;
    }
  }

  return prompt;
}

function recallMemories(
  query: string
): Array<{ kind: string; content: string }> {
  // Extract keywords from the user message (words > 3 chars)
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  const seen = new Set<string>();
  const results: Array<{ kind: string; content: string }> = [];

  // Search by keywords
  for (const keyword of keywords) {
    const rows = searchMemory.all(keyword, keyword);
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        results.push({ kind: row.kind, content: row.content });
      }
    }
  }

  // If no keyword matches, include recent memories
  if (results.length === 0) {
    const recent = listRecentMemory.all(10);
    for (const row of recent) {
      results.push({ kind: row.kind, content: row.content });
    }
  }

  return results.slice(0, 15);
}
