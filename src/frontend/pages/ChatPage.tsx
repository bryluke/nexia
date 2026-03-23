import { useState, useEffect, useCallback } from "preact/hooks";
import { ConversationList } from "../components/chat/ConversationList.tsx";
import { ChatView } from "../components/chat/ChatView.tsx";
import { DirectoryPicker } from "../components/chat/DirectoryPicker.tsx";
import type { Conversation, ChatMessageItem } from "../../shared/types.ts";

interface Props {
  token: string;
  conversations: Conversation[];
  convsLoading: boolean;
  fetchConversations: () => Promise<void>;
  createConversation: (cwd?: string) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  getMessages: (id: string) => ChatMessageItem[];
  addUserMessage: (id: string, content: string) => void;
  updatePermissionStatus: (
    convId: string,
    permissionId: string,
    approved: boolean
  ) => void;
  updateUserInputStatus: (
    convId: string,
    requestId: string,
    answers: Record<string, string>
  ) => void;
  loadMessages: (id: string, token: string) => Promise<void>;
  loadOlderMessages: (id: string, token: string) => Promise<void>;
  paginationMeta: Record<string, { hasMore: boolean; oldestTimestamp: string | null }>;
  clearMessages: (id: string) => void;
  send: (data: unknown) => void;
  connected: boolean;
  status: string | null;
  activeQuery: string | null;
}

export function ChatPage({
  token,
  conversations,
  convsLoading,
  fetchConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getMessages,
  addUserMessage,
  updatePermissionStatus,
  updateUserInputStatus,
  loadMessages,
  loadOlderMessages,
  paginationMeta,
  clearMessages,
  send,
  connected,
  status,
  activeQuery,
}: Props) {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (activeConvId && token) {
      loadMessages(activeConvId, token);
    }
  }, [activeConvId, token, loadMessages]);

  const handleNewClick = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handlePickerSelect = useCallback(
    async (cwd: string) => {
      setShowPicker(false);
      const conv = await createConversation(cwd);
      if (conv) setActiveConvId(conv.id);
    },
    [createConversation]
  );

  const handlePickerCancel = useCallback(() => {
    setShowPicker(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      clearMessages(id);
      if (activeConvId === id) setActiveConvId(null);
    },
    [activeConvId, deleteConversation, clearMessages]
  );

  const handleLoadOlder = useCallback(() => {
    if (!activeConvId || !token) return;
    loadOlderMessages(activeConvId, token);
  }, [activeConvId, token, loadOlderMessages]);

  const hasMore = activeConvId
    ? paginationMeta[activeConvId]?.hasMore ?? false
    : false;

  const handleSend = useCallback(
    (text: string) => {
      if (!activeConvId) return;
      addUserMessage(activeConvId, text);
      send({ type: "chat", conversationId: activeConvId, message: text });
    },
    [activeConvId, addUserMessage, send]
  );

  const handleInterrupt = useCallback(() => {
    if (!activeConvId) return;
    send({ type: "interrupt", conversationId: activeConvId });
  }, [activeConvId, send]);

  const handleArchive = useCallback(() => {
    if (!activeConvId) return;
    send({ type: "archive", conversationId: activeConvId });
  }, [activeConvId, send]);

  const handlePermissionModeChange = useCallback(
    async (mode: string) => {
      if (!activeConvId || !token) return;
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permission_mode: mode }),
      });
      if (res.ok) fetchConversations();
    },
    [activeConvId, token, fetchConversations]
  );

  const handlePermissionResponse = useCallback(
    (permissionId: string, approved: boolean) => {
      if (!activeConvId) return;
      updatePermissionStatus(activeConvId, permissionId, approved);
      send({
        type: "permission_response",
        conversationId: activeConvId,
        permissionId,
        approved,
      });
    },
    [activeConvId, updatePermissionStatus, send]
  );

  const handleUserInputResponse = useCallback(
    (requestId: string, answers: Record<string, string>) => {
      if (!activeConvId) return;
      updateUserInputStatus(activeConvId, requestId, answers);
      send({ type: "user_input_response", requestId, answers });
    },
    [activeConvId, updateUserInputStatus, send]
  );

  const activeConversation = activeConvId
    ? conversations.find((c) => c.id === activeConvId) ?? null
    : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewClick();
      }
      if (e.key === "Escape" && showPicker) {
        e.preventDefault();
        setShowPicker(false);
        return;
      }
      if (e.key === "Escape" && activeQuery) {
        e.preventDefault();
        send({ type: "interrupt", conversationId: activeQuery });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeQuery, send, handleNewClick, showPicker]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveConvId(id);
      setSidebarOpen(false);
    },
    []
  );

  return (
    <div class="chat-page">
      {sidebarOpen && (
        <div class="conv-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <ConversationList
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelect}
        onCreate={handleNewClick}
        onDelete={handleDelete}
        onRename={renameConversation}
        loading={convsLoading}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div class="chat-main">
        <div class="chat-mobile-bar">
          <button
            class="chat-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            title="Conversations"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
        <ChatView
        messages={getMessages(activeConvId || "")}
        hasMore={hasMore}
        onLoadOlder={handleLoadOlder}
        onSend={handleSend}
        onInterrupt={handleInterrupt}
        onArchive={handleArchive}
        onPermissionResponse={handlePermissionResponse}
        onUserInputResponse={handleUserInputResponse}
        onPermissionModeChange={handlePermissionModeChange}
        connected={connected}
        status={status}
        isQuerying={activeQuery === activeConvId}
        hasConversation={!!activeConvId}
        conversation={activeConversation}
      />
      </div>
      {showPicker && (
        <DirectoryPicker
          token={token}
          onSelect={handlePickerSelect}
          onCancel={handlePickerCancel}
        />
      )}
    </div>
  );
}
