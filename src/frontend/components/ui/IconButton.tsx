import type { ComponentChildren } from "preact";

interface Props {
  onClick: () => void;
  title?: string;
  class?: string;
  disabled?: boolean;
  children: ComponentChildren;
}

/**
 * Button that wraps an SVG icon. Minimal padding, hover state.
 */
export function IconButton({
  onClick,
  title,
  class: className,
  disabled,
  children,
}: Props) {
  return (
    <button
      class={`ui-icon-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}
