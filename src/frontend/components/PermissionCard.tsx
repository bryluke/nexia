import { useState } from "preact/hooks";
import type { PermissionRequestBlock } from "../../shared/content-blocks.ts";

interface Props {
  block: PermissionRequestBlock;
  onRespond: (permissionId: string, approved: boolean) => void;
}

function summarizeToolInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;

  switch (toolName) {
    case "Read":
    case "Write":
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

function statusIcon(status: PermissionRequestBlock["status"]): string {
  switch (status) {
    case "pending": return "\u25CB";
    case "approved": return "\u2713";
    case "denied": return "\u2717";
  }
}

export function PermissionCard({ block, onRespond }: Props) {
  const [inputExpanded, setInputExpanded] = useState(false);

  const summary = summarizeToolInput(block.toolName, block.input);

  return (
    <div class={`perm-card perm-${block.status}`}>
      <div class="perm-header">
        <span class={`perm-status-icon perm-icon-${block.status}`}>
          {statusIcon(block.status)}
        </span>
        <span class="perm-name">{block.toolName}</span>
        {summary && <span class="perm-summary">{summary}</span>}
        {block.status === "pending" && (
          <span class="perm-spinner" />
        )}
      </div>

      {block.input != null && (
        <div class="perm-details">
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
      )}

      {block.status === "pending" && (
        <div class="perm-actions">
          <button
            class="perm-btn perm-btn-approve"
            onClick={() => onRespond(block.id, true)}
            type="button"
          >
            Approve
          </button>
          <button
            class="perm-btn perm-btn-deny"
            onClick={() => onRespond(block.id, false)}
            type="button"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
