interface Props {
  value: string;
  onInput: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  class?: string;
}

/**
 * Search/filter input with clear button.
 */
export function SearchInput({
  value,
  onInput,
  onSubmit,
  placeholder = "Search...",
  class: className,
}: Props) {
  return (
    <div class={`ui-search${className ? ` ${className}` : ""}`}>
      <input
        type="text"
        class="ui-search-input"
        placeholder={placeholder}
        value={value}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      {value && (
        <button class="ui-search-clear" onClick={() => onInput("")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
