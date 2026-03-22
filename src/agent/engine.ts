import { query, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import {
  getConversation,
  updateConversationSessionId,
  updateConversationTitle,
  touchConversation,
  markArchived,
  setSummary,
} from "../db/queries/conversations.ts";
import { insertMessage, listMessages } from "../db/queries/messages.ts";
import {
  setActiveQuery,
  removeActiveQuery,
  getActiveQuery,
  isQueryActive,
  interruptQuery as sessionInterrupt,
  addPendingPermission,
  addPendingUserInput,
  cleanupPendingForConversation,
  cleanupSession,
  dequeueMessage,
} from "./session-store.ts";
import { StreamParser, type SendFn } from "./stream-parser.ts";
import { buildSystemPrompt } from "./system-prompt.ts";

export async function startQuery(
  conversationId: string,
  message: string,
  send: SendFn
): Promise<void> {
  const conversation = getConversation.get(conversationId);
  if (!conversation) {
    send({ type: "error", conversationId, message: "Conversation not found" });
    return;
  }

  // Handle stale query
  if (isQueryActive(conversationId)) {
    console.log(`[SDK] Interrupting stale query for ${conversationId}`);
    sessionInterrupt(conversationId);
    await new Promise((r) => setTimeout(r, 500));
    if (isQueryActive(conversationId)) {
      console.log(`[SDK] Force-removing stuck query for ${conversationId}`);
      removeActiveQuery(conversationId);
    }
  }

  const isFirstMessage = !conversation.session_id;
  const systemAppend = await buildSystemPrompt(conversation.cwd, message);

  const queryOptions: Parameters<typeof query>[0] = {
    prompt: message,
    options: {
      cwd: conversation.cwd,
      tools: { type: "preset" as const, preset: "claude_code" as const },
      systemPrompt: {
        type: "preset" as const,
        preset: "claude_code" as const,
        append: systemAppend,
      },
      permissionMode: "acceptEdits" as const,
      canUseTool: async (toolName, input, options) => {
        const permissionId = options.toolUseID;

        // AskUserQuestion — collect answers from frontend
        if (toolName === "AskUserQuestion") {
          const questions = (input as any).questions;
          if (Array.isArray(questions)) {
            send({
              type: "user_input_request",
              conversationId,
              requestId: permissionId,
              questions,
            });

            const answers = await new Promise<Record<string, string>>(
              (resolve) => {
                addPendingUserInput(permissionId, conversationId, resolve);
              }
            );

            return {
              behavior: "allow" as const,
              updatedInput: { ...input, answers },
            };
          }
        }

        send({
          type: "permission_request",
          conversationId,
          permissionId,
          toolName,
          input,
        });

        return new Promise<PermissionResult>((resolve) => {
          addPendingPermission(permissionId, conversationId, input, resolve);
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
  insertMessage.run(
    crypto.randomUUID(),
    conversationId,
    "user",
    message,
    null
  );

  const q = query(queryOptions);
  setActiveQuery(conversationId, q);

  const parser = new StreamParser(conversationId, send);

  try {
    let sessionCaptured = false;

    for await (const msg of q) {
      // Capture session_id from the first message
      if (!sessionCaptured && "session_id" in msg && msg.session_id) {
        updateConversationSessionId.run(
          msg.session_id as string,
          conversationId
        );
        sessionCaptured = true;
      }

      switch (msg.type) {
        case "stream_event": {
          parser.handleStreamEvent(msg.event);
          break;
        }

        case "assistant": {
          const model = (msg.message as any).model as string | undefined;
          const content = msg.message.content;
          let text = "";
          let blocksJson: string | null = null;

          if (Array.isArray(content)) {
            const result = parser.buildContentBlocks(content as any[]);
            text = result.text;
            blocksJson =
              result.blocks.length > 0
                ? JSON.stringify(result.blocks)
                : null;
          } else if (typeof content === "string") {
            text = content;
          }

          insertMessage.run(
            crypto.randomUUID(),
            conversationId,
            "assistant",
            text,
            blocksJson
          );

          send({
            type: "assistant_message",
            conversationId,
            content: text,
            contentBlocks:
              blocksJson ? JSON.parse(blocksJson) : undefined,
            model,
          });

          parser.resetThinking();

          // Auto-title from first user message
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
          parser.handleToolProgress(msg as any);
          break;
        }

        case "user": {
          // Tool results come back as user messages with tool_result content
          const userContent = (msg as any).message?.content;
          if (Array.isArray(userContent)) {
            for (const block of userContent) {
              if (block.type === "tool_result" && block.tool_use_id) {
                parser.resolveToolResult(
                  block.tool_use_id,
                  typeof block.content === "string" ? block.content : JSON.stringify(block.content),
                  !!block.is_error,
                );
              }
            }
          }
          break;
        }

        case "tool_use_summary": {
          parser.handleToolUseSummary(msg as any);
          break;
        }

        case "system": {
          const subtype = (msg as any).subtype;
          if (subtype === "compact_boundary") {
            const trigger = (msg as any).compact_metadata?.trigger || "auto";
            send({
              type: "context_compacted",
              conversationId,
              trigger,
            });
          }
          break;
        }

        case "result": {
          parser.flushPendingTools();

          const success = msg.subtype === "success";
          send({
            type: "result",
            conversationId,
            success,
            error: success
              ? undefined
              : (msg as any).errors?.join(", "),
            costUsd: msg.total_cost_usd,
            durationMs: msg.duration_ms,
          });
          break;
        }
      }
    }
  } catch (err: any) {
    const errorMsg = err.message || "Query failed";
    const isSessionGone =
      errorMsg.includes("exited with code") ||
      errorMsg.includes("session") ||
      errorMsg.includes("ENOENT");

    if (isSessionGone && conversation.session_id) {
      cleanupSession(conversation.session_id, conversation.cwd);
      markArchived.run(conversationId);
      send({ type: "archived", conversationId });
      generateSummary(conversationId, send);
    } else {
      send({ type: "error", conversationId, message: errorMsg });
    }
  } finally {
    removeActiveQuery(conversationId);
    touchConversation.run(conversationId);
    cleanupPendingForConversation(conversationId);

    // Process next queued message if any
    const next = dequeueMessage(conversationId);
    if (next) {
      send({
        type: "queue_processing",
        conversationId,
        message: next.message,
      });
      // Fire-and-forget — startQuery handles its own lifecycle
      startQuery(conversationId, next.message, send);
    }
  }
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

  cleanupSession(conversation.session_id, conversation.cwd);
  markArchived.run(conversationId);
  send({ type: "archived", conversationId });
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
        env: { ...process.env, CLAUDECODE: undefined },
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
          summaryText = (content as any[])
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
        } else if (typeof content === "string") {
          summaryText = content;
        }
      }
    }

    if (summaryText) {
      setSummary.run(summaryText, conversationId);
      send({ type: "summary_ready", conversationId, summary: summaryText });
    }
  } catch (err: any) {
    console.error(`[Summary generation failed] ${err.message}`);
    const fallback = `Summary generation failed. Conversation had ${messages.length} messages.`;
    setSummary.run(fallback, conversationId);
    send({ type: "summary_ready", conversationId, summary: fallback });
  }
}
