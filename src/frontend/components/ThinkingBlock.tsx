import { useState } from "preact/hooks";

interface Props {
  thinking: string;
  streaming?: boolean;
}

export function ThinkingBlock({ thinking, streaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div class="thinking-block">
      <button
        class="thinking-toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span class={`thinking-arrow${expanded ? " expanded" : ""}`}>
          &#9654;
        </span>
        <span class={`thinking-label${streaming ? " streaming" : ""}`}>
          {streaming ? "Thinking..." : "Thinking"}
        </span>
      </button>
      {expanded && (
        <div class="thinking-content">
          {thinking || "..."}
        </div>
      )}
    </div>
  );
}
