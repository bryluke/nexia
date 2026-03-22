import { useState } from "preact/hooks";
import type { ToolUseBlock } from "../../../shared/types.ts";
import { ToolUseCard } from "./ToolUseCard.tsx";

interface Props {
  tools: ToolUseBlock[];
}

function summarizeTools(tools: ToolUseBlock[]): string {
  const counts = new Map<string, number>();
  for (const t of tools) {
    counts.set(t.name, (counts.get(t.name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
    .join(", ");
}

function groupStatus(
  tools: ToolUseBlock[]
): "running" | "completed" | "error" {
  if (tools.some((t) => t.status === "running")) return "running";
  if (tools.some((t) => t.status === "error")) return "error";
  return "completed";
}

function statusIcon(status: "running" | "completed" | "error"): string {
  switch (status) {
    case "running":
      return "\u25CB";
    case "completed":
      return "\u2713";
    case "error":
      return "\u2717";
  }
}

export function ToolGroup({ tools }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = groupStatus(tools);
  const summary = summarizeTools(tools);

  return (
    <div class={`tool-group tool-group-${status}`}>
      <button
        class="tool-group-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span class={`tool-status-icon tool-icon-${status}`}>
          {statusIcon(status)}
        </span>
        <span class="tool-group-summary">{summary}</span>
        <span class="tool-group-count">{tools.length} tools</span>
        {status === "running" && <span class="tool-spinner" />}
        <span
          class={`thinking-arrow${expanded ? " expanded" : ""}`}
        >
          &#9654;
        </span>
      </button>
      {expanded && (
        <div class="tool-group-body">
          {tools.map((tool) => (
            <ToolUseCard key={tool.id} block={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
