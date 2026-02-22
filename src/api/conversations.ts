import { homedir } from "node:os";
import { authenticateRequest } from "./auth.ts";
import {
  listConversations,
  getConversation,
  insertConversation,
  deleteConversation,
  listMessages,
  deleteMessages,
} from "../db/index.ts";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function handleListConversations(req: Request): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversations = listConversations.all();
  return json(conversations);
}

export function handleCreateConversation(req: Request): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const id = crypto.randomUUID();
  insertConversation.run(id, "New conversation", homedir());
  const conversation = getConversation.get(id);
  return json(conversation, 201);
}

export function handleDeleteConversation(
  req: Request,
  id: string
): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversation = getConversation.get(id);
  if (!conversation) return json({ error: "Not found" }, 404);
  deleteMessages.run(id);
  deleteConversation.run(id);
  return json({ ok: true });
}

export function handleListMessages(
  req: Request,
  conversationId: string
): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversation = getConversation.get(conversationId);
  if (!conversation) return json({ error: "Not found" }, 404);
  const messages = listMessages.all(conversationId);
  return json(messages);
}
