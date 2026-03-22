import type { ServerWebSocket } from "bun";
import type { ClientMessage, ServerMessage } from "./protocol.ts";
import { startQuery, archiveConversation } from "../agent/engine.ts";
import {
  isQueryActive,
  interruptQuery,
  resolvePermission,
  resolveUserInput,
  enqueueMessage,
  getQueuedMessages,
} from "../agent/session-store.ts";

export interface WSData {
  token: string;
}

export function handleWsMessage(
  ws: ServerWebSocket<WSData>,
  raw: string | Buffer
): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
  } catch {
    wsSend(ws, { type: "error", conversationId: "", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    case "chat":
      if (!msg.conversationId || !msg.message) {
        wsSend(ws, {
          type: "error",
          conversationId: msg.conversationId || "",
          message: "Missing conversationId or message",
        });
        return;
      }
      // Queue if a query is already running for this conversation
      if (isQueryActive(msg.conversationId)) {
        const queued = enqueueMessage(msg.conversationId, msg.message);
        if (queued) {
          const queue = getQueuedMessages(msg.conversationId);
          wsSend(ws, {
            type: "queued",
            conversationId: msg.conversationId,
            messageId: queued.id,
            message: queued.message,
            position: queue.length,
          });
        } else {
          wsSend(ws, {
            type: "error",
            conversationId: msg.conversationId,
            message: "Message queue is full",
          });
        }
        return;
      }
      startQuery(msg.conversationId, msg.message, (serverMsg) =>
        wsSend(ws, serverMsg)
      ).catch((err) => {
        console.error(`[WS] startQuery crashed:`, err);
        wsSend(ws, {
          type: "error",
          conversationId: msg.conversationId,
          message: err?.message || "Query failed unexpectedly",
        });
      });
      break;

    case "interrupt":
      if (!msg.conversationId) return;
      const interrupted = interruptQuery(msg.conversationId);
      if (!interrupted) {
        wsSend(ws, {
          type: "error",
          conversationId: msg.conversationId,
          message: "No active query to interrupt",
        });
      }
      break;

    case "archive":
      if (!msg.conversationId) return;
      archiveConversation(msg.conversationId, (serverMsg) =>
        wsSend(ws, serverMsg)
      ).catch((err) => {
        console.error(`[WS] archiveConversation crashed:`, err);
        wsSend(ws, {
          type: "error",
          conversationId: msg.conversationId,
          message: err?.message || "Archive failed",
        });
      });
      break;

    case "permission_response":
      if (!msg.permissionId) return;
      resolvePermission(msg.permissionId, msg.approved);
      break;

    case "user_input_response":
      if (!msg.requestId || !msg.answers) return;
      resolveUserInput(msg.requestId, msg.answers);
      break;

    default:
      wsSend(ws, {
        type: "error",
        conversationId: "",
        message: `Unknown message type: ${(msg as any).type}`,
      });
  }
}

function wsSend(ws: ServerWebSocket<WSData>, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // Client disconnected
  }
}
