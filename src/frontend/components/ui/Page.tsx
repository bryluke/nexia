import type { ComponentChildren } from "preact";

interface Props {
  title: string;
  subtitle?: string;
  meta?: ComponentChildren;
  actions?: ComponentChildren;
  children: ComponentChildren;
}

/**
 * Standard page layout — centered max-width container with title section.
 * Used by Dashboard, Memory, Help, and future pages.
 */
export function Page({ title, subtitle, meta, actions, children }: Props) {
  return (
    <div class="ui-page">
      <div class="ui-page-header">
        <div>
          <h1 class="ui-page-title">{title}</h1>
          {subtitle && <p class="ui-page-subtitle">{subtitle}</p>}
        </div>
        {meta && <span class="ui-page-meta">{meta}</span>}
        {actions && <div class="ui-page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
