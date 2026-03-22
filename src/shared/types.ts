// === Content Blocks (shared between server + frontend) ===

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
  status: "running" | "completed" | "error";
  result?: string;
  progress?: string;
}

export interface PermissionRequestBlock {
  type: "permission_request";
  id: string;
  toolName: string;
  input: unknown;
  status: "pending" | "approved" | "denied";
}

export interface UserInputQuestion {
  question: string;
  header?: string;
  options: Array<{ label: string; description?: string }>;
  multiSelect?: boolean;
}

export interface UserInputBlock {
  type: "user_input";
  id: string;
  questions: UserInputQuestion[];
  status: "pending" | "answered";
  answers?: Record<string, string>;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | PermissionRequestBlock
  | UserInputBlock;

// === Conversation + Message (frontend-facing shapes) ===

export interface Conversation {
  id: string;
  title: string;
  session_id: string | null;
  cwd: string;
  status: string;
  summary: string | null;
  tags: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  isError?: boolean;
  contentBlocks?: ContentBlock[];
  pendingThinking?: string;
  costUsd?: number;
  durationMs?: number;
  createdAt?: string;
  isQueued?: boolean;
  queuePosition?: number;
}
