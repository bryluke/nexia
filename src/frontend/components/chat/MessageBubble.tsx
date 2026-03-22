import { useMemo, useState, useCallback } from "preact/hooks";
import type { ChatMessageItem } from "../../../shared/types.ts";
import { renderMarkdown, handleProseClick } from "../../lib/markdown.ts";
import { formatTime, formatCost, formatDuration } from "../../lib/formatters.ts";
import { ThinkingBlock } from "./ThinkingBlock.tsx";
import { ToolUseCard } from "./ToolUseCard.tsx";
import { ToolGroup } from "./ToolGroup.tsx";
import { PermissionCard } from "./PermissionCard.tsx";
import { UserInputCard } from "./UserInputCard.tsx";
import type { ContentBlock, ToolUseBlock } from "../../../shared/types.ts";

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

function formatModel(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model.replace("claude-", "").replace(/-\d.*$/, "");
}

function MsgMeta({ message }: { message: ChatMessageItem }) {
  const parts: string[] = [];
  if (message.costUsd != null) parts.push(formatCost(message.costUsd));
  if (message.durationMs != null) parts.push(formatDuration(message.durationMs));

  const hasModel = !!message.model;
  if (parts.length === 0 && !message.createdAt && !hasModel) return null;

  return (
    <div class="msg-meta">
      {hasModel && <span class="msg-model">{formatModel(message.model!)}</span>}
      {message.createdAt && (
        <span class="msg-time">{formatTime(message.createdAt)}</span>
      )}
      {parts.length > 0 && (
        <span class="msg-cost">{parts.join(" \u00b7 ")}</span>
      )}
    </div>
  );
}

/**
 * Group consecutive tool_use blocks together, render everything else individually.
 * A tool group is broken by any non-tool_use block (text, thinking, permission, user_input).
 */
function renderBlocks(
  blocks: ContentBlock[],
  onPermissionResponse: (id: string, approved: boolean) => void,
  onUserInputResponse: (id: string, answers: Record<string, string>) => void,
) {
  const elements: preact.JSX.Element[] = [];
  let toolAccum: ToolUseBlock[] = [];

  const flushTools = () => {
    if (toolAccum.length === 0) return;
    if (toolAccum.length === 1) {
      elements.push(<ToolUseCard key={toolAccum[0]!.id} block={toolAccum[0]!} />);
    } else {
      elements.push(
        <ToolGroup key={`tg-${toolAccum[0]!.id}`} tools={[...toolAccum]} />
      );
    }
    toolAccum = [];
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    if (block.type === "tool_use") {
      toolAccum.push(block);
      continue;
    }
    // Non-tool block — flush any accumulated tools first
    flushTools();
    switch (block.type) {
      case "text":
        elements.push(
          <div
            key={i}
            class="prose"
            onClick={handleProseClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
          />
        );
        break;
      case "thinking":
        elements.push(<ThinkingBlock key={i} thinking={block.thinking} />);
        break;
      case "permission_request":
        elements.push(
          <PermissionCard key={block.id} block={block} onRespond={onPermissionResponse} />
        );
        break;
      case "user_input":
        elements.push(
          <UserInputCard key={block.id} block={block} onRespond={onUserInputResponse} />
        );
        break;
    }
  }
  flushTools(); // flush any trailing tools
  return elements;
}

interface Props {
  message: ChatMessageItem;
  onPermissionResponse?: (permissionId: string, approved: boolean) => void;
  onUserInputResponse?: (
    requestId: string,
    answers: Record<string, string>
  ) => void;
}

export function MessageBubble({
  message,
  onPermissionResponse,
  onUserInputResponse,
}: Props) {
  // Context compaction divider
  if (message.isCompactionMarker) {
    return (
      <div class="compaction-divider">
        <span class="compaction-line" />
        <span class="compaction-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
          </svg>
          Context compacted
        </span>
        <span class="compaction-line" />
      </div>
    );
  }

  const isUser = message.role === "user";
  const hasBlocks =
    !isUser && message.contentBlocks && message.contentBlocks.length > 0;

  const html = useMemo(() => {
    if (isUser || hasBlocks) return null;
    return renderMarkdown(message.content);
  }, [message.content, isUser, hasBlocks]);

  if (isUser) {
    return (
      <div class="msg-row user">
        <div class={`msg-bubble user${message.isQueued ? " queued" : ""}`}>
          {message.content}
          {message.isQueued && (
            <div class="msg-queued-badge">Queued #{message.queuePosition}</div>
          )}
          <MsgMeta message={message} />
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div class="msg-row assistant">
        <div class="msg-bubble assistant error">
          <span class="error-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          {message.content}
        </div>
      </div>
    );
  }

  if (hasBlocks) {
    return (
      <div class="msg-row assistant">
        <div
          class={`msg-bubble assistant${message.pending ? " pending" : ""}`}
        >
          {!message.pending && <MsgCopyButton text={message.content} />}
          {message.pendingThinking && (
            <ThinkingBlock thinking={message.pendingThinking} streaming />
          )}
          {renderBlocks(
            message.contentBlocks!,
            onPermissionResponse || (() => {}),
            onUserInputResponse || (() => {}),
          )}
          {message.pending && <span class="typing-cursor" />}
          {!message.pending && <MsgMeta message={message} />}
        </div>
      </div>
    );
  }

  return (
    <div class="msg-row assistant">
      <div
        class={`msg-bubble assistant${message.pending ? " pending" : ""}`}
      >
        {!message.pending && <MsgCopyButton text={message.content} />}
        {message.pendingThinking && (
          <ThinkingBlock thinking={message.pendingThinking} streaming />
        )}
        <div
          class="prose"
          onClick={handleProseClick}
          dangerouslySetInnerHTML={{ __html: html! }}
        />
        {message.pending && <span class="typing-cursor" />}
        {!message.pending && <MsgMeta message={message} />}
      </div>
    </div>
  );
}
