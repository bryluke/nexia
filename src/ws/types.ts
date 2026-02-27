import type { ContentBlock } from "../shared/content-blocks.ts";

// Client → Server messages
export interface ChatMessage {
  type: "chat";
  conversationId: string;
  message: string;
}

export interface InterruptMessage {
  type: "interrupt";
  conversationId: string;
}

export interface ArchiveMessage {
  type: "archive";
  conversationId: string;
}

export interface PermissionResponseMessage {
  type: "permission_response";
  conversationId: string;
  permissionId: string;
  approved: boolean;
}

export interface UserInputResponseMessage {
  type: "user_input_response";
  requestId: string;
  answers: Record<string, string>;
}

export type ClientMessage = ChatMessage | InterruptMessage | ArchiveMessage | PermissionResponseMessage | UserInputResponseMessage;

// Server → Client messages
export interface TextDeltaMessage {
  type: "text_delta";
  conversationId: string;
  text: string;
}

export interface AssistantMessage {
  type: "assistant_message";
  conversationId: string;
  content: string;
  contentBlocks?: ContentBlock[];
}

export interface ResultMessage {
  type: "result";
  conversationId: string;
  success: boolean;
  error?: string;
  costUsd?: number;
  durationMs?: number;
}

export interface StatusMessage {
  type: "status";
  conversationId: string;
  status: string;
}

export interface ErrorMessage {
  type: "error";
  conversationId: string;
  message: string;
}

export interface ArchivedMessage {
  type: "archived";
  conversationId: string;
}

export interface SummaryReadyMessage {
  type: "summary_ready";
  conversationId: string;
  summary: string;
}

export interface ThinkingDeltaMessage {
  type: "thinking_delta";
  conversationId: string;
  text: string;
}

export interface ToolUseStartMessage {
  type: "tool_use_start";
  conversationId: string;
  toolUseId: string;
  toolName: string;
  input: unknown;
}

export interface ToolUseResultMessage {
  type: "tool_use_result";
  conversationId: string;
  toolUseId: string;
  result: string;
  isError: boolean;
}

export interface PermissionRequestMessage {
  type: "permission_request";
  conversationId: string;
  permissionId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface UserInputRequestMessage {
  type: "user_input_request";
  conversationId: string;
  requestId: string;
  questions: Array<{
    question: string;
    header?: string;
    options: Array<{ label: string; description?: string }>;
    multiSelect?: boolean;
  }>;
}

export interface ToolUseProgressMessage {
  type: "tool_use_progress";
  conversationId: string;
  toolUseId: string;
  progress: string;
}

export interface ActiveQueriesMessage {
  type: "active_queries";
  conversationIds: string[];
}

export type ServerMessage =
  | TextDeltaMessage
  | AssistantMessage
  | ResultMessage
  | StatusMessage
  | ErrorMessage
  | ArchivedMessage
  | SummaryReadyMessage
  | ThinkingDeltaMessage
  | ToolUseStartMessage
  | ToolUseResultMessage
  | ToolUseProgressMessage
  | PermissionRequestMessage
  | UserInputRequestMessage
  | ActiveQueriesMessage;
