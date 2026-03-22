import type { ContentBlock, UserInputQuestion } from "../shared/types.ts";

// === Client → Server ===

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

export type ClientMessage =
  | ChatMessage
  | InterruptMessage
  | ArchiveMessage
  | PermissionResponseMessage
  | UserInputResponseMessage;

// === Server → Client ===

export type ServerMessage =
  | { type: "text_delta"; conversationId: string; text: string }
  | {
      type: "assistant_message";
      conversationId: string;
      content: string;
      contentBlocks?: ContentBlock[];
    }
  | {
      type: "result";
      conversationId: string;
      success: boolean;
      error?: string;
      costUsd?: number;
      durationMs?: number;
    }
  | { type: "status"; conversationId: string; status: string }
  | { type: "error"; conversationId: string; message: string }
  | { type: "archived"; conversationId: string }
  | { type: "summary_ready"; conversationId: string; summary: string }
  | { type: "thinking_delta"; conversationId: string; text: string }
  | {
      type: "tool_use_start";
      conversationId: string;
      toolUseId: string;
      toolName: string;
      input: unknown;
    }
  | {
      type: "tool_use_result";
      conversationId: string;
      toolUseId: string;
      result: string;
      isError: boolean;
    }
  | {
      type: "tool_use_progress";
      conversationId: string;
      toolUseId: string;
      progress: string;
    }
  | {
      type: "permission_request";
      conversationId: string;
      permissionId: string;
      toolName: string;
      input: Record<string, unknown>;
    }
  | {
      type: "user_input_request";
      conversationId: string;
      requestId: string;
      questions: UserInputQuestion[];
    }
  | { type: "active_queries"; conversationIds: string[] }
  | {
      type: "queued";
      conversationId: string;
      messageId: string;
      message: string;
      position: number;
    }
  | { type: "queue_processing"; conversationId: string; message: string };
