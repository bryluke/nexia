import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { useRouter } from "./Router.tsx";
import { Nav } from "../components/layout/Nav.tsx";
import { ChatPage } from "../pages/ChatPage.tsx";
import { DashboardPage } from "../pages/DashboardPage.tsx";
import { MemoryPage } from "../pages/MemoryPage.tsx";
import { HelpPage } from "../pages/HelpPage.tsx";
import { useWebSocket } from "../hooks/useWebSocket.ts";
import { useConversations } from "../hooks/useConversations.ts";
import { useChat } from "../hooks/useChat.ts";

export function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("nexia_token")
  );
  const [tokenInput, setTokenInput] = useState("");
  const { route, navigate } = useRouter();

  const {
    conversations,
    loading: convsLoading,
    fetchConversations,
    createConversation,
    deleteConversation,
    renameConversation,
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
    <div class="app-shell">
      <Nav
        route={route}
        onNavigate={navigate}
        connected={connected}
        onLogout={handleLogout}
      />
      <main class="app-content">
        {route === "chat" ? (
          <ChatPage
            token={token}
            conversations={conversations}
            convsLoading={convsLoading}
            fetchConversations={fetchConversations}
            createConversation={createConversation}
            deleteConversation={deleteConversation}
            renameConversation={renameConversation}
            getMessages={getMessages}
            addUserMessage={addUserMessage}
            updatePermissionStatus={updatePermissionStatus}
            updateUserInputStatus={updateUserInputStatus}
            loadMessages={loadMessages}
            clearMessages={clearMessages}
            send={send}
            connected={connected}
            status={status}
            activeQuery={activeQuery}
          />
        ) : route === "dashboard" ? (
          <DashboardPage token={token} />
        ) : route === "memory" ? (
          <MemoryPage token={token} />
        ) : (
          <HelpPage />
        )}
      </main>
    </div>
  );
}
