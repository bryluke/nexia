interface Props {
  color: string;
  pulse?: boolean;
  title?: string;
}

/**
 * Small colored circle indicator for status display.
 */
export function StatusDot({ color, pulse, title }: Props) {
  return (
    <span
      class={`ui-status-dot${pulse ? " pulse" : ""}`}
      style={{ background: color }}
      title={title}
    />
  );
}
