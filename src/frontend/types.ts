import type { ContentBlock } from "../shared/content-blocks.ts";

export type { ContentBlock } from "../shared/content-blocks.ts";

export interface Conversation {
  id: string;
  title: string;
  session_id: string | null;
  cwd: string;
  status: string;
  summary: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  contentBlocks?: ContentBlock[];
  pendingThinking?: string;
  costUsd?: number;
  durationMs?: number;
  createdAt?: string;
}

// Server → Client WS messages
export type ServerMessage =
  | { type: "text_delta"; conversationId: string; text: string }
  | { type: "assistant_message"; conversationId: string; content: string; contentBlocks?: ContentBlock[] }
  | { type: "result"; conversationId: string; success: boolean; error?: string; costUsd?: number; durationMs?: number }
  | { type: "status"; conversationId: string; status: string }
  | { type: "error"; conversationId: string; message: string }
  | { type: "archived"; conversationId: string }
  | { type: "summary_ready"; conversationId: string; summary: string }
  | { type: "thinking_delta"; conversationId: string; text: string }
  | { type: "tool_use_start"; conversationId: string; toolUseId: string; toolName: string; input: unknown }
  | { type: "tool_use_result"; conversationId: string; toolUseId: string; result: string; isError: boolean }
  | { type: "permission_request"; conversationId: string; permissionId: string; toolName: string; input: Record<string, unknown> };
