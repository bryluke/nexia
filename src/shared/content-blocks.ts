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
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock;
