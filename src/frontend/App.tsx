import { useState, useEffect, useCallback } from "preact/hooks";
import { Sidebar } from "./components/Sidebar.tsx";
import { ChatView } from "./components/ChatView.tsx";
import { useWebSocket } from "./hooks/useWebSocket.ts";
import { useConversations } from "./hooks/useConversations.ts";
import { useChat } from "./hooks/useChat.ts";

export function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("nexia_token")
  );
  const [tokenInput, setTokenInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    conversations,
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversationInList,
  } = useConversations(token);

  const {
    getMessages,
    addUserMessage,
    handleServerMessage,
    updatePermissionStatus,
    loadMessages,
    clearMessages,
    status,
    activeQuery,
  } = useChat();

  // Wrap handleServerMessage to also update conversation list
  const onWsMessage = useCallback(
    (msg: any) => {
      handleServerMessage(msg);
      if (msg.type === "result") {
        fetchConversations();
      }
      if (msg.type === "archived") {
        updateConversationInList({
          id: msg.conversationId,
          status: "archived",
          archived_at: new Date().toISOString(),
        });
      }
      if (msg.type === "summary_ready") {
        updateConversationInList({
          id: msg.conversationId,
          summary: msg.summary,
        });
      }
    },
    [handleServerMessage, fetchConversations, updateConversationInList]
  );

  const { send, connected } = useWebSocket(token, onWsMessage);

  // Fetch conversations on auth
  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // Load message history when selecting a conversation
  useEffect(() => {
    if (activeConvId && token) {
      loadMessages(activeConvId, token);
    }
  }, [activeConvId, token, loadMessages]);

  const handleLogin = () => {
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem("nexia_token", t);
    setToken(t);
    setTokenInput("");
  };

  const handleLogout = () => {
    localStorage.removeItem("nexia_token");
    setToken(null);
  };

  const handleSend = (text: string) => {
    if (!activeConvId) return;
    addUserMessage(activeConvId, text);
    send({ type: "chat", conversationId: activeConvId, message: text });
  };

  const handleInterrupt = () => {
    if (!activeConvId) return;
    send({ type: "interrupt", conversationId: activeConvId });
  };

  const handleArchive = () => {
    if (!activeConvId) return;
    send({ type: "archive", conversationId: activeConvId });
  };

  const handlePermissionResponse = (permissionId: string, approved: boolean) => {
    if (!activeConvId) return;
    updatePermissionStatus(activeConvId, permissionId, approved);
    send({
      type: "permission_response",
      conversationId: activeConvId,
      permissionId,
      approved,
    });
  };

  const handleCreate = async () => {
    const conv = await createConversation();
    if (conv) setActiveConvId(conv.id);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    clearMessages(id);
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  };

  const activeConversation = activeConvId
    ? conversations.find((c) => c.id === activeConvId) ?? null
    : null;

  // Token entry screen
  if (!token) {
    return (
      <div class="login-screen">
        <div class="login-card">
          <h1>Nexia</h1>
          <p>Enter your auth token to connect.</p>
          <input
            type="password"
            value={tokenInput}
            onInput={(e) =>
              setTokenInput((e.target as HTMLInputElement).value)
            }
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Auth token"
            class="login-input"
            autofocus
          />
          <button
            onClick={handleLogin}
            disabled={!tokenInput.trim()}
            class="btn btn-primary"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="app-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatView
        messages={getMessages(activeConvId || "")}
        onSend={handleSend}
        onInterrupt={handleInterrupt}
        onArchive={handleArchive}
        onPermissionResponse={handlePermissionResponse}
        connected={connected}
        status={status}
        isQuerying={activeQuery === activeConvId}
        hasConversation={!!activeConvId}
        conversation={activeConversation}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}
