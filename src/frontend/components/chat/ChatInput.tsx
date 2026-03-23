import { useState, useRef } from "preact/hooks";

interface Props {
  onSend: (text: string) => void;
  onInterrupt: () => void;
  isQuerying: boolean;
  isArchived: boolean;
  connected: boolean;
}

export function ChatInput({
  onSend,
  onInterrupt,
  isQuerying,
  isArchived,
  connected,
}: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supportsFieldSizing =
    typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

  if (isArchived) {
    return (
      <div class="archived-footer">
        <p>This conversation is archived and read-only.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
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

  return (
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
          placeholder={
            isQuerying ? "Queue a follow-up..." : "Message Nexia..."
          }
          rows={1}
          class="chat-input"
        />
        {isQuerying ? (
          <div class="input-btn-group">
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || !connected}
              class="btn btn-icon btn-queue"
              title="Queue message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={onInterrupt}
              class="btn btn-icon btn-stop"
              title="Stop"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
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
  );
}
