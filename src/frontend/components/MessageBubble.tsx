import { useMemo, useState, useCallback } from "preact/hooks";
import { marked } from "marked";
import hljs from "highlight.js";
import type { ChatMessageItem } from "../types.ts";
import { ThinkingBlock } from "./ThinkingBlock.tsx";
import { ToolUseCard } from "./ToolUseCard.tsx";
import { PermissionCard } from "./PermissionCard.tsx";

marked.setOptions({
  breaks: true,
  gfm: true,
});

// HTML-escape for safe data attribute embedding
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Custom renderer for syntax-highlighted code blocks
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(text, { language: lang }).value;
  } else {
    highlighted = hljs.highlightAuto(text).value;
  }
  const langLabel = lang
    ? `<span class="code-lang">${lang}</span>`
    : "";
  return `<pre><div class="code-header">${langLabel}<button class="copy-btn" data-code="${escapeAttr(text)}">Copy</button></div><code class="hljs">${highlighted}</code></pre>`;
};

marked.use({ renderer });

function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

// Event delegation handler for copy buttons inside code blocks
function handleProseClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest(
    ".copy-btn",
  ) as HTMLButtonElement | null;
  if (!btn) return;
  const code = btn.getAttribute("data-code") || "";
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1500);
  });
}

function MsgCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      class={`msg-copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
      title="Copy message"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      )}
    </button>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function MsgMeta({ message }: { message: ChatMessageItem }) {
  const parts: string[] = [];
  if (message.costUsd != null) parts.push(formatCost(message.costUsd));
  if (message.durationMs != null) parts.push(formatDuration(message.durationMs));
  const hasMeta = parts.length > 0;
  const hasTime = !!message.createdAt;

  if (!hasMeta && !hasTime) return null;

  return (
    <div class="msg-meta">
      {hasTime && <span class="msg-time">{formatTime(message.createdAt!)}</span>}
      {hasMeta && <span class="msg-cost">{parts.join(" \u00b7 ")}</span>}
    </div>
  );
}

interface Props {
  message: ChatMessageItem;
  onPermissionResponse?: (permissionId: string, approved: boolean) => void;
}

export function MessageBubble({ message, onPermissionResponse }: Props) {
  const isUser = message.role === "user";
  const hasBlocks = !isUser && message.contentBlocks && message.contentBlocks.length > 0;

  // For plain text messages (no content blocks), render as before
  const html = useMemo(() => {
    if (isUser || hasBlocks) return null;
    return renderMarkdown(message.content);
  }, [message.content, isUser, hasBlocks]);

  if (isUser) {
    return (
      <div class="msg-row user">
        <div class="msg-bubble user">
          {message.content}
          <MsgMeta message={message} />
        </div>
      </div>
    );
  }

  // Assistant message with content blocks
  if (hasBlocks) {
    return (
      <div class="msg-row assistant">
        <div class={`msg-bubble assistant${message.pending ? " pending" : ""}`}>
          {!message.pending && <MsgCopyButton text={message.content} />}
          {message.pendingThinking && (
            <ThinkingBlock thinking={message.pendingThinking} streaming />
          )}
          {message.contentBlocks!.map((block, i) => {
            switch (block.type) {
              case "text":
                return (
                  <div
                    key={i}
                    class="prose"
                    onClick={handleProseClick}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
                  />
                );
              case "thinking":
                return <ThinkingBlock key={i} thinking={block.thinking} />;
              case "tool_use":
                return <ToolUseCard key={block.id} block={block} />;
              case "permission_request":
                return (
                  <PermissionCard
                    key={block.id}
                    block={block}
                    onRespond={onPermissionResponse || (() => {})}
                  />
                );
            }
          })}
          {message.pending && <span class="typing-cursor" />}
          {!message.pending && <MsgMeta message={message} />}
        </div>
      </div>
    );
  }

  // Assistant message without content blocks (backward compat / streaming text)
  return (
    <div class="msg-row assistant">
      <div class={`msg-bubble assistant${message.pending ? " pending" : ""}`}>
        {!message.pending && <MsgCopyButton text={message.content} />}
        {message.pendingThinking && (
          <ThinkingBlock thinking={message.pendingThinking} streaming />
        )}
        <div class="prose" onClick={handleProseClick} dangerouslySetInnerHTML={{ __html: html! }} />
        {message.pending && <span class="typing-cursor" />}
        {!message.pending && <MsgMeta message={message} />}
      </div>
    </div>
  );
}
