import type { ComponentChildren } from "preact";

interface Props {
  title?: string;
  children: ComponentChildren;
  class?: string;
}

/**
 * Content section with optional heading and bottom margin.
 */
export function Section({ title, children, class: className }: Props) {
  return (
    <section class={`ui-section${className ? ` ${className}` : ""}`}>
      {title && <h2 class="ui-section-title">{title}</h2>}
      {children}
    </section>
  );
}
