import { useState } from "preact/hooks";
import type { ToolUseBlock } from "../../shared/content-blocks.ts";

interface Props {
  block: ToolUseBlock;
}

function summarizeToolInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;

  switch (toolName) {
    case "Read":
    case "Write":
      return typeof obj.file_path === "string" ? obj.file_path : "";
    case "Edit":
      return typeof obj.file_path === "string" ? obj.file_path : "";
    case "Bash":
      return typeof obj.command === "string"
        ? obj.command.length > 80
          ? obj.command.slice(0, 80) + "..."
          : obj.command
        : "";
    case "Glob":
      return typeof obj.pattern === "string" ? obj.pattern : "";
    case "Grep":
      return typeof obj.pattern === "string" ? `/${obj.pattern}/` : "";
    case "WebFetch":
      return typeof obj.url === "string" ? obj.url : "";
    case "Task":
      return typeof obj.description === "string" ? obj.description : "";
    default:
      return "";
  }
}

function statusIcon(status: ToolUseBlock["status"]): string {
  switch (status) {
    case "running": return "\u25CB";
    case "completed": return "\u2713";
    case "error": return "\u2717";
    default: return "\u25CB";
  }
}

export function ToolUseCard({ block }: Props) {
  const [inputExpanded, setInputExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);

  const summary = summarizeToolInput(block.name, block.input);

  return (
    <div class={`tool-card tool-${block.status}`}>
      <div class="tool-header">
        <span class={`tool-status-icon tool-icon-${block.status}`}>
          {statusIcon(block.status)}
        </span>
        <span class="tool-name">{block.name}</span>
        {summary && <span class="tool-summary">{summary}</span>}
        {block.status === "running" && (
          <span class="tool-spinner" />
        )}
      </div>

      <div class="tool-details">
        <button
          class="tool-expand-btn"
          onClick={() => setInputExpanded(!inputExpanded)}
          type="button"
        >
          <span class={`thinking-arrow${inputExpanded ? " expanded" : ""}`}>
            &#9654;
          </span>
          Input
        </button>
        {inputExpanded && (
          <pre class="tool-json">{JSON.stringify(block.input, null, 2)}</pre>
        )}
      </div>

      {block.result !== undefined && (
        <div class="tool-details">
          <button
            class="tool-expand-btn"
            onClick={() => setResultExpanded(!resultExpanded)}
            type="button"
          >
            <span class={`thinking-arrow${resultExpanded ? " expanded" : ""}`}>
              &#9654;
            </span>
            Result
          </button>
          {resultExpanded && (
            <pre class="tool-result">{block.result}</pre>
          )}
        </div>
      )}
    </div>
  );
}
