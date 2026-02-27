export function summarizeToolInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;

  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit":
      return typeof obj.file_path === "string" ? obj.file_path : "";
    case "Bash":
      return typeof obj.command === "string"
        ? obj.command.length > 80
          ? obj.command.slice(0, 80) + "..."
          : obj.command
        : "";
    case "Glob":
      return typeof obj.pattern === "string" ? obj.pattern : "";
    case "Grep":
      return typeof obj.pattern === "string" ? `/${obj.pattern}/` : "";
    case "WebFetch":
      return typeof obj.url === "string" ? obj.url : "";
    case "Task":
      return typeof obj.description === "string" ? obj.description : "";
    default:
      return "";
  }
}
