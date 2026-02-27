import type { Ref } from "preact";
import { useRef, useEffect, useState, useMemo } from "preact/hooks";
import { marked } from "marked";
import type { ChatMessageItem, Conversation } from "../types.ts";
import { MessageBubble } from "./MessageBubble.tsx";
import { StatusIndicator } from "./StatusIndicator.tsx";

const SHORTCUTS = [
  { keys: "Ctrl+N", desc: "New conversation" },
  { keys: "Ctrl+L", desc: "Focus input" },
  { keys: "Ctrl+/", desc: "Toggle sidebar" },
  { keys: "Esc", desc: "Stop query" },
];

function abbreviateCwd(cwd: string | undefined): string | null {
  if (!cwd) return null;
  const match = cwd.match(/^\/home\/[^/]+/);
  if (match) return "~" + cwd.slice(match[0].length);
  return cwd;
}

function ShortcutsLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div class="shortcuts-wrap">
      <button
        class="btn-shortcuts"
        onClick={() => setOpen((p) => !p)}
        title="Keyboard shortcuts"
      >?</button>
      {open && (
        <>
          <div class="shortcuts-backdrop" onClick={() => setOpen(false)} />
          <div class="shortcuts-popover">
            <div class="shortcuts-title">Keyboard Shortcuts</div>
            {SHORTCUTS.map((s) => (
              <div class="shortcuts-row" key={s.keys}>
                <kbd class="shortcuts-kbd">{s.keys}</kbd>
                <span>{s.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  messages: ChatMessageItem[];
  onSend: (text: string) => void;
  onInterrupt: () => void;
  onArchive: () => void;
  onPermissionResponse: (permissionId: string, approved: boolean) => void;
  onUserInputResponse: (requestId: string, answers: Record<string, string>) => void;
  connected: boolean;
  status: string | null;
  isQuerying: boolean;
  hasConversation: boolean;
  conversation: Conversation | null;
  onOpenSidebar: () => void;
  inputRef?: Ref<HTMLTextAreaElement>;
}

export function ChatView({
  messages,
  onSend,
  onInterrupt,
  onArchive,
  onPermissionResponse,
  onUserInputResponse,
  connected,
  status,
  isQuerying,
  hasConversation,
  conversation,
  onOpenSidebar,
  inputRef,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || fallbackRef;

  const isArchived = conversation?.status === "archived";
  const supportsFieldSizing = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

  const summaryHtml = useMemo(() => {
    if (!conversation?.summary) return null;
    return marked.parse(conversation.summary) as string;
  }, [conversation?.summary]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isQuerying || isArchived) return;
    onSend(text);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!hasConversation) {
    return (
      <div class="chat-empty">
        <button class="chat-empty-mobile-btn" onClick={onOpenSidebar}>
          Open conversations
        </button>
        <p>Select or create a conversation</p>
      </div>
    );
  }

  return (
    <div class="chat-container">
      {/* Top bar */}
      <div class="chat-topbar">
        <button onClick={onOpenSidebar} class="chat-topbar-menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div class="chat-topbar-title-group" style="flex:1;min-width:0">
          <span class="chat-topbar-title">
            {conversation?.title || "Nexia"}
          </span>
          {conversation?.cwd && (
            <div class="chat-topbar-breadcrumb">
              {abbreviateCwd(conversation.cwd)}
            </div>
          )}
        </div>
        {isArchived ? (
          <span class="archived-badge">Archived</span>
        ) : (
          messages.length > 0 && !isQuerying && (
            <button onClick={onArchive} class="btn-archive" title="Archive conversation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              </svg>
              Archive
            </button>
          )
        )}
        <ShortcutsLegend />
      </div>

      {/* Summary banner for archived conversations */}
      {isArchived && (
        <div class="summary-banner">
          {summaryHtml ? (
            <div class="summary-content">
              <div class="summary-label">Conversation Summary</div>
              <div class="prose" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
            </div>
          ) : (
            <div class="summary-loading">
              <span class="status-dot amber" />
              Generating summary...
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div class="messages-area">
        {messages.length === 0 && !isArchived && (
          <div class="messages-empty">
            <p>Send a message to get started</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onPermissionResponse={onPermissionResponse}
            onUserInputResponse={onUserInputResponse}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Status indicator */}
      <StatusIndicator
        connected={connected}
        status={status}
        isQuerying={isQuerying}
      />

      {/* Input area — hidden when archived */}
      {isArchived ? (
        <div class="archived-footer">
          <p>This conversation is archived and read-only.</p>
        </div>
      ) : (
        <div class="input-area">
          <div class="input-row">
            <textarea
              ref={textareaRef}
              value={input}
              onInput={(e) => {
                const ta = e.target as HTMLTextAreaElement;
                setInput(ta.value);
                if (!supportsFieldSizing) {
                  ta.style.height = "auto";
                  ta.style.height = ta.scrollHeight + "px";
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Nexia..."
              rows={1}
              class="chat-input"
            />
            {isQuerying ? (
              <button onClick={onInterrupt} class="btn btn-icon btn-stop" title="Stop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !connected}
                class="btn btn-icon btn-send"
                title="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
