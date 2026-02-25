import { useState, useCallback, useRef } from "preact/hooks";
import type { ChatMessageItem, ServerMessage, ContentBlock } from "../types.ts";
import type { ToolUseBlock, PermissionRequestBlock } from "../../shared/content-blocks.ts";

export function useChat() {
  // Messages keyed by conversationId
  const [messagesByConv, setMessagesByConv] = useState<
    Record<string, ChatMessageItem[]>
  >({});
  const [status, setStatus] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const pendingTextRef = useRef<Record<string, string>>({});
  const pendingThinkingRef = useRef<Record<string, string>>({});

  const getMessages = useCallback(
    (conversationId: string): ChatMessageItem[] => {
      return messagesByConv[conversationId] || [];
    },
    [messagesByConv]
  );

  const addUserMessage = useCallback(
    (conversationId: string, content: string) => {
      const msg: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), msg],
      }));
      setActiveQuery(conversationId);
      setStatus(null);
      pendingTextRef.current[conversationId] = "";
      pendingThinkingRef.current[conversationId] = "";
    },
    []
  );

  // Helper: get or create the current pending assistant message
  function getOrCreatePending(
    msgs: ChatMessageItem[],
    convId: string
  ): { updated: ChatMessageItem[]; pendingIdx: number } {
    const last = msgs[msgs.length - 1];
    if (last?.pending && last.role === "assistant") {
      return { updated: [...msgs], pendingIdx: msgs.length - 1 };
    }
    const newMsg: ChatMessageItem = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true,
      contentBlocks: [],
    };
    const updated = [...msgs, newMsg];
    return { updated, pendingIdx: updated.length - 1 };
  }

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    const convId = msg.conversationId;

    switch (msg.type) {
      case "text_delta": {
        pendingTextRef.current[convId] =
          (pendingTextRef.current[convId] || "") + msg.text;
        const pendingText = pendingTextRef.current[convId]!;

        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          updated[pendingIdx] = {
            ...updated[pendingIdx]!,
            content: pendingText,
          };
          return { ...prev, [convId]: updated };
        });
        break;
      }

      case "thinking_delta": {
        pendingThinkingRef.current[convId] =
          (pendingThinkingRef.current[convId] || "") + msg.text;
        const pendingThinking = pendingThinkingRef.current[convId]!;

        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          updated[pendingIdx] = {
            ...updated[pendingIdx]!,
            pendingThinking,
          };
          return { ...prev, [convId]: updated };
        });
        break;
      }

      case "tool_use_start": {
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          const pending = updated[pendingIdx]!;
          const blocks = [...(pending.contentBlocks || [])];

          // Check if this tool already has a card (enrichment from content_block_stop)
          const existingIdx = blocks.findIndex(
            (b) => b.type === "tool_use" && b.id === msg.toolUseId
          );
          if (existingIdx !== -1) {
            // Enrich existing block with input data
            const existing = blocks[existingIdx] as ToolUseBlock;
            blocks[existingIdx] = { ...existing, input: msg.input ?? existing.input };
          } else {
            // New tool card
            blocks.push({
              type: "tool_use",
              id: msg.toolUseId,
              name: msg.toolName,
              input: msg.input,
              status: "running",
            });
          }

          updated[pendingIdx] = { ...pending, contentBlocks: blocks };
          return { ...prev, [convId]: updated };
        });
        break;
      }

      case "tool_use_result": {
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          // Walk backward to find the message containing this tool use block
          const updated = [...msgs];
          for (let i = updated.length - 1; i >= 0; i--) {
            const m = updated[i]!;
            if (!m.contentBlocks) continue;
            const blockIdx = m.contentBlocks.findIndex(
              (b) => b.type === "tool_use" && b.id === msg.toolUseId
            );
            if (blockIdx !== -1) {
              const blocks = [...m.contentBlocks];
              const block = blocks[blockIdx] as ToolUseBlock;
              blocks[blockIdx] = {
                ...block,
                status: msg.isError ? "error" : "completed",
                result: msg.result,
              };
              updated[i] = { ...m, contentBlocks: blocks };
              break;
            }
          }
          return { ...prev, [convId]: updated };
        });
        break;
      }

      case "permission_request": {
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          const pending = updated[pendingIdx]!;
          const blocks = [...(pending.contentBlocks || [])];
          blocks.push({
            type: "permission_request",
            id: msg.permissionId,
            toolName: msg.toolName,
            input: msg.input,
            status: "pending",
          });
          updated[pendingIdx] = { ...pending, contentBlocks: blocks };
          return { ...prev, [convId]: updated };
        });
        break;
      }

      case "assistant_message": {
        pendingTextRef.current[convId] = "";
        pendingThinkingRef.current[convId] = "";
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const last = msgs[msgs.length - 1];
          if (last?.pending && last.role === "assistant") {
            // Finalize the pending message
            const updated = [...msgs];
            updated[updated.length - 1] = {
              ...last,
              content: msg.content,
              pending: false,
              contentBlocks: msg.contentBlocks || last.contentBlocks,
              pendingThinking: undefined,
              createdAt: last.createdAt || new Date().toISOString(),
            };
            return { ...prev, [convId]: updated };
          }
          // If no pending, add as new
          return {
            ...prev,
            [convId]: [
              ...msgs,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: msg.content,
                contentBlocks: msg.contentBlocks,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
        break;
      }

      case "status": {
        setStatus(msg.status);
        break;
      }

      case "result": {
        // Attach cost/duration to the last assistant message
        if (msg.costUsd != null || msg.durationMs != null) {
          setMessagesByConv((prev) => {
            const msgs = prev[convId] || [];
            // Walk backward to find last assistant message
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i]!.role === "assistant") {
                const updated = [...msgs];
                updated[i] = {
                  ...updated[i]!,
                  ...(msg.costUsd != null && { costUsd: msg.costUsd }),
                  ...(msg.durationMs != null && { durationMs: msg.durationMs }),
                };
                return { ...prev, [convId]: updated };
              }
            }
            return prev;
          });
        }
        setActiveQuery(null);
        setStatus(null);
        pendingTextRef.current[convId] = "";
        pendingThinkingRef.current[convId] = "";
        break;
      }

      case "error": {
        setActiveQuery(null);
        setStatus(null);
        pendingTextRef.current[convId] = "";
        pendingThinkingRef.current[convId] = "";
        // Show error as a system message
        setMessagesByConv((prev) => ({
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Error: ${msg.message}`,
            },
          ],
        }));
        break;
      }
    }
  }, []);

  const updatePermissionStatus = useCallback(
    (convId: string, permissionId: string, approved: boolean) => {
      setMessagesByConv((prev) => {
        const msgs = prev[convId] || [];
        const updated = [...msgs];
        for (let i = updated.length - 1; i >= 0; i--) {
          const m = updated[i]!;
          if (!m.contentBlocks) continue;
          const blockIdx = m.contentBlocks.findIndex(
            (b) => b.type === "permission_request" && b.id === permissionId
          );
          if (blockIdx !== -1) {
            const blocks = [...m.contentBlocks];
            const block = blocks[blockIdx] as PermissionRequestBlock;
            blocks[blockIdx] = {
              ...block,
              status: approved ? "approved" : "denied",
            };
            updated[i] = { ...m, contentBlocks: blocks };
            break;
          }
        }
        return { ...prev, [convId]: updated };
      });
    },
    []
  );

  const loadMessages = useCallback(
    async (conversationId: string, token: string) => {
      // Skip if already loaded
      if (messagesByConv[conversationId]) return;
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const msgs: { id: string; role: string; content: string; content_blocks?: string | null; created_at?: string }[] =
          await res.json();
        setMessagesByConv((prev) => ({
          ...prev,
          [conversationId]: msgs.map((m) => {
            let contentBlocks: ContentBlock[] | undefined;
            if (m.content_blocks) {
              try {
                contentBlocks = JSON.parse(m.content_blocks);
              } catch {
                // ignore parse errors
              }
            }
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              contentBlocks,
              createdAt: m.created_at,
            };
          }),
        }));
      } catch {
        // ignore fetch errors
      }
    },
    [messagesByConv]
  );

  const clearMessages = useCallback((conversationId: string) => {
    setMessagesByConv((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  return {
    getMessages,
    addUserMessage,
    handleServerMessage,
    updatePermissionStatus,
    loadMessages,
    clearMessages,
    status,
    activeQuery,
  };
}
