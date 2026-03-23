import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
  class?: string;
  padding?: "sm" | "md" | "lg";
}

/**
 * Generic bordered card container.
 */
export function Card({ children, class: className, padding = "md" }: Props) {
  return (
    <div class={`ui-card ui-card-${padding}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
