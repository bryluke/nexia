import { query, type Query, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import {
  getConversation,
  updateConversationSessionId,
  updateConversationTitle,
  touchConversation,
  insertMessage,
  listMessages,
  markArchived,
  setSummary,
} from "../db/index.ts";
import type { ServerMessage } from "../ws/types.ts";
import type { ContentBlock } from "../shared/content-blocks.ts";

type SendFn = (msg: ServerMessage) => void;

const activeQueries = new Map<string, Query>();

// Pending permission requests awaiting user approval
const pendingPermissions = new Map<string, {
  resolve: (result: PermissionResult) => void;
  conversationId: string;
  input: Record<string, unknown>;
}>();

export function resolvePermission(permissionId: string, approved: boolean): boolean {
  const entry = pendingPermissions.get(permissionId);
  if (!entry) return false;
  pendingPermissions.delete(permissionId);
  if (approved) {
    // Must pass updatedInput — the CLI's Zod schema requires it (not optional).
    // Pass back the original input so the tool runs with unchanged parameters.
    entry.resolve({ behavior: "allow", updatedInput: entry.input });
  } else {
    entry.resolve({ behavior: "deny", message: "User denied permission" });
  }
  return true;
}

export function isQueryActive(conversationId: string): boolean {
  return activeQueries.has(conversationId);
}

export async function startQuery(
  conversationId: string,
  message: string,
  send: SendFn
): Promise<void> {
  const conversation = getConversation.get(conversationId);
  if (!conversation) {
    send({
      type: "error",
      conversationId,
      message: "Conversation not found",
    });
    return;
  }

  if (activeQueries.has(conversationId)) {
    send({
      type: "error",
      conversationId,
      message: "A query is already active for this conversation",
    });
    return;
  }

  const isFirstMessage = !conversation.session_id;

  const queryOptions: Parameters<typeof query>[0] = {
    prompt: message,
    options: {
      cwd: conversation.cwd,
      tools: { type: "preset" as const, preset: "claude_code" as const },
      systemPrompt: {
        type: "preset" as const,
        preset: "claude_code" as const,
        append: `# Nexia Context

You are a Claude Code instance running inside **Nexia**, a web UI that wraps the Claude Agent SDK. The user is chatting with you through Nexia's browser interface, not the CLI directly.

- You have full Claude Code tools (file ops, bash, search, subagents, etc.)
- Nexia's source code is at \`${process.cwd()}\` — you can read and edit it
- The user may need to restart Nexia and refresh the browser after source changes
- See \`CLAUDE.md\` in the Nexia project root for structure and conventions`,
      },
      permissionMode: "default" as const,
      canUseTool: async (toolName, input, options) => {
        const permissionId = options.toolUseID;

        send({
          type: "permission_request",
          conversationId,
          permissionId,
          toolName,
          input,
        });

        return new Promise<PermissionResult>((resolve) => {
          pendingPermissions.set(permissionId, { resolve, conversationId, input });
        });
      },
      includePartialMessages: true,
      env: {
        ...process.env,
        CLAUDECODE: undefined,
      },
      stderr: (data: string) => {
        console.error(`[SDK stderr] ${data}`);
      },
      ...(conversation.session_id
        ? { resume: conversation.session_id }
        : {}),
    },
  };

  // Persist user message
  insertMessage.run(crypto.randomUUID(), conversationId, "user", message, null);

  const q = query(queryOptions);
  activeQueries.set(conversationId, q);

  // State tracking for structured blocks
  let thinkingAccumulator = "";
  const inputJsonAccumulators = new Map<number, string>();
  const blockTypes = new Map<number, string>();
  const blockStarts = new Map<number, any>();
  const pendingToolUses = new Map<string, { name: string; input: unknown }>();

  try {
    let sessionCaptured = false;

    for await (const msg of q) {
      // Debug: log every SDK message type (remove after verifying tool_use flow)
      console.log(`[SDK] ${msg.type}${msg.type === "stream_event" ? ` → ${(msg.event as any).type}${(msg.event as any).delta?.type ? ` (${(msg.event as any).delta.type})` : ""}` : ""}`);

      // Capture session_id from the first message
      if (!sessionCaptured && "session_id" in msg && msg.session_id) {
        updateConversationSessionId.run(
          msg.session_id,
          conversationId
        );
        sessionCaptured = true;
      }

      switch (msg.type) {
        case "stream_event": {
          const event = msg.event;

          if (event.type === "content_block_start") {
            const block = event.content_block as any;
            const idx = event.index;
            if (block.type === "thinking") {
              blockTypes.set(idx, "thinking");
              thinkingAccumulator = "";
            } else if (block.type === "tool_use") {
              blockTypes.set(idx, "tool_use");
              blockStarts.set(idx, block);
              inputJsonAccumulators.set(idx, "");
            } else if (block.type === "text") {
              blockTypes.set(idx, "text");
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta as any;
            const idx = event.index;

            if (delta.type === "text_delta") {
              send({
                type: "text_delta",
                conversationId,
                text: delta.text,
              });
            } else if (delta.type === "thinking_delta") {
              thinkingAccumulator += delta.thinking;
              send({
                type: "thinking_delta",
                conversationId,
                text: delta.thinking,
              });
            } else if (delta.type === "input_json_delta") {
              const prev = inputJsonAccumulators.get(idx) || "";
              inputJsonAccumulators.set(idx, prev + delta.partial_json);
            }
          } else if (event.type === "content_block_stop") {
            const idx = event.index;
            const type = blockTypes.get(idx);

            if (type === "tool_use") {
              const block = blockStarts.get(idx);
              const jsonStr = inputJsonAccumulators.get(idx) || "{}";
              let input: unknown = {};
              try {
                input = JSON.parse(jsonStr);
              } catch {
                input = { _raw: jsonStr };
              }
              const toolUseId = block?.id || `tool-${idx}`;
              const toolName = block?.name || "unknown";

              if (!pendingToolUses.has(toolUseId)) {
                // First time seeing this tool — send start
                pendingToolUses.set(toolUseId, { name: toolName, input });
                send({
                  type: "tool_use_start",
                  conversationId,
                  toolUseId,
                  toolName,
                  input,
                });
              } else {
                // Already created from tool_progress — enrich with input
                pendingToolUses.set(toolUseId, { name: toolName, input });
                send({
                  type: "tool_use_start",
                  conversationId,
                  toolUseId,
                  toolName,
                  input,
                });
              }
              inputJsonAccumulators.delete(idx);
              blockStarts.delete(idx);
            }
            blockTypes.delete(idx);
          }
          break;
        }

        case "assistant": {
          const content = msg.message.content;
          let text = "";
          const contentBlocks: ContentBlock[] = [];

          if (Array.isArray(content)) {
            for (const block of content as any[]) {
              if (block.type === "text") {
                text += block.text;
                contentBlocks.push({ type: "text", text: block.text });
              } else if (block.type === "thinking") {
                contentBlocks.push({ type: "thinking", thinking: block.thinking || "" });
              } else if (block.type === "tool_use") {
                const pending = pendingToolUses.get(block.id);
                contentBlocks.push({
                  type: "tool_use",
                  id: block.id,
                  name: block.name,
                  input: block.input,
                  status: "running",
                });
                // Register if not already tracked
                if (!pending) {
                  pendingToolUses.set(block.id, { name: block.name, input: block.input });
                }
              }
            }
          } else if (typeof content === "string") {
            text = content;
            contentBlocks.push({ type: "text", text: content });
          }

          // Persist assistant message with content blocks
          const blocksJson = contentBlocks.length > 0 ? JSON.stringify(contentBlocks) : null;
          insertMessage.run(crypto.randomUUID(), conversationId, "assistant", text, blocksJson);

          send({
            type: "assistant_message",
            conversationId,
            content: text,
            contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
          });

          // Reset thinking accumulator after assistant message finalized
          thinkingAccumulator = "";

          // Auto-title: set title from first user message after first assistant response
          if (isFirstMessage && conversation.title === "New conversation") {
            const title =
              message.length > 50
                ? message.slice(0, 50) + "..."
                : message;
            updateConversationTitle.run(title, conversationId);
          }
          break;
        }

        case "tool_progress": {
          const toolUseId = (msg as any).tool_use_id as string | undefined;
          const toolName = msg.tool_name;

          // Create tool card on first progress event for this tool
          if (toolUseId && !pendingToolUses.has(toolUseId)) {
            pendingToolUses.set(toolUseId, { name: toolName, input: null });
            send({
              type: "tool_use_start",
              conversationId,
              toolUseId,
              toolName,
              input: null,
            });
          }

          send({
            type: "status",
            conversationId,
            status: `Using ${toolName}...`,
          });
          break;
        }

        case "tool_use_summary": {
          // Send as status for backward compat
          send({
            type: "status",
            conversationId,
            status: msg.summary,
          });

          // Also send structured tool_use_result by correlating tool IDs
          const ids = (msg as any).preceding_tool_use_ids;
          if (Array.isArray(ids)) {
            for (const toolUseId of ids) {
              send({
                type: "tool_use_result",
                conversationId,
                toolUseId,
                result: msg.summary,
                isError: false,
              });
              pendingToolUses.delete(toolUseId);
            }
          } else {
            // Fallback: resolve the most recent pending tool
            const lastKey = [...pendingToolUses.keys()].pop();
            if (lastKey) {
              send({
                type: "tool_use_result",
                conversationId,
                toolUseId: lastKey,
                result: msg.summary,
                isError: false,
              });
              pendingToolUses.delete(lastKey);
            }
          }
          break;
        }

        case "result": {
          // Mark any remaining pending tools as completed
          for (const [toolUseId] of pendingToolUses) {
            send({
              type: "tool_use_result",
              conversationId,
              toolUseId,
              result: "Completed",
              isError: false,
            });
          }
          pendingToolUses.clear();

          const success = msg.subtype === "success";
          send({
            type: "result",
            conversationId,
            success,
            error: success ? undefined : (msg as any).errors?.join(", "),
            costUsd: msg.total_cost_usd,
            durationMs: msg.duration_ms,
          });
          break;
        }
      }
    }
  } catch (err: any) {
    const errorMsg = err.message || "Query failed";
    // Auto-archive if session file is gone (resume failed)
    const isSessionGone =
      errorMsg.includes("exited with code") ||
      errorMsg.includes("session") ||
      errorMsg.includes("ENOENT");
    if (isSessionGone && conversation.session_id) {
      markArchived.run(conversationId);
      send({
        type: "archived",
        conversationId,
      });
      // Kick off summary generation in background
      generateSummary(conversationId, send);
    } else {
      send({
        type: "error",
        conversationId,
        message: errorMsg,
      });
    }
  } finally {
    activeQueries.delete(conversationId);
    touchConversation.run(conversationId);

    // Auto-deny any pending permissions for this conversation
    for (const [id, entry] of pendingPermissions) {
      if (entry.conversationId === conversationId) {
        entry.resolve({ behavior: "deny", message: "Query ended" });
        pendingPermissions.delete(id);
      }
    }
  }
}

export function interruptQuery(conversationId: string): boolean {
  const q = activeQueries.get(conversationId);
  if (!q) return false;
  q.interrupt();
  return true;
}

export async function archiveConversation(
  conversationId: string,
  send: SendFn
): Promise<void> {
  const conversation = getConversation.get(conversationId);
  if (!conversation) {
    send({ type: "error", conversationId, message: "Conversation not found" });
    return;
  }
  if (conversation.status === "archived") {
    send({ type: "error", conversationId, message: "Already archived" });
    return;
  }

  // Mark archived immediately
  markArchived.run(conversationId);
  send({ type: "archived", conversationId });

  // Generate summary async
  await generateSummary(conversationId, send);
}

async function generateSummary(
  conversationId: string,
  send: SendFn
): Promise<void> {
  const messages = listMessages.all(conversationId);
  if (messages.length === 0) {
    setSummary.run("No messages in this conversation.", conversationId);
    send({
      type: "summary_ready",
      conversationId,
      summary: "No messages in this conversation.",
    });
    return;
  }

  send({
    type: "status",
    conversationId,
    status: "Generating summary...",
  });

  // Format transcript with message numbers for references
  const transcript = messages
    .map((m, i) => `[#${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are summarizing a conversation between a user and an AI assistant. Here is the full transcript with numbered messages:

${transcript}

Generate a structured summary in markdown with these sections:

## Overview
2-3 sentences describing what this conversation was about and the outcome.

## Actions Taken
Bullet list of concrete actions performed (files created/edited, commands run, configs changed, etc.). Reference message numbers like (see #5) where relevant.

## Key Decisions
Bullet list of important decisions made and their reasoning. Reference message numbers.

## Topics Covered
Short bullet list of main topics discussed.

Be concise but thorough. Focus on what would be useful for someone reviewing this conversation later.`;

  try {
    const q = query({
      prompt,
      options: {
        tools: [],
        maxTurns: 1,
        env: {
          ...process.env,
          CLAUDECODE: undefined,
        },
        stderr: (data: string) => {
          console.error(`[SDK summary stderr] ${data}`);
        },
      },
    });

    let summaryText = "";
    for await (const msg of q) {
      if (msg.type === "assistant") {
        const content = msg.message.content;
        if (Array.isArray(content)) {
          summaryText = content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("");
        } else if (typeof content === "string") {
          summaryText = content;
        }
      }
    }

    if (summaryText) {
      setSummary.run(summaryText, conversationId);
      send({
        type: "summary_ready",
        conversationId,
        summary: summaryText,
      });
    }
  } catch (err: any) {
    console.error(`[Summary generation failed] ${err.message}`);
    const fallback = `Summary generation failed. Conversation had ${messages.length} messages.`;
    setSummary.run(fallback, conversationId);
    send({
      type: "summary_ready",
      conversationId,
      summary: fallback,
    });
  }
}
