import { query } from "@anthropic-ai/claude-agent-sdk";
import { listMessages } from "../db/queries/messages.ts";
import { insertMemory } from "../db/queries/memory.ts";
import { setSummary } from "../db/queries/conversations.ts";

/**
 * Generate a summary and extract memories from a completed conversation.
 * Called after archiving.
 */
export async function summarizeAndExtract(
  conversationId: string
): Promise<{ summary: string; memoryCount: number }> {
  const messages = listMessages.all(conversationId);
  if (messages.length === 0) {
    return { summary: "No messages.", memoryCount: 0 };
  }

  const transcript = messages
    .map((m, i) => `[#${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = `Analyze this conversation transcript and produce JSON with this exact structure:
{
  "summary": "2-3 sentence overview of what happened and the outcome",
  "facts": ["fact 1", "fact 2"],
  "decisions": ["decision 1"],
  "todos": ["todo 1"]
}

Rules:
- facts: concrete things learned (file paths, configs, patterns discovered)
- decisions: choices made with reasoning
- todos: action items mentioned but not completed
- Keep each item to 1-2 sentences max
- Only include genuinely useful items, not trivial observations

Transcript:
${transcript}

Respond with ONLY the JSON, no markdown fences.`;

  try {
    const q = query({
      prompt,
      options: {
        tools: [],
        maxTurns: 1,
        env: { ...process.env, CLAUDECODE: undefined },
        stderr: () => {},
      },
    });

    let responseText = "";
    for await (const msg of q) {
      if (msg.type === "assistant") {
        const content = msg.message.content;
        if (Array.isArray(content)) {
          responseText = (content as any[])
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");
        } else if (typeof content === "string") {
          responseText = content;
        }
      }
    }

    // Parse the structured response
    const parsed = JSON.parse(responseText);
    let memoryCount = 0;

    if (parsed.summary) {
      setSummary.run(parsed.summary, conversationId);
    }

    const items: Array<{ kind: string; items: string[] }> = [
      { kind: "fact", items: parsed.facts || [] },
      { kind: "decision", items: parsed.decisions || [] },
      { kind: "todo", items: parsed.todos || [] },
    ];

    for (const { kind, items: list } of items) {
      for (const content of list) {
        if (typeof content === "string" && content.trim()) {
          insertMemory.run(
            crypto.randomUUID(),
            conversationId,
            kind,
            content.trim(),
            null
          );
          memoryCount++;
        }
      }
    }

    return { summary: parsed.summary || "Summary generated.", memoryCount };
  } catch (err: any) {
    console.error(`[Summarizer] Failed: ${err.message}`);
    return { summary: "Summary generation failed.", memoryCount: 0 };
  }
}
