import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

interface Props {
  label: string;
  defaultOpen?: boolean;
  children: ComponentChildren;
}

/**
 * Collapsible section with arrow toggle and label.
 * Used for tool input/result details, thinking blocks, etc.
 */
export function Collapsible({ label, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div class="ui-collapsible">
      <button
        class="ui-collapsible-toggle"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span class={`ui-collapsible-arrow${open ? " open" : ""}`}>
          &#9654;
        </span>
        {label}
      </button>
      {open && <div class="ui-collapsible-content">{children}</div>}
    </div>
  );
}
