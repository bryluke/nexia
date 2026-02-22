import { useMemo } from "preact/hooks";
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
  return `<pre>${langLabel}<code class="hljs">${highlighted}</code></pre>`;
};

marked.use({ renderer });

function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
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
        </div>
      </div>
    );
  }

  // Assistant message with content blocks
  if (hasBlocks) {
    return (
      <div class="msg-row assistant">
        <div class={`msg-bubble assistant${message.pending ? " pending" : ""}`}>
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
        </div>
      </div>
    );
  }

  // Assistant message without content blocks (backward compat / streaming text)
  return (
    <div class="msg-row assistant">
      <div class={`msg-bubble assistant${message.pending ? " pending" : ""}`}>
        {message.pendingThinking && (
          <ThinkingBlock thinking={message.pendingThinking} streaming />
        )}
        <div class="prose" dangerouslySetInnerHTML={{ __html: html! }} />
        {message.pending && <span class="typing-cursor" />}
      </div>
    </div>
  );
}
