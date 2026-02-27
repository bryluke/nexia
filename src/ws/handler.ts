import type { ServerWebSocket } from "bun";
import type { ClientMessage, ServerMessage } from "./types.ts";
import { startQuery, interruptQuery, archiveConversation, resolvePermission, resolveUserInput } from "../sdk/manager.ts";

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
    wsSend(ws, {
      type: "error",
      conversationId: "",
      message: "Invalid JSON",
    });
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
      // Start query async — responses stream back via send callback
      startQuery(msg.conversationId, msg.message, (serverMsg) =>
        wsSend(ws, serverMsg)
      );
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
      );
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

function wsSend(
  ws: ServerWebSocket<WSData>,
  msg: ServerMessage
): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // Client disconnected
  }
}
