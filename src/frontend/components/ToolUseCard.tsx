import { useState } from "preact/hooks";
import type { ToolUseBlock } from "../../shared/content-blocks.ts";
import { summarizeToolInput } from "../utils/summarize-tool-input.ts";

interface Props {
  block: ToolUseBlock;
}

function statusIcon(status: ToolUseBlock["status"]): string {
  switch (status) {
    case "running": return "\u25CB";
    case "completed": return "\u2713";
    case "error": return "\u2717";
    default: return "\u25CB";
  }
}

function EditDiff({ input }: { input: Record<string, unknown> }) {
  const filePath = typeof input.file_path === "string" ? input.file_path : "";
  const oldStr = typeof input.old_string === "string" ? input.old_string : "";
  const newStr = typeof input.new_string === "string" ? input.new_string : "";

  if (!oldStr && !newStr) return null;

  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");

  return (
    <div class="edit-diff">
      <div class="edit-diff-header">{filePath}</div>
      <div class="edit-diff-body">
        {oldLines.map((line, i) => (
          <div key={`r-${i}`} class="diff-line diff-removed">
            <span class="diff-sign">-</span>
            <span>{line || " "}</span>
          </div>
        ))}
        {newLines.map((line, i) => (
          <div key={`a-${i}`} class="diff-line diff-added">
            <span class="diff-sign">+</span>
            <span>{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WritePreview({ input }: { input: Record<string, unknown> }) {
  const filePath = typeof input.file_path === "string" ? input.file_path : "";
  const content = typeof input.content === "string" ? input.content : "";
  if (!content) return null;

  const preview = content.length > 500
    ? content.slice(0, 500) + `\n... (${content.length} chars total)`
    : content;

  return (
    <div class="edit-diff">
      <div class="edit-diff-header">{filePath}</div>
      <div class="edit-diff-body">
        {preview.split("\n").map((line, i) => (
          <div key={i} class="diff-line diff-added">
            <span class="diff-sign">+</span>
            <span>{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ToolUseCard({ block }: Props) {
  const [inputExpanded, setInputExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);

  const summary = summarizeToolInput(block.name, block.input);
  const inputObj = block.input as Record<string, unknown> | null;

  // Show specialized views for Edit/Write
  const isEdit = block.name === "Edit" && inputObj;
  const isWrite = block.name === "Write" && inputObj;

  return (
    <div class={`tool-card tool-${block.status}`}>
      <div class="tool-header">
        <span class={`tool-status-icon tool-icon-${block.status}`}>
          {statusIcon(block.status)}
        </span>
        <span class="tool-name">{block.name}</span>
        {summary && <span class="tool-summary">{summary}</span>}
        {block.status === "running" && (
          <>
            {block.progress && <span class="tool-progress">{block.progress}</span>}
            <span class="tool-spinner" />
          </>
        )}
      </div>

      {/* Edit diff view */}
      {isEdit && <EditDiff input={inputObj} />}

      {/* Write file preview */}
      {isWrite && <WritePreview input={inputObj} />}

      {/* Generic input (for non-Edit/Write tools, or as fallback) */}
      {block.input != null && !isEdit && !isWrite && (
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
      )}

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
