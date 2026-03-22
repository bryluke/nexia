export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function abbreviateCwd(cwd: string | undefined): string | null {
  if (!cwd) return null;
  const match = cwd.match(/^\/home\/[^/]+/);
  if (match) return "~" + cwd.slice(match[0].length);
  return cwd;
}

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
    case "Agent":
      return typeof obj.description === "string" ? obj.description : "";
    default:
      return "";
  }
}
