import index from "../public/index.html";
import { authenticateToken } from "./api/auth.ts";
import {
  handleListConversations,
  handleCreateConversation,
  handleDeleteConversation,
  handleListMessages,
} from "./api/conversations.ts";
import { handleFilesystemList } from "./api/filesystem.ts";
import { handleWsMessage, type WSData } from "./ws/handler.ts";
import { getActiveQueryIds } from "./sdk/manager.ts";

const PORT = 5101;

const server = Bun.serve<WSData>({
  port: PORT,

  routes: {
    "/": index,

    "/api/health": {
      GET: () => Response.json({ status: "ok", timestamp: new Date().toISOString() }),
    },

    "/api/conversations": {
      GET: (req: Request) => handleListConversations(req),
      POST: (req: Request) => handleCreateConversation(req),
    },

    "/api/conversations/:id": {
      DELETE: (req: Request & { params: { id: string } }) =>
        handleDeleteConversation(req, req.params.id),
    },

    "/api/conversations/:id/messages": {
      GET: (req: Request & { params: { id: string } }) =>
        handleListMessages(req, req.params.id),
    },

    "/api/filesystem/list": {
      GET: (req: Request) => handleFilesystemList(req),
    },
  },

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token");
      if (!authenticateToken(token)) {
        return new Response("Unauthorized", { status: 401 });
      }
      const upgraded = server.upgrade(req, { data: { token: token! } });
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 500 });
      }
      return undefined;
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      console.log("[WS] Client connected");
      // Notify frontend about any active queries so it can show stop buttons
      const activeIds = getActiveQueryIds();
      if (activeIds.length > 0) {
        ws.send(JSON.stringify({ type: "active_queries", conversationIds: activeIds }));
      }
    },
    message(ws, message) {
      handleWsMessage(ws, message);
    },
    close(ws) {
      console.log("[WS] Client disconnected");
    },
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Nexia running at http://localhost:${server.port}`);
