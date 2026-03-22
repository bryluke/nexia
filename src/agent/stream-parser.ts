import type { ServerMessage } from "../ws/protocol.ts";
import type { ContentBlock } from "../shared/types.ts";

export type SendFn = (msg: ServerMessage) => void;

/**
 * Stateful parser that translates SDK stream events into Nexia WS messages.
 * One instance per query lifecycle.
 */
export class StreamParser {
  private conversationId: string;
  private send: SendFn;

  // Accumulate thinking text across deltas
  thinkingAccumulator = "";

  // Track tool_use block building (keyed by stream index)
  private inputJsonAccumulators = new Map<number, string>();
  private blockTypes = new Map<number, string>();
  private blockStarts = new Map<number, any>();

  // Track tool cards for correlation
  pendingToolUses = new Map<string, { name: string; input: unknown }>();

  constructor(conversationId: string, send: SendFn) {
    this.conversationId = conversationId;
    this.send = send;
  }

  handleStreamEvent(event: any): void {
    const convId = this.conversationId;

    if (event.type === "content_block_start") {
      const block = event.content_block as any;
      const idx = event.index;
      if (block.type === "thinking") {
        this.blockTypes.set(idx, "thinking");
        this.thinkingAccumulator = "";
      } else if (block.type === "tool_use") {
        this.blockTypes.set(idx, "tool_use");
        this.blockStarts.set(idx, block);
        this.inputJsonAccumulators.set(idx, "");
      } else if (block.type === "text") {
        this.blockTypes.set(idx, "text");
      }
    } else if (event.type === "content_block_delta") {
      const delta = event.delta as any;
      const idx = event.index;

      if (delta.type === "text_delta") {
        this.send({ type: "text_delta", conversationId: convId, text: delta.text });
      } else if (delta.type === "thinking_delta") {
        this.thinkingAccumulator += delta.thinking;
        this.send({
          type: "thinking_delta",
          conversationId: convId,
          text: delta.thinking,
        });
      } else if (delta.type === "input_json_delta") {
        const prev = this.inputJsonAccumulators.get(idx) || "";
        this.inputJsonAccumulators.set(idx, prev + delta.partial_json);
      }
    } else if (event.type === "content_block_stop") {
      const idx = event.index;
      const type = this.blockTypes.get(idx);

      if (type === "tool_use") {
        const block = this.blockStarts.get(idx);
        const jsonStr = this.inputJsonAccumulators.get(idx) || "{}";
        let input: unknown = {};
        try {
          input = JSON.parse(jsonStr);
        } catch {
          input = { _raw: jsonStr };
        }
        const toolUseId = block?.id || `tool-${idx}`;
        const toolName = block?.name || "unknown";

        this.pendingToolUses.set(toolUseId, { name: toolName, input });
        this.send({
          type: "tool_use_start",
          conversationId: convId,
          toolUseId,
          toolName,
          input,
        });

        this.inputJsonAccumulators.delete(idx);
        this.blockStarts.delete(idx);
      }
      this.blockTypes.delete(idx);
    }
  }

  handleToolProgress(msg: any): void {
    const convId = this.conversationId;
    const toolUseId = msg.tool_use_id as string | undefined;
    const toolName = msg.tool_name;
    const elapsed = msg.elapsed_time_seconds as number | undefined;

    // Create tool card on first progress event
    if (toolUseId && !this.pendingToolUses.has(toolUseId)) {
      this.pendingToolUses.set(toolUseId, { name: toolName, input: null });
      this.send({
        type: "tool_use_start",
        conversationId: convId,
        toolUseId,
        toolName,
        input: null,
      });
    }

    const elapsedStr =
      elapsed != null ? `Running... ${Math.round(elapsed)}s` : "Running...";
    if (toolUseId) {
      this.send({
        type: "tool_use_progress",
        conversationId: convId,
        toolUseId,
        progress: elapsedStr,
      });
    }

    this.send({
      type: "status",
      conversationId: convId,
      status: `Using ${toolName}...`,
    });
  }

  /** Resolve a tool result from the SDK's user-type tool_result message */
  resolveToolResult(toolUseId: string, result: string, isError: boolean): void {
    if (!this.pendingToolUses.has(toolUseId)) return;
    this.send({
      type: "tool_use_result",
      conversationId: this.conversationId,
      toolUseId,
      result,
      isError,
    });
    this.pendingToolUses.delete(toolUseId);
  }

  handleToolUseSummary(msg: any): void {
    const convId = this.conversationId;
    const summary = msg.summary as string;

    this.send({
      type: "status",
      conversationId: convId,
      status: summary,
    });

    // Resolve any remaining pending tools referenced by the summary
    const ids = msg.preceding_tool_use_ids;
    if (Array.isArray(ids)) {
      for (const toolUseId of ids) {
        if (this.pendingToolUses.has(toolUseId)) {
          this.send({
            type: "tool_use_result",
            conversationId: convId,
            toolUseId,
            result: summary,
            isError: false,
          });
          this.pendingToolUses.delete(toolUseId);
        }
      }
    } else {
      const lastKey = [...this.pendingToolUses.keys()].pop();
      if (lastKey) {
        this.send({
          type: "tool_use_result",
          conversationId: convId,
          toolUseId: lastKey,
          result: summary,
          isError: false,
        });
        this.pendingToolUses.delete(lastKey);
      }
    }
  }

  /** Build content blocks from a complete assistant message */
  buildContentBlocks(content: any[]): {
    text: string;
    blocks: ContentBlock[];
  } {
    let text = "";
    const blocks: ContentBlock[] = [];

    for (const block of content) {
      if (block.type === "text") {
        text += block.text;
        blocks.push({ type: "text", text: block.text });
      } else if (block.type === "thinking") {
        blocks.push({ type: "thinking", thinking: block.thinking || "" });
      } else if (block.type === "tool_use") {
        blocks.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
          status: "running",
        });
        if (!this.pendingToolUses.has(block.id)) {
          this.pendingToolUses.set(block.id, {
            name: block.name,
            input: block.input,
          });
        }
      }
    }

    return { text, blocks };
  }

  /** Flush remaining pending tools as completed on query end */
  flushPendingTools(): void {
    const convId = this.conversationId;
    for (const [toolUseId] of this.pendingToolUses) {
      this.send({
        type: "tool_use_result",
        conversationId: convId,
        toolUseId,
        result: "Completed",
        isError: false,
      });
    }
    this.pendingToolUses.clear();
  }

  resetThinking(): void {
    this.thinkingAccumulator = "";
  }
}
