import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { Sidebar } from "./components/Sidebar.tsx";
import { ChatView } from "./components/ChatView.tsx";
import { DirectoryPicker } from "./components/DirectoryPicker.tsx";
import { useWebSocket } from "./hooks/useWebSocket.ts";
import { useConversations } from "./hooks/useConversations.ts";
import { useChat } from "./hooks/useChat.ts";

export function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("nexia_token")
  );
  const [tokenInput, setTokenInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 768
  );
  const [showPicker, setShowPicker] = useState(false);

  const {
    conversations,
    loading,
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
    updateUserInputStatus,
    loadMessages,
    clearMessages,
    clearActiveQuery,
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

  // Clear activeQuery on disconnect
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (prevConnected.current && !connected) {
      clearActiveQuery();
    }
    prevConnected.current = connected;
  }, [connected, clearActiveQuery]);

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

  const handleUserInputResponse = (requestId: string, answers: Record<string, string>) => {
    if (!activeConvId) return;
    updateUserInputStatus(activeConvId, requestId, answers);
    send({
      type: "user_input_response",
      requestId,
      answers,
    });
  };

  const handleNewClick = () => {
    setShowPicker(true);
  };

  const handlePickerSelect = async (cwd: string) => {
    setShowPicker(false);
    const conv = await createConversation(cwd);
    if (conv) setActiveConvId(conv.id);
  };

  const handlePickerCancel = () => {
    setShowPicker(false);
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

  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N — new conversation
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewClick();
      }
      // Ctrl+L — focus input
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
      // Ctrl+/ — toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      // Escape — stop active query or close picker
      if (e.key === "Escape") {
        if (showPicker) {
          e.preventDefault();
          setShowPicker(false);
        } else if (activeQuery) {
          e.preventDefault();
          send({ type: "interrupt", conversationId: activeQuery });
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeQuery, send, showPicker]);

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
        onCreate={handleNewClick}
        onDelete={handleDelete}
        onLogout={handleLogout}
        loading={loading}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatView
        messages={getMessages(activeConvId || "")}
        onSend={handleSend}
        onInterrupt={handleInterrupt}
        onArchive={handleArchive}
        onPermissionResponse={handlePermissionResponse}
        onUserInputResponse={handleUserInputResponse}
        connected={connected}
        status={status}
        isQuerying={activeQuery === activeConvId}
        hasConversation={!!activeConvId}
        conversation={activeConversation}
        onOpenSidebar={() => setSidebarOpen(true)}
        inputRef={chatInputRef}
      />
      {showPicker && (
        <DirectoryPicker
          onSelect={handlePickerSelect}
          onCancel={handlePickerCancel}
        />
      )}
    </div>
  );
}
