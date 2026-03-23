import { useRef, useEffect, useMemo, useState, useCallback } from "preact/hooks";
import { renderMarkdown } from "../../lib/markdown.ts";
import { abbreviateCwd } from "../../lib/formatters.ts";
import { StatusBar } from "../layout/StatusBar.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { ChatInput } from "./ChatInput.tsx";
import type { ChatMessageItem, Conversation } from "../../../shared/types.ts";

interface Props {
  messages: ChatMessageItem[];
  hasMore?: boolean;
  onLoadOlder?: () => void;
  onSend: (text: string) => void;
  onInterrupt: () => void;
  onArchive: () => void;
  onPermissionResponse: (permissionId: string, approved: boolean) => void;
  onUserInputResponse: (
    requestId: string,
    answers: Record<string, string>
  ) => void;
  onPermissionModeChange?: (mode: string) => void;
  connected: boolean;
  status: string | null;
  isQuerying: boolean;
  hasConversation: boolean;
  conversation: Conversation | null;
}

export function ChatView({
  messages,
  onSend,
  onInterrupt,
  onArchive,
  onPermissionResponse,
  onUserInputResponse,
  onPermissionModeChange,
  hasMore,
  onLoadOlder,
  connected,
  status,
  isQuerying,
  hasConversation,
  conversation,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isArchived = conversation?.status === "archived";

  const summaryHtml = useMemo(() => {
    if (!conversation?.summary) return null;
    return renderMarkdown(conversation.summary);
  }, [conversation?.summary]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom();
  }, [messages, scrollToBottom, showScrollBtn]);

  const handleScroll = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 150);
  }, []);

  if (!hasConversation) {
    return (
      <div class="chat-empty">
        <p>Select or create a conversation</p>
      </div>
    );
  }

  return (
    <div class="chat-container">
      {/* Top bar */}
      <div class="chat-topbar">
        <div class="chat-topbar-title-group">
          <span class="chat-topbar-title">
            {conversation?.title || "Nexia"}
          </span>
          {conversation?.cwd && (
            <div class="chat-topbar-breadcrumb">
              {abbreviateCwd(conversation.cwd)}
            </div>
          )}
          <div class="chat-topbar-tooltip">
            <div class="chat-topbar-tooltip-title">{conversation?.title || "Nexia"}</div>
            {conversation?.cwd && (
              <div class="chat-topbar-tooltip-cwd">{conversation.cwd}</div>
            )}
          </div>
        </div>
        {!isArchived && onPermissionModeChange && (
          <select
            class="perm-mode-select"
            value={conversation?.permission_mode || "acceptEdits"}
            onChange={(e) =>
              onPermissionModeChange((e.target as HTMLSelectElement).value)
            }
            title="Permission mode"
          >
            <option value="acceptEdits">Accept Edits</option>
            <option value="default">Ask All</option>
            <option value="bypassPermissions">Bypass All</option>
          </select>
        )}
        {isArchived ? (
          <span class="archived-badge">Archived</span>
        ) : (
          messages.length > 0 &&
          !isQuerying && (
            <button
              onClick={onArchive}
              class="btn-archive"
              title="Archive conversation"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              </svg>
              Archive
            </button>
          )
        )}
      </div>

      {/* Summary banner */}
      {isArchived && (
        <div class="summary-banner">
          {summaryHtml ? (
            <div class="summary-content">
              <div class="summary-label">Conversation Summary</div>
              <div
                class="prose"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            </div>
          ) : (
            <div class="summary-loading">
              <span class="status-dot amber" />
              Generating summary...
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div class="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
        {hasMore && onLoadOlder && (
          <div class="load-older-wrap">
            <button class="load-older-btn" onClick={onLoadOlder}>
              Load older messages
            </button>
          </div>
        )}
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
        {showScrollBtn && (
          <button class="scroll-to-bottom" onClick={scrollToBottom} title="Scroll to bottom">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </button>
        )}
      </div>

      {/* Status */}
      <StatusBar
        connected={connected}
        status={status}
        isQuerying={isQuerying}
      />

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onInterrupt={onInterrupt}
        isQuerying={isQuerying}
        isArchived={!!isArchived}
        connected={connected}
      />
    </div>
  );
}
