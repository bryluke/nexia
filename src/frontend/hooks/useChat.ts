import { useState, useCallback, useRef } from "preact/hooks";
import type {
  ChatMessageItem,
  ContentBlock,
  ToolUseBlock,
  PermissionRequestBlock,
  UserInputBlock,
} from "../../shared/types.ts";

export function useChat() {
  const [messagesByConv, setMessagesByConv] = useState<
    Record<string, ChatMessageItem[]>
  >({});
  const [status, setStatus] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const pendingTextRef = useRef<Record<string, string>>({});
  const pendingThinkingRef = useRef<Record<string, string>>({});
  // Track resolved tool states to survive state batching races
  const resolvedToolsRef = useRef<Map<string, { status: "completed" | "error"; result: string }>>(new Map());

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

  function getOrCreatePending(
    msgs: ChatMessageItem[],
    _convId: string
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

  const handleServerMessage = useCallback((msg: any) => {
    if (msg.type === "active_queries") {
      if (msg.conversationIds.length > 0) {
        setActiveQuery(msg.conversationIds[0]!);
      }
      return;
    }

    const convId = msg.conversationId as string;

    switch (msg.type) {
      case "text_delta": {
        pendingTextRef.current[convId] =
          (pendingTextRef.current[convId] || "") + msg.text;
        const pendingText = pendingTextRef.current[convId]!;

        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          const pending = updated[pendingIdx]!;
          const blocks = [...(pending.contentBlocks || [])];

          const last = blocks[blocks.length - 1];
          if (last && last.type === "text") {
            blocks[blocks.length - 1] = { ...last, text: last.text + msg.text };
          } else {
            blocks.push({ type: "text", text: msg.text });
          }

          updated[pendingIdx] = {
            ...pending,
            content: pendingText,
            contentBlocks: blocks,
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

          const existingIdx = blocks.findIndex(
            (b) => b.type === "tool_use" && b.id === msg.toolUseId
          );
          if (existingIdx !== -1) {
            const existing = blocks[existingIdx] as ToolUseBlock;
            blocks[existingIdx] = {
              ...existing,
              input: msg.input ?? existing.input,
            };
          } else {
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
        const resolvedStatus = msg.isError ? "error" as const : "completed" as const;
        resolvedToolsRef.current.set(msg.toolUseId, { status: resolvedStatus, result: msg.result });
        // Apply immediately to any existing block in state
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
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
                status: resolvedStatus,
                result: msg.result,
              };
              updated[i] = { ...m, contentBlocks: blocks };
              return { ...prev, [convId]: updated };
            }
          }
          // Block not in state yet — ref will handle it when assistant_message arrives
          return prev;
        });
        break;
      }

      case "tool_use_progress": {
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
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
              blocks[blockIdx] = { ...block, progress: msg.progress };
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

      case "user_input_request": {
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const { updated, pendingIdx } = getOrCreatePending(msgs, convId);
          const pending = updated[pendingIdx]!;
          const blocks = [...(pending.contentBlocks || [])];
          blocks.push({
            type: "user_input",
            id: msg.requestId,
            questions: msg.questions,
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
            // Apply resolved tool states from the ref (survives state batching)
            let mergedBlocks = msg.contentBlocks || last.contentBlocks;
            if (mergedBlocks) {
              mergedBlocks = mergedBlocks.map((block: any) => {
                if (block.type !== "tool_use") return block;
                const resolved = resolvedToolsRef.current.get(block.id);
                if (resolved) {
                  return { ...block, status: resolved.status, result: resolved.result };
                }
                return block;
              });
            }
            const updated = [...msgs];
            updated[updated.length - 1] = {
              ...last,
              content: msg.content,
              pending: false,
              contentBlocks: mergedBlocks,
              pendingThinking: undefined,
              createdAt: last.createdAt || new Date().toISOString(),
              model: msg.model || last.model,
            };
            return { ...prev, [convId]: updated };
          }
          return {
            ...prev,
            [convId]: [
              ...msgs,
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                content: msg.content,
                contentBlocks: msg.contentBlocks,
                createdAt: new Date().toISOString(),
                model: msg.model,
              },
            ],
          };
        });
        break;
      }

      case "queued": {
        // Show queued message as a user message with a "queued" indicator
        setMessagesByConv((prev) => ({
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            {
              id: msg.messageId,
              role: "user" as const,
              content: msg.message,
              createdAt: new Date().toISOString(),
              isQueued: true,
              queuePosition: msg.position,
            },
          ],
        }));
        break;
      }

      case "context_compacted": {
        setMessagesByConv((prev) => ({
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Context compacted (${msg.trigger})`,
              isCompactionMarker: true,
            },
          ],
        }));
        break;
      }

      case "queue_processing": {
        // Mark the queued message as no longer queued, set it as active
        setMessagesByConv((prev) => {
          const msgs = prev[convId] || [];
          const updated = msgs.map((m) =>
            (m as any).isQueued && m.content === msg.message
              ? { ...m, isQueued: false, queuePosition: undefined }
              : m
          );
          return { ...prev, [convId]: updated };
        });
        setActiveQuery(convId);
        setStatus(null);
        pendingTextRef.current[convId] = "";
        pendingThinkingRef.current[convId] = "";
        break;
      }

      case "status": {
        setStatus(msg.status);
        break;
      }

      case "result": {
        if (msg.costUsd != null || msg.durationMs != null) {
          setMessagesByConv((prev) => {
            const msgs = prev[convId] || [];
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
        setMessagesByConv((prev) => ({
          ...prev,
          [convId]: [
            ...(prev[convId] || []),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: msg.message,
              isError: true,
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

  const updateUserInputStatus = useCallback(
    (convId: string, requestId: string, answers: Record<string, string>) => {
      setMessagesByConv((prev) => {
        const msgs = prev[convId] || [];
        const updated = [...msgs];
        for (let i = updated.length - 1; i >= 0; i--) {
          const m = updated[i]!;
          if (!m.contentBlocks) continue;
          const blockIdx = m.contentBlocks.findIndex(
            (b) => b.type === "user_input" && b.id === requestId
          );
          if (blockIdx !== -1) {
            const blocks = [...m.contentBlocks];
            const block = blocks[blockIdx] as UserInputBlock;
            blocks[blockIdx] = { ...block, status: "answered", answers };
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
      if (messagesByConv[conversationId]) return;
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const msgs: any[] = await res.json();
        setMessagesByConv((prev) => ({
          ...prev,
          [conversationId]: msgs.map((m) => {
            let contentBlocks: ContentBlock[] | undefined;
            if (m.content_blocks) {
              try {
                contentBlocks = JSON.parse(m.content_blocks);
              } catch {
                // ignore
              }
            }
            // Mark stale running blocks as completed
            if (contentBlocks) {
              for (let i = 0; i < contentBlocks.length; i++) {
                const b = contentBlocks[i]!;
                if (b.type === "tool_use" && b.status === "running") {
                  contentBlocks[i] = { ...b, status: "completed" };
                }
                if (
                  b.type === "permission_request" &&
                  b.status === "pending"
                ) {
                  contentBlocks[i] = { ...b, status: "denied" };
                }
                if (b.type === "user_input" && b.status === "pending") {
                  contentBlocks[i] = { ...b, status: "answered" };
                }
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
        // ignore
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

  const clearActiveQuery = useCallback(() => {
    setActiveQuery(null);
    setStatus(null);
  }, []);

  return {
    getMessages,
    addUserMessage,
    handleServerMessage,
    updatePermissionStatus,
    updateUserInputStatus,
    loadMessages,
    clearMessages,
    clearActiveQuery,
    status,
    activeQuery,
  };
}
