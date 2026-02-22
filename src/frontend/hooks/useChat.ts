import { useState, useCallback, useRef } from "preact/hooks";
import type { ChatMessageItem, ServerMessage, ContentBlock } from "../types.ts";
import type { ToolUseBlock } from "../../shared/content-blocks.ts";

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
        const newBlock: ToolUseBlock = {
          type: "tool_use",
          id: msg.toolUseId,
          name: msg.toolName,
          input: msg.input,
          status: "running",
        };

        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          const pending = updated[pendingIdx]!;
          const blocks = [...(pending.contentBlocks || []), newBlock];
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
        const msgs: { id: string; role: string; content: string; content_blocks?: string | null }[] =
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
    loadMessages,
    clearMessages,
    status,
    activeQuery,
  };
}
