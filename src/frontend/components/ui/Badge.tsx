interface Props {
  label: string;
  color?: string;
  variant?: "solid" | "outline";
}

/**
 * Small colored pill label. Solid variant has colored background with dark text.
 * Outline variant has transparent background with colored border and text.
 */
export function Badge({ label, color, variant = "solid" }: Props) {
  if (variant === "outline") {
    return (
      <span
        class="ui-badge ui-badge-outline"
        style={color ? { borderColor: color, color } : undefined}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      class="ui-badge"
      style={color ? { background: color } : undefined}
    >
      {label}
    </span>
  );
}
